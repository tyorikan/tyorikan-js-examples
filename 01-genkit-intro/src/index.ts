import { genkit, z } from 'genkit';
import { startFlowServer } from '@genkit-ai/express';
import { gemini20Flash, vertexAI } from '@genkit-ai/vertexai';
import { enableGoogleCloudTelemetry } from '@genkit-ai/google-cloud';
import { logger } from 'genkit/logging';

logger.setLogLevel('debug');
enableGoogleCloudTelemetry({});

const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1' }),],
  model: gemini20Flash,
});

const outputSchema = z.object({
  restaurant_name: z.string(),
  restaurant_concept: z.string(),
  menus: z.array(z.object({
    category: z.enum(['前菜・一品料理', 'メイン料理', 'ご飯もの・麺類', 'デザート', 'ドリンク']),
    name: z.string(),
    description: z.string(),
    price: z.number(),
  })).describe('少なくとも 20 品以上のメニューを考えて')
})

export const menuSuggestionFlow = ai.defineFlow(
  {
    name: 'menuSuggestionFlow',
    inputSchema: z.string(),
    outputSchema: outputSchema,
  },
  async (input) => {
    if (!input) {
      throw new Error("Input string is required.")
    }
    const llmResponse = await ai.generate({
      prompt: `${input}をテーマにしたレストランのメニューを提案して`,
      model: gemini20Flash,
      config: { temperature: 1 },
      output: { format: 'json', schema: outputSchema }
    });
    if (llmResponse.output === null) {
      throw new Error("Failed to generate a valid menu.");
    }
    return llmResponse.output;
  }
);

startFlowServer({
  flows: [menuSuggestionFlow],
  port: 8080,
  cors: {
    origin: '*',
  },
})
