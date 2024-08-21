import { configureGenkit } from "@genkit-ai/core";
import { embed } from "@genkit-ai/ai/embedder";
import { defineFlow, run } from "@genkit-ai/flow";
import { textEmbeddingGecko, vertexAI } from "@genkit-ai/vertexai";

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { chunk } from "llm-chunk";
import pdf from "pdf-parse";
import * as z from "zod";

import { readFile } from "fs/promises";
import path from "path";

const indexConfig = {
  collection: "menuInfo",
  contentField: "description",
  vectorField: "embedding",
  embedder: textEmbeddingGecko,
};

configureGenkit({
  plugins: [
    vertexAI({ location: "asia-northeast1" })
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: false,
});

const app = initializeApp({
  credential: applicationDefault()
});
const firestore = getFirestore(app);

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