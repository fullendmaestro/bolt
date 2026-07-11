/**
 * Assistant Agent — `createAgent` with custom state and middleware.
 *
 * Uses the LangChain `createAgent` API for the core ReAct loop, extended with:
 *
 * 1. Custom `stateSchema` that adds `currentVideo` to the graph state,
 *    allowing the UI to inject which video is active when invoking the graph.
 *
 * 2. `videoContextMiddleware` — a `wrapToolCall` middleware that:
 *    - Reads `request.state.currentVideo` from the running graph state.
 *    - Passes it into the tool's configurable so `search_video_context` can
 *      look up `vectorStoreId` without the LLM ever seeing it.
 *    - Also handles system prompt injection via `beforeModel`.
 *
 * The middleware approach keeps the agent definition lean and avoids the
 * complexity of an explicit StateGraph while still achieving full state scoping.
 */

import { createAgent, createMiddleware } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { TOOLS, searchVideoContext } from "./tools.js";
import { buildSystemPrompt } from "./prompts.js";
import type { CurrentVideo } from "./state.js";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------
const model = new ChatOpenAI({
  modelName: "local-model",
  configuration: {
    baseURL: "http://127.0.0.1:8080/v1",
    apiKey: "not-needed",
  },
  streaming: true,
  timeout: 300_000, // 5 minutes — local inference can be slow
});

// ---------------------------------------------------------------------------
// State schema (extends MessagesAnnotation with currentVideo)
// ---------------------------------------------------------------------------
/**
 * The agent's LangGraph state.
 * `currentVideo` is set by the UI when invoking the graph and is never
 * exposed to the LLM directly — it's only used internally by middleware and tools.
 */
export const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  currentVideo: Annotation<CurrentVideo | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
});

// ---------------------------------------------------------------------------
// Middleware: video context injection
// ---------------------------------------------------------------------------
/**
 * Middleware that transparently injects `currentVideo` from graph state into
 * tool calls. This allows `search_video_context` to read `vectorStoreId` from
 * the running graph state via `config.configurable.currentVideo`.
 *
 * It also uses `beforeModel` to dynamically inject the video context into the
 * system prompt, so the LLM knows what video it's currently analyzing.
 */
const videoContextMiddleware = createMiddleware({
  name: "VideoContextMiddleware",

  /**
   * Before each model call, rebuild the system prompt to include the current
   * video context from state. This ensures the prompt stays fresh even if
   * `currentVideo` changes between turns.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeModel: async (request: any) => {
    const currentVideo = request.state?.currentVideo as CurrentVideo | null;
    const systemPrompt = buildSystemPrompt(currentVideo);

    // Replace or prepend the system message in the messages array.
    const messages = (request.messages ?? request.state?.messages ?? []) as Array<{
      _getType?: () => string;
      role?: string;
      content: string;
    }>;

    const nonSystem = messages.filter(
      (m) => m._getType?.() !== "system" && m.role !== "system"
    );

    return {
      messages: [{ role: "system", content: systemPrompt }, ...nonSystem],
    };
  },

  /**
   * Wraps each tool call to inject `currentVideo` into the tool's config.
   * The LLM-facing tool schema only has `query` — `vectorStoreId` is
   * transparently injected here from the graph state.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapToolCall: async (request: any, handler: (req: any) => Promise<any>) => {
    const currentVideo = request.state?.currentVideo as CurrentVideo | null;

    // Only inject for search_video_context — other tools don't need it.
    if (request.toolCall?.name === searchVideoContext.name && currentVideo) {
      // Directly invoke the tool with the injected config to bypass the default handler.
      const toolResult = await searchVideoContext.invoke(request.toolCall.args, {
        configurable: { currentVideo },
      });
      // Return the result in the shape the handler would have returned.
      return {
        ...request,
        toolCallResult: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
      };
    }

    // For all other tools, delegate to the default handler.
    return handler(request);
  },
});

// ---------------------------------------------------------------------------
// Agent export
// ---------------------------------------------------------------------------
export const agent = createAgent({
  model,
  tools: TOOLS,
  systemPrompt: buildSystemPrompt(null), // Default prompt; overridden by middleware
  stateSchema: StateAnnotation,
  middleware: [videoContextMiddleware],
});

// Export under the name `graph` for compatibility with langgraph.json.
export const graph = agent;
