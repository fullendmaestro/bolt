import { StateGraph } from "@langchain/langgraph"
import { ChatOpenAI } from "@langchain/openai"
import { StateAnnotation } from "./state"

// Connect directly to QVAC's local OpenAI-compatible server
const model = new ChatOpenAI({
  modelName: "local-model",
  openAIApiKey: "not-needed", 
  configuration: {
    baseURL: "http://127.0.0.1:8080/v1", // Must match the port the Electron app starts QVAC on
  },
  streaming: true,
})

const callModel = async (state: typeof StateAnnotation.State) => {
  const response = await model.invoke(state.messages)
  return { messages: [response] }
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__")
  .compile()
