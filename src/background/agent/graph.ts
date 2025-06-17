import { type ToolCall } from "@langchain/core/messages/tool";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, END, Command, START } from "@langchain/langgraph/web";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AgentState } from "./state";

import { masterToolRegistry } from "./tools";
import { AgentStateSchema } from "./state";

// Importa todas as classes de LLM que suportamos
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const INTENT = "intent_router" as const;
const AGENT  = "agent" as const;
const TOOLS  = "tools" as const;

/**
 * Registry de fábricas de LLM.
 * Mapeia um provider_id para uma função que cria a instância do LLM.
 * Isso mantém nosso código limpo e extensível.
 */
const llmFactoryRegistry: Record<string, (config: { apiKey?: string; baseUrl?: string; model: string }) => BaseChatModel> = {
  'groq': (config) => new ChatGroq({ apiKey: config.apiKey, model: config.model }),
  'openai': (config) => new ChatOpenAI({ apiKey: config.apiKey, model: config.model }),
  'ollama': (config) => new ChatOllama({ baseUrl: config.baseUrl, model: config.model }),
  'anthropic': (config) => new ChatAnthropic({ apiKey: config.apiKey, model: config.model }),
  'gemini': (config) => new ChatGoogleGenerativeAI({ apiKey: config.apiKey, model: config.model }),
};

/**
 * Cria a instância do LLM dinamicamente com base na configuração do estado.
 */
function createLlmInstance(state: AgentState): BaseChatModel {
  const { provider, model, api_key, base_url } = state;
  const factory = llmFactoryRegistry[provider];

  if (!factory) {
    throw new Error(`Unsupported provider: "${provider}". No factory found in registry.`);
  }
  console.log(`[Graph] Creating LLM instance for provider: ${provider}, model: ${model}`);
  return factory({ apiKey: api_key, baseUrl: base_url, model: model });
}

// Nós do Grafo

/**
 * @node intentRouterNode
 * @description O ponto de entrada do grafo. Classifica a intenção do usuário para
 * rotear o fluxo de trabalho de forma eficiente.
 */
async function intentRouterNode(state: AgentState): Promise<Partial<AgentState> & Command> {
  console.log("[Graph] Executing Intent Router Node");
  const { messages } = state;
  const userQuery = messages[messages.length - 1].content as string;

  const routingPrompt = `
    Given the user query, classify its primary intent into one of the following categories:
    - "summarize": If the user is asking for a summary, overview, or recap of the customer conversation.
    - "contextual_qa": If the user is asking a specific question about the customer conversation that likely requires reading the chat history (e.g., "What is the customer's document number?", "What was the last thing the customer said?").
    - "general_instruction": For any other instruction, like asking for response ideas, general knowledge, or performing an action not directly related to the chat history.

    User query: "${userQuery}"

    Respond with only one of the category names: "summarize", "contextual_qa", or "general_instruction".`;

  const llm = createLlmInstance(state);
  const response = await llm.invoke(routingPrompt);
  const intent = response.content.toString().trim().replace(/"/g, "");

  console.log(`[Graph] Intent classified as: ${intent}`);

  // Por enquanto, todas as intenções acionam o agente principal.
  // No futuro, podemos ter nós especializados para cada intenção.
  // A ação aqui é retornar um "Command" para ir para o próximo nó.
  return new Command({ goto: "agent" });
}

/**
 * @node agentNode
 * @description O cérebro principal do agente (ciclo ReAct). Decide se responde ao
 * usuário ou se chama uma ferramenta.
 */
async function agentNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log("[Graph] Executing Main Agent Node");
  const llm = createLlmInstance(state);
  const tools = Object.values(masterToolRegistry);
  const llmWithTools = llm.bindTools!(tools);
  
  // O prompt do sistema da persona já está no estado, mas LangGraph o pega de lá.
  // Para garantir, podemos adicionar a system message aqui se necessário.
  const ai_response = await llmWithTools.invoke(state.messages);

  return { messages: [ai_response] };
}

/**
 * @node toolNode
 * @description O executor de ferramentas ("as mãos" do agente).
 */
const toolNode = new ToolNode(Object.values(masterToolRegistry));

const hasToolCalls = (
  message: BaseMessage,
): message is AIMessage & { tool_calls: ToolCall[] } => {
  return (
    message.getType() === "ai" &&
    "tool_calls" in message &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls.length > 0
  );
};

// Lógica Condicional (Edges)

/**
 * @function shouldContinue
 * @description Decide se o ciclo do agente principal deve chamar uma ferramenta ou terminar.
 */
function shouldContinue(state: AgentState): "tools" | typeof END {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (hasToolCalls(lastMessage)) {
      // Check if any tool call is the "Done" tool
      if (lastMessage.tool_calls.some((toolCall) => toolCall.name === "Done")) {
      console.log("[Graph] Routing from Agent to: END (Done tool called)");
        return END;
      }
      console.log("[Graph] Routing from Agent to: Tools");
      return "tools";
    }
    console.log("[Graph] Routing from Agent to: END");
    return END;
}

// --- Definição e Compilação do Grafo ---

console.log("[Graph] Defining workflow...");
const workflow = new StateGraph(AgentStateSchema);

// 1. Adicionar os Nós
workflow.addNode(INTENT, intentRouterNode);
workflow.addNode(AGENT, agentNode);
workflow.addNode(TOOLS, toolNode);

// 2. Definir as Conexões (Edges)
(workflow as any).addEdge(START, INTENT);
(workflow as any).addEdge(INTENT, AGENT);
(workflow as any).addEdge(TOOLS, AGENT);

// A borda condicional controla o loop do agente principal
(workflow as any).addConditionalEdges(AGENT, shouldContinue, {
  tools: TOOLS,
  [END]: END,
});

console.log("[Graph] Compiling graph...");
export const app = workflow.compile();
console.log("[Graph] Graph compiled successfully!");