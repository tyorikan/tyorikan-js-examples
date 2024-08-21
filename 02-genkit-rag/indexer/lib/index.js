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
exports.indexMenu = void 0;
const core_1 = require("@genkit-ai/core");
const embedder_1 = require("@genkit-ai/ai/embedder");
const flow_1 = require("@genkit-ai/flow");
const vertexai_1 = require("@genkit-ai/vertexai");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const llm_chunk_1 = require("llm-chunk");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const z = __importStar(require("zod"));
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const indexConfig = {
    collection: "menuInfo",
    contentField: "description",
    vectorField: "embedding",
    embedder: vertexai_1.textEmbeddingGecko,
};
(0, core_1.configureGenkit)({
    plugins: [
        (0, vertexai_1.vertexAI)({ location: "asia-northeast1" })
    ],
    logLevel: 'debug',
    enableTracingAndMetrics: false,
});
const app = (0, app_1.initializeApp)({
    credential: (0, app_1.applicationDefault)()
});
const firestore = (0, firestore_1.getFirestore)(app);
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
//# sourceMappingURL=index.js.map