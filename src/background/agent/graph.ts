import { type ToolCall } from "@langchain/core/messages/tool";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, START, END } from "@langchain/langgraph/web";
import { AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AgentState } from "./state";

import { agentTools } from "./tools";
import { getEntireProtocolHistoryTool, getLatestMessagesFromSessionTool } from './tools/ascSacTools';

import { AgentStateSchema } from "./state";

// Importa todas as classes de LLM que suportamos
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { IndexedDBCheckpointer } from '../services/indexedDBCheckpointer';

const CONTEXT_INJECTOR = "context_injector" as const;
const AGENT = "agent" as const;
const TOOLS = "tools" as const;

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
 * @node contextInjectorNode
 * @description Este nó é o novo ponto de entrada. Ele verifica se é a primeira
 * interação e injeta o contexto apropriado (histórico completo ou apenas novas mensagens)
 * no estado do grafo antes de passar para o agente principal.
 */
async function contextInjectorNode(state: AgentState, config?: RunnableConfig): Promise<Partial<AgentState>> {
  // A primeira mensagem do usuário já estará no estado. Se houver apenas uma, é a primeira interação.
  const isFirstInteraction = state.messages.length === 1;

  // As informações de contexto agora vêm do 'configurable' no config.
  const context = {
    contactId: config?.configurable?.contactId,
    protocolNumber: config?.configurable?.protocolNumber,
    attendanceId: config?.configurable?.attendanceId,
    baseUrl: config?.configurable?.baseUrl,
  };

  if (!context.attendanceId) {
    throw new Error("ID do Atendimento (attendanceId) não encontrado na configuração.");
  }

  if (isFirstInteraction) {
    console.log(`[Context Injector] Primeira interação. Buscando histórico completo...`);
    const history = await getEntireProtocolHistoryTool.invoke({
      contactId: context.contactId,
      protocolNumber: context.protocolNumber,
      baseUrl: context.baseUrl
    });

    const historyContextMessage = new SystemMessage({
      content: `[CONTEXT] The complete transcript of the conversation between the HUMAN ATTENDANT and the CLIENT is provided below. Your primary function is to assist the attendant based on this dialogue.
---
${history}
---`,
    });
    console.log(`[Context Injector] Histórico completo injetado.`);
    return { messages: [historyContextMessage] };

  } else {
    console.log(`[Context Injector] Interação subsequente. Buscando novas mensagens...`);
    const newMessages = await getLatestMessagesFromSessionTool.invoke({
      sessionId: context.attendanceId,
      baseUrl: context.baseUrl,
      since_timestamp: state.last_processed_client_message_timestamp ?? undefined
    });

    if (newMessages && !newMessages.startsWith("No new messages")) {
      const updateContextMessage = new SystemMessage({
        content: `[CONTEXT UPDATE] New messages exchanged between the HUMAN ATTENDANT and the CLIENT since your last interaction are provided below.
---
${newMessages}
---`,
      });
      console.log(`[Context Injector] Novas mensagens injetadas.`);
      return { messages: [updateContextMessage] };
    } else {
      console.log(`[Context Injector] Nenhuma nova mensagem para injetar.`);
      // Retorna um objeto vazio pois não há alteração no estado
      return {};
    }
  }
}

/**
 * @node agentNode
 * @description O cérebro principal do agente (ciclo ReAct). Decide se responde ao
 * usuário ou se chama uma ferramenta, agora com pleno conhecimento do contexto.
 */
async function agentNode(
  state: AgentState,
  config?: RunnableConfig // ADICIONADO: Recebe a configuração do grafo
): Promise<Partial<AgentState>> {
  console.log("[Graph] Executing Main Agent Node");

  const llm = createLlmInstance(state);
  // Filtra as ferramentas disponíveis com base na persona
  const availableTools = state.available_tool_names
    .map(toolName => agentTools[toolName]) // <<< MUDANÇA AQUI
    .filter(Boolean);

  const llmWithTools = llm.bindTools!(availableTools);

  const systemMessageWithContext = new SystemMessage({
    content: `
# ROLE AND GOAL
You are Omni Max, an expert AI assistant for a human customer service attendant.
Your primary goal is to empower the human attendant to provide faster, more accurate, and more empathetic service to the end client.
You are a co-pilot. The human attendant is your user, and you must direct all your responses to them.

# PERSONA AND SPECIALIZATION
You must adopt the following persona and specialization for this interaction. This is your primary directive and overrides general behavior.
---
${state.system_prompt}
---

# KEY RESPONSIBILITIES
1.  **Analyze the Conversation:** Carefully read the conversation transcript between the attendant and the client provided in previous system messages.
2.  **Answer the Attendant's Questions:** The attendant will ask you for information, clarifications, or suggestions. Provide concise and accurate answers.
3.  **Suggest Responses:** Proactively suggest well-formulated responses that the attendant can send to the client. Clearly label these suggestions, for example: "Here is a suggested response for the client:".
4.  **Execute Actions via Tools:** When the attendant asks you to perform a specific action (e.g., "get the invoice," "generate a Pix key"), use your available tools to accomplish the task.

# HOW TO USE TOOLS
- You have a set of tools to help you. Before answering, consider if any of your available tools could provide a more accurate, specific, or up-to-date answer than your general knowledge.
- **Knowledge Base Search:** You have a special tool called 'knowledge_base_search'.
  - **USE THIS TOOL FIRST** whenever the attendant asks a question about internal procedures, product details, specific policies, or any information that might be stored in internal documents.
  - If the tool finds relevant information, use it to construct your answer and mention that the information came from the knowledge base.
  - If the tool returns "No relevant information found", inform the attendant that you couldn't find an answer in the knowledge base and then proceed to answer based on your general knowledge.


# RESPONSE SUGGESTION RULES
Before crafting a response suggestion for the attendant, you MUST analyze the conversation history to determine the context.

1.  **Greeting Rule (Salutations):**
    -   **INCLUDE a greeting** (e.g., "Hello, how are you?", "Good morning!") ONLY IF the conversation is clearly at the beginning. This applies if:
        - The attendant has not sent any messages yet.
        - The entire conversation has fewer than 3 messages.
        - The attendant explicitly asks for an "opening message" or "greeting".
    -   **DO NOT INCLUDE a greeting** if the conversation is already in progress (3 or more messages have been exchanged). In this case, your suggestion must be a direct continuation of the dialogue. Jump straight to the point.

2.  **Clarity and Labeling:**
    -   Always label your suggestion clearly with: "Here is a suggested response for the client:".


# HOW TO INTERACT
-   **Your audience is the ATTENDANT, not the end client.** Never address the client directly.
-   **Be concise and clear.** The attendant is likely multitasking.
-   **Be proactive.** If you identify an opportunity to help based on the conversation, offer a suggestion.

# CONTEXT AND TOOLS
-   **Conversation History:** The transcript of the dialogue between the attendant and the client is provided in preceding System Messages marked with [CONTEXT].
-   **Available Tools:** You have a set of tools to fetch information and perform actions. Use them when necessary to fulfill the attendant's requests.
-   **Static Information:**
    -   Current Date/Time: ${new Date().toISOString()}
    -   Customer Service Protocol Number: ${state.protocol_number}
    -   Current Attendance ID: ${state.attendance_id}
    -   Customer Contact ID: ${state.contact_id}
    -   Platform Base URL: ${state.base_url}
`,
  });

  const messagesForLlm = [systemMessageWithContext, ...state.messages];

  // ALTERADO: Passa o objeto `config` para a chamada do LLM
  const ai_response = await llmWithTools.invoke(messagesForLlm, config);

  return { messages: [ai_response] };
}

/**
 * @node toolNode
 * @description O executor de ferramentas ("as mãos" do agente).
 */

const toolNode = new ToolNode(Object.values(agentTools));

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
workflow.addNode(CONTEXT_INJECTOR, contextInjectorNode);
workflow.addNode(AGENT, agentNode);
workflow.addNode(TOOLS, toolNode);

// 2. Definir as Conexões (Edges)
(workflow as any).addEdge(START, CONTEXT_INJECTOR);
(workflow as any).addEdge(CONTEXT_INJECTOR, AGENT);
(workflow as any).addEdge(TOOLS, AGENT);

// A borda condicional controla o loop do agente principal
(workflow as any).addConditionalEdges(AGENT, shouldContinue, {
  tools: TOOLS,
  [END]: END,
});

console.log("[Graph] Compiling graph...");
const checkpointer = new IndexedDBCheckpointer();
export const app = workflow.compile({ checkpointer });
console.log("[Graph] Graph compiled successfully!");