import { tool } from "langchain/tools";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// QVAC-local OpenAI client (shared singleton)
// ---------------------------------------------------------------------------
const qvacClient = new OpenAI({
  baseURL: "http://127.0.0.1:8080/v1",
  apiKey: "local-no-key",
  timeout: 120_000, // 2 minutes — local inference can be slow
  maxRetries: 1,
});

// ---------------------------------------------------------------------------
// searchVideoContext — State-scoped RAG tool
// ---------------------------------------------------------------------------
/**
 * Searches the transcript and semantic index of the user's currently active video.
 *
 * DESIGN: The LLM only provides a `query` string. The `vectorStoreId` is
 * transparently injected from the LangGraph state via `RunnableConfig.configurable`.
 * This means the LLM is never burdened with ID management.
 *
 * The agent's `call_model` node passes `currentVideo` into `config.configurable`
 * when invoking tools in its custom ToolNode, so the tool reads it here.
 *
 * Calls QVAC's `POST /v1/vector_stores/:id/search` endpoint which:
 *   - Embeds the query using the configured embedding model
 *   - Returns the top-K most semantically similar text chunks
 */
export const searchVideoContext = tool(
  async ({ query }: { query: string }, config?: RunnableConfig) => {
    // Read the vector store ID from graph state, injected via configurable.
    const currentVideo = config?.configurable?.currentVideo as
      | { vectorStoreId: string; videoId?: string; videoTitle?: string }
      | null
      | undefined;

    if (!currentVideo?.vectorStoreId) {
      return (
        "No video is currently selected or the video has not been indexed yet. " +
        "Please select a video and wait for it to be processed before searching."
      );
    }

    const { vectorStoreId } = currentVideo;
    const videoLabel =
      currentVideo.videoTitle ?? currentVideo.videoId ?? "the video";

    console.log(
      `[search_video_context] Searching "${query}" in store ${vectorStoreId} (${videoLabel})`
    );

    // Use the native openai SDK's beta.vectorStores.search() method.
    // This maps to QVAC's POST /v1/vector_stores/:id/search endpoint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const betaClient = qvacClient.beta as any;
    const results = await betaClient.vectorStores.search(vectorStoreId, {
      query,
      max_num_results: 5,
    });

    if (!results?.data || results.data.length === 0) {
      return `No relevant content found in ${videoLabel} for query: "${query}"`;
    }

    // Format results as readable text chunks with relevance scores.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatted = results.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((result: any, idx: number) => {
        const textContent = (result.content ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => c.type === "text")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => (typeof c.text === "string" ? c.text : ""))
          .join(" ")
          .trim();

        const score =
          typeof result.score === "number"
            ? ` (score: ${result.score.toFixed(3)})`
            : "";
        return `[${idx + 1}]${score}\n${textContent}`;
      })
      .join("\n\n---\n\n");

    return `Found ${results.data.length} relevant passages from ${videoLabel}:\n\n${formatted}`;
  },
  {
    name: "search_video_context",
    description:
      "Search the transcript and content of the currently active video. " +
      "Use this when the user asks questions about what was said, discussed, or shown in the video. " +
      "You only need to provide a natural language query — the system handles all context automatically.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "A natural language search query about the video content. " +
            "Examples: 'What was said about machine learning?', " +
            "'Find the part where the speaker discusses pricing', " +
            "'Summary of the introduction'"
        ),
    }),
  }
);

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------
export const TOOLS = [
  searchVideoContext,
];
