import { type ToolCall } from "@langchain/core/messages/tool";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, START, END } from "@langchain/langgraph/web";
import { AIMessage, BaseMessage, SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AgentState } from "./state";

import { masterToolRegistry } from "./tools";
import { getEntireProtocolHistoryTool, getLatestMessagesFromSessionTool } from './tools/ascSacTools';

import { AgentStateSchema } from "./state";

// Importa todas as classes de LLM que suportamos
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { IndexedDBCheckpointer } from '../services/indexedDBCheckpointer';

const CONTEXT_INJECTOR = "contextInjector" as const;
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
    
    const contextMessage = new SystemMessage({
        content: `CONTEXTO: O histórico completo da conversa até este ponto é fornecido abaixo:\n\n---\n${history}\n---`,
    });
    console.log(`[Context Injector] Histórico completo injetado.`);
    return { messages: [contextMessage] };

  } else {
    console.log(`[Context Injector] Interação subsequente. Buscando novas mensagens...`);
    const newMessages = await getLatestMessagesFromSessionTool.invoke({
        sessionId: context.attendanceId,
        baseUrl: context.baseUrl,
        since_timestamp: state.last_processed_client_message_timestamp ?? undefined
    });

    if (newMessages && !newMessages.startsWith("No new messages")) {
        const contextMessage = new SystemMessage({
            content: `ATUALIZAÇÃO DE CONTEXTO: Novas mensagens desde sua última interação são fornecidas abaixo:\n\n---\n${newMessages}\n---`,
        });
        console.log(`[Context Injector] Novas mensagens injetadas.`);
        return { messages: [contextMessage] };
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
    .map(toolName => masterToolRegistry[toolName])
    .filter(Boolean);

  const llmWithTools = llm.bindTools!(availableTools);

  const systemMessageWithContext = new SystemMessage({
    content: `
      # Persona
      ${state.system_prompt}

      # Contextual Information
      - Current Date/Time: ${new Date().toISOString()}
      - Customer Service Protocol Number: ${state.protocol_number}
      - Current Attendance ID: ${state.attendance_id}
      - Customer Contact ID: ${state.contact_id}
      - Platform Base URL: ${state.base_url}

      # Instructions
      The relevant conversation history has been provided to you in a ToolMessage.
      Your primary goal is to use your persona and this provided context to answer the user's latest query.
      You can still use your available tools if you need to fetch NEW or DIFFERENT information that is not present in the provided history.
      Decide whether to call a tool or to respond directly to the user.
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