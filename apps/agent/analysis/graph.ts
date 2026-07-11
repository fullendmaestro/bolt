/**
 * Video Analysis RAG Ingestion Graph
 *
 * A LangGraph StateGraph that processes a video file through three sequential nodes:
 *   1. transcribe_video   — Calls QVAC /v1/audio/transcriptions (Whisper-compatible)
 *   2. chunk_transcript   — Splits the raw transcript into overlapping text chunks
 *   3. ingest_to_vector_store — Uploads chunks to QVAC's vector store via the Files API
 *
 * The QVAC server is 100% OpenAI-API-compatible. We use the native `openai` npm
 * package pointed at http://127.0.0.1:8080/v1 so that standard SDK types are preserved.
 *
 * Ingest flow (as documented in QVAC docs):
 *   POST /v1/vector_stores → create store
 *   POST /v1/files         → upload UTF-8 text content, get file_id
 *   POST /v1/vector_stores/:id/files → attach file (triggers embed + ingest)
 *
 * The graph returns `vectorStoreId` in state, which the caller stores and passes
 * to the assistant agent as `currentVideo.vectorStoreId`.
 */

import * as fs from "fs";
import * as path from "path";
import { StateGraph, END, START } from "@langchain/langgraph";
import OpenAI, { toFile } from "openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { AnalysisAnnotation, type AnalysisState } from "./state.js";

// ---------------------------------------------------------------------------
// QVAC-local OpenAI client
// ---------------------------------------------------------------------------
const LOCAL_BASE_URL = "http://127.0.0.1:8080/v1";
const LOCAL_API_KEY = "local-no-key";

/** Single shared client for all QVAC API calls inside this graph. */
const qvacClient = new OpenAI({
  baseURL: LOCAL_BASE_URL,
  apiKey: LOCAL_API_KEY,
  // QVAC runs local inference — allow generous timeouts.
  timeout: 300_000, // 5 minutes
  maxRetries: 2,
});

// Access the beta client for vector store operations.
// Cast to any to avoid TS type gaps when openai package version lacks
// beta.vectorStores typings.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const betaClient = qvacClient.beta as any;

// ---------------------------------------------------------------------------
// Text splitter configuration
// ---------------------------------------------------------------------------
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,     // characters per chunk
  chunkOverlap: 150,   // overlap keeps semantic context across boundaries
  separators: ["\n\n", "\n", ". ", " ", ""],
});

// ---------------------------------------------------------------------------
// Node 1: transcribe_video
// ---------------------------------------------------------------------------
/**
 * Sends the audio/video file at `state.videoFilePath` to QVAC's
 * `/v1/audio/transcriptions` endpoint and writes the transcript into state.
 *
 * Constraint: The file must be readable by the Node process (local path).
 * QVAC accepts wav, mp3, m4a, and other Whisper-compatible formats.
 * The `model` field must match a Whisper alias registered in qvac.config.json.
 *
 * Note: QVAC docs state `language` and `temperature` are only configurable
 * at model load time, not per-request. We omit them here.
 */
async function transcribeVideo(
  state: AnalysisState
): Promise<Partial<AnalysisState>> {
  const { videoFilePath } = state;

  if (!videoFilePath) {
    return { error: "transcribe_video: videoFilePath is required" };
  }

  if (!fs.existsSync(videoFilePath)) {
    return {
      error: `transcribe_video: file not found at ${videoFilePath}`,
    };
  }

  console.log(`[transcribe_video] Transcribing: ${videoFilePath}`);

  // The native openai SDK accepts `fs.createReadStream` as an Uploadable.
  // This maps to the multipart `file` field QVAC expects.
  const audioStream = fs.createReadStream(videoFilePath);
  const filename = path.basename(videoFilePath);

  // Wrap as an openai Uploadable using toFile()
  const uploadable = await toFile(audioStream, filename);

  const response = await qvacClient.audio.transcriptions.create({
    file: uploadable,
    model: "local-model", // Must match a Whisper alias in qvac.config.json
    response_format: "json",
  });

  // response is { text: string } when response_format is "json".
  const transcript =
    typeof response === "object" && response !== null && "text" in response
      ? (response as { text: string }).text
      : String(response);

  console.log(
    `[transcribe_video] Transcript length: ${transcript.length} chars`
  );

  return { transcript };
}

// ---------------------------------------------------------------------------
// Node 2: chunk_transcript
// ---------------------------------------------------------------------------
/**
 * Splits the raw transcript into smaller, overlapping chunks using
 * LangChain's RecursiveCharacterTextSplitter.
 *
 * Chunking is done at the text layer (not token layer) because QVAC's
 * vector store handles embedding internally on ingest.
 */
async function chunkTranscript(
  state: AnalysisState
): Promise<Partial<AnalysisState>> {
  const { transcript } = state;

  if (!transcript) {
    return {
      error:
        "chunk_transcript: transcript is empty — did transcribe_video run?",
    };
  }

  console.log(`[chunk_transcript] Splitting transcript into chunks...`);

  const docs = await textSplitter.createDocuments([transcript]);
  const chunks = docs.map((doc: { pageContent: string }) => doc.pageContent);

  console.log(`[chunk_transcript] Created ${chunks.length} chunks`);

  return { chunks };
}

// ---------------------------------------------------------------------------
// Node 3: ingest_to_vector_store
// ---------------------------------------------------------------------------
/**
 * Ingests transcript chunks into QVAC's vector store via the OpenAI Files API.
 *
 * QVAC ingest flow (from docs):
 *   1. POST /v1/vector_stores   → create a named store, get store id
 *   2. POST /v1/files           → upload UTF-8 text file, get file_id
 *   3. POST /v1/vector_stores/:id/files → attach file (triggers embed + ingest)
 *
 * IMPORTANT: QVAC's vector store accepts only UTF-8 text files — PDFs, images,
 * etc. are rejected. We serialize chunks as plain text with delimiters.
 *
 * Embedding model is auto-selected by QVAC from serve.models (picks the
 * only/default embedding alias) — no explicit model field is needed here.
 *
 * Returns { vectorStoreId } so downstream callers can persist it.
 */
async function ingestToVectorStore(
  state: AnalysisState
): Promise<Partial<AnalysisState>> {
  const { videoId, videoTitle, chunks } = state;

  if (!chunks || chunks.length === 0) {
    return {
      error:
        "ingest_to_vector_store: no chunks to ingest — did chunk_transcript run?",
    };
  }

  console.log(
    `[ingest_to_vector_store] Ingesting ${chunks.length} chunks for video: ${videoId}`
  );

  // Step 1: Create a new vector store
  const storeName = `video-${videoId}-${Date.now()}`;
  const vectorStore = await betaClient.vectorStores.create({
    name: storeName,
  });
  const vectorStoreId: string = vectorStore.id;
  console.log(`[ingest_to_vector_store] Created vector store: ${vectorStoreId}`);

  // Step 2: Serialize chunks as a single UTF-8 text file
  const title = videoTitle || videoId || "Video Transcript";
  const formattedContent = [
    `Title: ${title}`,
    `Video ID: ${videoId}`,
    "",
    chunks
      .map((chunk: string, i: number) => `[Chunk ${i + 1}]\n${chunk}`)
      .join("\n\n---\n\n"),
  ].join("\n");

  // Step 3: Upload the text file via POST /v1/files
  const uploadableFile = await toFile(
    Buffer.from(formattedContent, "utf-8"),
    `transcript-${videoId}.txt`,
    { type: "text/plain" }
  );

  const uploadedFile = await qvacClient.files.create({
    file: uploadableFile,
    purpose: "assistants",
  });
  console.log(`[ingest_to_vector_store] Uploaded file: ${uploadedFile.id}`);

  // Step 4: Attach the file to the vector store (triggers QVAC's embed + ingest)
  // QVAC docs: once attached, the file is removed from the ephemeral file store.
  await betaClient.vectorStores.files.create(vectorStoreId, {
    file_id: uploadedFile.id,
  });
  console.log(
    `[ingest_to_vector_store] File attached to vector store. Ingest complete.`
  );

  return { vectorStoreId };
}

// ---------------------------------------------------------------------------
// Graph definition
// ---------------------------------------------------------------------------
const workflow = new StateGraph(AnalysisAnnotation)
  .addNode("transcribe_video", transcribeVideo)
  .addNode("chunk_transcript", chunkTranscript)
  .addNode("ingest_to_vector_store", ingestToVectorStore)
  .addEdge(START, "transcribe_video")
  .addEdge("transcribe_video", "chunk_transcript")
  .addEdge("chunk_transcript", "ingest_to_vector_store")
  .addEdge("ingest_to_vector_store", END);

export const analysisGraph = workflow.compile();

/**
 * Convenience helper for running the full ingestion pipeline.
 *
 * @example
 * ```ts
 * import { runAnalysis } from "./analysis/index.js";
 *
 * const result = await runAnalysis({
 *   videoId: "my-video-123",
 *   videoFilePath: "/tmp/lecture.wav",
 *   videoTitle: "Introduction to LangGraph",
 * });
 *
 * console.log("Vector Store ID:", result.vectorStoreId);
 * // Pass to the assistant:
 * // await graph.invoke({ messages: [], currentVideo: { videoId, vectorStoreId: result.vectorStoreId } });
 * ```
 */
export async function runAnalysis(input: {
  videoId: string;
  videoFilePath: string;
  videoTitle?: string;
}) {
  return analysisGraph.invoke({
    videoId: input.videoId,
    videoFilePath: input.videoFilePath,
    videoTitle: input.videoTitle ?? "",
  });
}
