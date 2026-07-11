
import { ChatOpenAI } from "@langchain/openai"
import { createAgent } from "langchain";
import { TOOLS } from "./tools.js";
import { SYSTEM_PROMPT } from "./prompts.js";

const model = new ChatOpenAI({
  modelName: "local-model",
  configuration: {
    baseURL: "http://127.0.0.1:8080/v1", // Must match your Electron app port
    apiKey: "not-needed",               // Pass the dummy key here
  },
  streaming: true,
})

export const agent = createAgent({
  model: model,
  tools: TOOLS,
  systemPrompt: SYSTEM_PROMPT,
  // Optional: Add middleware for advanced customization
  // middleware: [
  //   summarizationMiddleware({
  //     model: "anthropic:claude-haiku-4-5",
  //     trigger: { tokens: 4000 },
  //   }),
  //   humanInTheLoopMiddleware({
  //     interruptOn: { sensitive_tool: { allowedDecisions: ["approve", "reject"] } },
  //   }),
  // ],
});
