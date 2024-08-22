import { generate } from '@genkit-ai/ai';
import { configureGenkit } from '@genkit-ai/core';
import { defineFirestoreRetriever } from "@genkit-ai/firebase";
import { defineFlow, startFlowsServer } from '@genkit-ai/flow';
import { gemini15Flash, textEmbeddingGecko, vertexAI } from '@genkit-ai/vertexai';
import * as z from 'zod';
import { googleCloud } from '@genkit-ai/google-cloud';

import { retrieve } from "@genkit-ai/ai/retriever";

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp();
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

// Set GCLOUD_PROJECT to env variables for firebase plugin
configureGenkit({
  plugins: [
    googleCloud(),
    vertexAI({ location: 'asia-northeast1' }),
  ],
  logLevel: 'warn',
  enableTracingAndMetrics: true,
});

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

startFlowsServer();
