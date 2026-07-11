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
// calculator
// ---------------------------------------------------------------------------
export const calculator = tool(
  async ({ operation, a, b }: { operation: string; a: number; b: number }) => {
    switch (operation) {
      case "add":
        return `${a} + ${b} = ${a + b}`;
      case "subtract":
        return `${a} - ${b} = ${a - b}`;
      case "multiply":
        return `${a} × ${b} = ${a * b}`;
      case "divide":
        if (b === 0) {
          return "Error: Division by zero is not allowed.";
        }
        return `${a} ÷ ${b} = ${a / b}`;
      default:
        return "Error: Unknown operation.";
    }
  },
  {
    name: "calculator",
    description:
      "Perform basic arithmetic operations (add, subtract, multiply, divide) on two numbers.",
    schema: z.object({
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("The arithmetic operation to perform"),
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  }
);

// ---------------------------------------------------------------------------
// getCurrentTime
// ---------------------------------------------------------------------------
/**
 * A tool that returns the current date and time.
 */
export const getCurrentTime = tool(
  async () => {
    const now = new Date();
    return `Current date and time: ${now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    })}`;
  },
  {
    name: "get_current_time",
    description:
      "Get the current date and time. Use this when the user asks about the current time or date.",
    schema: z.object({}),
  }
);

// ---------------------------------------------------------------------------
// getWeather
// ---------------------------------------------------------------------------
export const getWeather = tool(
  async ({ location, unit }: { location: string; unit: string }) => {
    const conditions = ["sunny", "cloudy", "rainy", "partly cloudy", "windy"];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    const tempCelsius = Math.floor(Math.random() * 35) + 5;
    const temp =
      unit === "fahrenheit"
        ? Math.round((tempCelsius * 9) / 5 + 32)
        : tempCelsius;
    const unitSymbol = unit === "fahrenheit" ? "°F" : "°C";

    return `Weather in ${location}: ${condition}, ${temp}${unitSymbol}. (Note: This is simulated data)`;
  },
  {
    name: "get_weather",
    description:
      "Get the current weather for a specified location. Returns temperature and conditions.",
    schema: z.object({
      location: z.string().describe("The city or location to get weather for"),
      unit: z
        .enum(["celsius", "fahrenheit"])
        .default("celsius")
        .describe("Temperature unit preference"),
    }),
  }
);

// ---------------------------------------------------------------------------
// searchKnowledge
// ---------------------------------------------------------------------------
export const searchKnowledge = tool(
  async ({ query, maxResults }: { query: string; maxResults: number }) => {
    const results = [
      {
        title: "Introduction to AI Agents",
        snippet:
          "AI agents are autonomous systems that can perceive, reason, and act...",
      },
      {
        title: "Building with LangChain",
        snippet:
          "LangChain provides tools and abstractions for building LLM applications...",
      },
      {
        title: "Tool Calling in LLMs",
        snippet:
          "Modern LLMs can use tools to extend their capabilities beyond text generation...",
      },
    ];

    const limitedResults = results.slice(0, maxResults);
    return `Found ${limitedResults.length} results for "${query}":\n\n${limitedResults
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}`)
      .join("\n\n")}`;
  },
  {
    name: "search_knowledge",
    description:
      "Search through the knowledge base for relevant information. Use this when the user asks questions that may require looking up information.",
    schema: z.object({
      query: z.string().describe("The search query to look for"),
      maxResults: z
        .number()
        .min(1)
        .max(10)
        .default(3)
        .describe("Maximum number of results to return"),
    }),
  }
);

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
  calculator,
  getCurrentTime,
  getWeather,
  searchKnowledge,
  searchVideoContext,
];
