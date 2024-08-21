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
exports.menuQA = void 0;
const ai_1 = require("@genkit-ai/ai");
const core_1 = require("@genkit-ai/core");
const firebase_1 = require("@genkit-ai/firebase");
const flow_1 = require("@genkit-ai/flow");
const vertexai_1 = require("@genkit-ai/vertexai");
const z = __importStar(require("zod"));
const google_cloud_1 = require("@genkit-ai/google-cloud");
const retriever_1 = require("@genkit-ai/ai/retriever");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const app = (0, app_1.initializeApp)();
const firestore = (0, firestore_1.getFirestore)(app);
const menuQARef = (0, firebase_1.defineFirestoreRetriever)({
    name: "menuRetrieverRef",
    firestore: firestore,
    collection: "menuInfo",
    contentField: "description",
    vectorField: "embedding",
    embedder: vertexai_1.textEmbeddingGecko,
    distanceMeasure: "COSINE",
});
// Set GCLOUD_PROJECT to env variables for firebase plugin
(0, core_1.configureGenkit)({
    plugins: [
        (0, google_cloud_1.googleCloud)(),
        (0, vertexai_1.vertexAI)({ location: 'asia-northeast1' }),
    ],
    logLevel: 'warn',
    enableTracingAndMetrics: true,
});
exports.menuQA = (0, flow_1.defineFlow)({
    name: 'menuQA',
    inputSchema: z.string(),
    outputSchema: z.string()
}, async (input) => {
    // retrieve relevant documents
    const docs = await (0, retriever_1.retrieve)({
        retriever: menuQARef,
        query: input,
        options: {
            k: 3,
            limit: 20,
        },
    });
    // generate a response
    const llmResponse = await (0, ai_1.generate)({
        model: vertexai_1.gemini15Flash,
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
});
(0, flow_1.startFlowsServer)();
//# sourceMappingURL=index.js.map