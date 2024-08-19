"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuSuggestionFlow = void 0;
const ai_1 = require("@genkit-ai/ai");
const core_1 = require("@genkit-ai/core");
const flow_1 = require("@genkit-ai/flow");
const vertexai_1 = require("@genkit-ai/vertexai");
const z = __importStar(require("zod"));
const google_cloud_1 = require("@genkit-ai/google-cloud");
const vertexai_2 = require("@genkit-ai/vertexai");
(0, core_1.configureGenkit)({
    plugins: [
        (0, google_cloud_1.googleCloud)(),
        (0, vertexai_2.vertexAI)({ location: 'asia-northeast1' }),
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
});
exports.menuSuggestionFlow = (0, flow_1.defineFlow)({
    name: 'menuSuggestionFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
}, async (subject) => {
    const llmResponse = await (0, ai_1.generate)({
        prompt: `${subject}をテーマにしたレストランのメニューを提案して`,
        model: vertexai_1.gemini15Flash,
        config: {
            temperature: 1,
        },
        output: {
            schema: z.object({
                restaurant_name: z.string(),
                restaurant_concept: z.string(),
                menus: z.array(z.object({
                    category: z.enum(['前菜・一品料理', 'メイン料理', 'ご飯もの・麺類', 'デザート', 'ドリンク']),
                    name: z.string(),
                    description: z.string(),
                    price: z.number().describe('1 品あたりの金額は、400 円から 3,000 円までの範囲にして'),
                })).describe('少なくとも 50 品以上のメニューを考えて')
            })
        }
    });
    return llmResponse.text();
});
(0, flow_1.startFlowsServer)();
//# sourceMappingURL=index.js.map