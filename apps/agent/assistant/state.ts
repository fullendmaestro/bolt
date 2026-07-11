/**
 * Assistant Agent State
 *
 * The `StateAnnotation` (with `messages` + `currentVideo`) is defined in
 * `agent.ts` co-located with the middleware that reads it.
 *
 * This file provides the shared `CurrentVideo` interface and re-exports
 * the state annotation for consumers outside the agent module.
 */

/**
 * Describes the video the user is currently working with.
 * The UI sets this when invoking the assistant graph.
 * Tools use `vectorStoreId` to scope RAG queries without exposing it to the LLM.
 */
export interface CurrentVideo {
  /** Unique identifier for the video (matches `videoId` used during ingestion). */
  videoId: string;

  /** Human-readable title to inject into the system prompt. */
  videoTitle?: string;

  /**
   * The QVAC vector store ID returned by the analysis graph.
   * Injected into tool calls via middleware → config.configurable — the LLM never sees this.
   */
  vectorStoreId: string;
}

// Re-export the StateAnnotation from the agent so external consumers
// can use it without importing the full agent module.
export { StateAnnotation } from "./agent.js";

export type AssistantState = {
  messages: unknown[];
  currentVideo: CurrentVideo | null;
};
