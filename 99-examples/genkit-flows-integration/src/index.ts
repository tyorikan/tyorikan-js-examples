import { generate } from '@genkit-ai/ai';
import { configureGenkit } from '@genkit-ai/core';
import { defineFlow, startFlowsServer, run } from '@genkit-ai/flow';
import { gemini15Flash, textEmbeddingGecko, vertexAI } from '@genkit-ai/vertexai';
import * as z from 'zod';
import { googleCloud } from '@genkit-ai/google-cloud';
import { defineFirestoreRetriever } from "@genkit-ai/firebase";
import {retrieve} from "@genkit-ai/ai/retriever";

import { embed } from "@genkit-ai/ai/embedder";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { chunk } from "llm-chunk";
import pdf from "pdf-parse";
import { readFile } from "fs/promises";
import path from "path";

const indexConfig = {
    collection: "menuInfo",
    contentField: "description",
    vectorField: "embedding",
    embedder: textEmbeddingGecko,
};

const app = initializeApp({
    credential: applicationDefault()
});
const firestore = getFirestore(app);

const menuQARef = defineFirestoreRetriever({
    name: "menuRetrieverRef",
    firestore: firestore,
    collection: "menuInfo",
    contentField: "description",
    vectorField: "embedding",
    embedder: textEmbeddingGecko,
    distanceMeasure: "COSINE",
  });

configureGenkit({
    plugins: [
        googleCloud(),
        vertexAI({ location: 'asia-northeast1' }),
    ],
    logLevel: 'warn',
    enableTracingAndMetrics: true,
});

export const menuSuggestionFlow = defineFlow(
    {
        name: 'menuSuggestionFlow',
        inputSchema: z.string(),
        outputSchema: z.any(),
    },
    async (subject) => {
        if (!subject) {
            throw new Error("Input string is required.")
        }
        const llmResponse = await generate({
            prompt: `${subject}をテーマにしたレストランのメニューを提案して`,
            model: gemini15Flash,
            config: {
                temperature: 1,
            },
            output: {
                format: 'json',
                schema: z.object({
                    restaurant_name: z.string(),
                    restaurant_concept: z.string(),
                    menus: z.array(z.object({
                        category: z.enum(['前菜・一品料理', 'メイン料理', 'ご飯もの・麺類', 'デザート', 'ドリンク']),
                        name: z.string(),
                        description: z.string(),
                        price: z.number(),
                    }))
                    // .describe('少なくとも 20 品以上のメニューを考えて')
                })
            }
        });
        return llmResponse.output();
    }
);

export const indexMenu = defineFlow(
    {
        name: "indexMenu",
        inputSchema: z.string().describe("PDF file path"),
        outputSchema: z.void(),
    },
    async (filePath: string) => {
        filePath = path.resolve(filePath);

        // Read the PDF.
        const pdfTxt = await run("extract-text", () => extractTextFromPdf(filePath));

        // Divide the PDF text into segments.
        const chunks = await run("chunk-it", async () => chunk(pdfTxt));

        // Add chunks to the index.
        await run("index-chunks", async () => indexToFirestore(chunks));
    }
);

export const menuQA = defineFlow(
    {
      name: 'menuQA',
      inputSchema: z.string(),
      outputSchema: z.string()
    },
    async (input: string) => {
      // retrieve relevant documents
      const docs = await retrieve({
        retriever: menuQARef,
        query: input,
        options: {
          k: 3,
          limit: 20,
        },
      });
  
      // generate a response
      const llmResponse = await generate({
        model: gemini15Flash,
        prompt: `
      あなたは、レストランのメニューにある食べ物についての質問に答えることができる、役に立つ AI アシスタントとして行動します。
      質問に答えるのに、提供されたコンテキストのみを使用してください。
      わからない場合は、答えをでっち上げないでください。
      メニューのアイテムを追加または変更しないでください。
  
      Question: ${input}
      `,
        context: docs,
      });
  
      const output = llmResponse.text();
      return output;
    }
  );

async function indexToFirestore(data: string[]) {
    for (const text of data) {
        const embedding = await embed({
            embedder: indexConfig.embedder,
            content: text,
        });
        await firestore.collection(indexConfig.collection).add({
            [indexConfig.vectorField]: FieldValue.vector(embedding),
            [indexConfig.contentField]: text,
        });
    }
}

// TODO: Read from GCS object (use Bucket mount feature)
async function extractTextFromPdf(filePath: string) {
    const pdfFile = path.resolve(filePath);
    const dataBuffer = await readFile(pdfFile);
    const data = await pdf(dataBuffer);
    return data.text;
}

startFlowsServer();
