"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuSuggestionFlow = void 0;
const genkit_1 = require("genkit");
const express_1 = require("@genkit-ai/express");
const vertexai_1 = require("@genkit-ai/vertexai");
const google_cloud_1 = require("@genkit-ai/google-cloud");
const logging_1 = require("genkit/logging");
logging_1.logger.setLogLevel('debug');
(0, google_cloud_1.enableGoogleCloudTelemetry)({});
const ai = (0, genkit_1.genkit)({
    plugins: [(0, vertexai_1.vertexAI)({ location: 'us-central1' }),],
    model: vertexai_1.gemini20Flash,
});
const outputSchema = genkit_1.z.object({
    restaurant_name: genkit_1.z.string(),
    restaurant_concept: genkit_1.z.string(),
    menus: genkit_1.z.array(genkit_1.z.object({
        category: genkit_1.z.enum(['前菜・一品料理', 'メイン料理', 'ご飯もの・麺類', 'デザート', 'ドリンク']),
        name: genkit_1.z.string(),
        description: genkit_1.z.string(),
        price: genkit_1.z.number(),
    })).describe('少なくとも 20 品以上のメニューを考えて')
});
exports.menuSuggestionFlow = ai.defineFlow({
    name: 'menuSuggestionFlow',
    inputSchema: genkit_1.z.string(),
    outputSchema: outputSchema,
}, async (input) => {
    if (!input) {
        throw new Error("Input string is required.");
    }
    const llmResponse = await ai.generate({
        prompt: `${input}をテーマにしたレストランのメニューを提案して`,
        model: vertexai_1.gemini20Flash,
        config: { temperature: 1 },
        output: { format: 'json', schema: outputSchema }
    });
    if (llmResponse.output === null) {
        throw new Error("Failed to generate a valid menu.");
    }
    return llmResponse.output;
});
(0, express_1.startFlowServer)({
    flows: [exports.menuSuggestionFlow],
    port: 8080,
    cors: {
        origin: '*',
    },
});
//# sourceMappingURL=index.js.map