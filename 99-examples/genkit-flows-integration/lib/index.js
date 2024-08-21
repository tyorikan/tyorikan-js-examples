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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuQA = exports.indexMenu = exports.menuSuggestionFlow = void 0;
const ai_1 = require("@genkit-ai/ai");
const core_1 = require("@genkit-ai/core");
const flow_1 = require("@genkit-ai/flow");
const vertexai_1 = require("@genkit-ai/vertexai");
const z = __importStar(require("zod"));
const google_cloud_1 = require("@genkit-ai/google-cloud");
const firebase_1 = require("@genkit-ai/firebase");
const retriever_1 = require("@genkit-ai/ai/retriever");
const embedder_1 = require("@genkit-ai/ai/embedder");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const llm_chunk_1 = require("llm-chunk");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const indexConfig = {
    collection: "menuInfo",
    contentField: "description",
    vectorField: "embedding",
    embedder: vertexai_1.textEmbeddingGecko,
};
const app = (0, app_1.initializeApp)({
    credential: (0, app_1.applicationDefault)()
});
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
(0, core_1.configureGenkit)({
    plugins: [
        (0, google_cloud_1.googleCloud)(),
        (0, vertexai_1.vertexAI)({ location: 'asia-northeast1' }),
    ],
    logLevel: 'warn',
    enableTracingAndMetrics: true,
});
exports.menuSuggestionFlow = (0, flow_1.defineFlow)({
    name: 'menuSuggestionFlow',
    inputSchema: z.string(),
    outputSchema: z.any(),
}, async (subject) => {
    if (!subject) {
        throw new Error("Input string is required.");
    }
    const llmResponse = await (0, ai_1.generate)({
        prompt: `${subject}をテーマにしたレストランのメニューを提案して`,
        model: vertexai_1.gemini15Flash,
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
});
exports.indexMenu = (0, flow_1.defineFlow)({
    name: "indexMenu",
    inputSchema: z.string().describe("PDF file path"),
    outputSchema: z.void(),
}, async (filePath) => {
    filePath = path_1.default.resolve(filePath);
    // Read the PDF.
    const pdfTxt = await (0, flow_1.run)("extract-text", () => extractTextFromPdf(filePath));
    // Divide the PDF text into segments.
    const chunks = await (0, flow_1.run)("chunk-it", async () => (0, llm_chunk_1.chunk)(pdfTxt));
    // Add chunks to the index.
    await (0, flow_1.run)("index-chunks", async () => indexToFirestore(chunks));
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
async function indexToFirestore(data) {
    for (const text of data) {
        const embedding = await (0, embedder_1.embed)({
            embedder: indexConfig.embedder,
            content: text,
        });
        await firestore.collection(indexConfig.collection).add({
            [indexConfig.vectorField]: firestore_1.FieldValue.vector(embedding),
            [indexConfig.contentField]: text,
        });
    }
}
// TODO: Read from GCS object (use Bucket mount feature)
async function extractTextFromPdf(filePath) {
    const pdfFile = path_1.default.resolve(filePath);
    const dataBuffer = await (0, promises_1.readFile)(pdfFile);
    const data = await (0, pdf_parse_1.default)(dataBuffer);
    return data.text;
}
(0, flow_1.startFlowsServer)();
//# sourceMappingURL=index.js.map