import { generate } from '@genkit-ai/ai';
import { configureGenkit } from '@genkit-ai/core';
import { defineFlow, startFlowsServer } from '@genkit-ai/flow';
import { gemini15Flash } from '@genkit-ai/vertexai';
import * as z from 'zod';
import { googleCloud } from '@genkit-ai/google-cloud';
import { vertexAI } from '@genkit-ai/vertexai';

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

startFlowsServer();
