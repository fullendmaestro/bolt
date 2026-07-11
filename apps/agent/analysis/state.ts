import { Annotation } from "@langchain/langgraph";

/**
 * State for the Video Analysis ingestion pipeline.
 *
 * Flows through three sequential nodes:
 *   transcribe_video → chunk_transcript → ingest_to_vector_store
 *
 * The final state contains the `vectorStoreId` that the assistant agent
 * uses to scope RAG queries to this specific video.
 */
export const AnalysisAnnotation = Annotation.Root({
  /** Unique identifier for the video (provided by the caller). */
  videoId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  /**
   * Absolute path (or URL) to the audio/video file to transcribe.
   * Must be readable by the QVAC server process.
   * Accepted formats: wav, mp3, m4a, and other Whisper-compatible audio.
   */
  videoFilePath: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  /**
   * Optional human-readable title for the video.
   * Injected into the assistant system prompt so the LLM knows what it's viewing.
   */
  videoTitle: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  /** Raw transcript text — populated by `transcribe_video`. */
  transcript: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  /** Text chunks split from the transcript — populated by `chunk_transcript`. */
  chunks: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),

  /**
   * The QVAC vector store ID — populated by `ingest_to_vector_store`.
   * This is what the assistant agent stores in `currentVideo.vectorStoreId`
   * and passes to `search_video_context`.
   */
  vectorStoreId: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),

  /** Any error message captured during the pipeline (non-fatal nodes log here). */
  error: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

export type AnalysisState = typeof AnalysisAnnotation.State;
