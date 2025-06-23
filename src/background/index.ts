// src/background/index.ts

import { get } from 'svelte/store';
import { HumanMessage, AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { Runnable } from "@langchain/core/runnables";

import { personasStore, aiProviderConfigStore, aiCredentialsStore, type Persona, type AiCredentials } from '../storage/stores';
import { PROVIDER_METADATA_MAP } from '../shared/providerMetadata';
import { agentTools, contextTools } from './agent/tools';
import { app as agentGraph } from './agent/graph';
import type { AgentState, StoredAgentState } from './agent/state';
import { IndexedDBCheckpointer } from './services/indexedDBCheckpointer';
import { listAvailableModels } from './services/model-lister';


// --- Inicialização e Configuração Global ---

const checkpointer = new IndexedDBCheckpointer();

// Configuração do LangSmith para tracing
setupLangSmith();

// Carrega e observa as personas da store do Svelte
let availablePersonas: Persona[] = [];
personasStore.subscribe(updatedPersonas => {
  availablePersonas = updatedPersonas;
  console.log('[Background] Personas updated:', availablePersonas.map(p => p.name));
});

// --- Tipos de Handlers para Mensagens ---

/**
 * @type MessageHandler
 * @description Define a assinatura para todas as funções que manipulam mensagens recebidas.
 */
type MessageHandler = (
  request: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => void | Promise<void>;

// --- Registro de Handlers ---

/**
 * @const {Map<string, MessageHandler>} messageHandlers
 * @description Um registro central que mapeia tipos de requisição para suas funções manipuladoras.
 * Este é o coração do nosso padrão de design desacoplado.
 */
const messageHandlers = new Map<string, MessageHandler>([
  ['getAgentState', handleGetAgentState],
  ['invokeAgent', handleInvokeAgent],
  ['changePersona', handleChangePersona],
  ['listAvailableModels', handleListAvailableModels],
]);

// --- Listener Principal (Dispatcher) ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`[Background] Message received: ${request.type}`);

  const handler = messageHandlers.get(request.type);

  if (handler) {
    // Encontrou um handler, executa-o.
    // O `return true` é essencial para indicar ao Chrome que a `sendResponse`
    // será chamada de forma assíncrona.
    Promise.resolve(handler(request, sender, sendResponse)).catch(error => {
      console.error(`[Background] Error in handler for "${request.type}":`, error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  // Se nenhum handler for encontrado, opcionalmente loga um aviso.
  console.warn(`[Background] No handler found for message type: "${request.type}"`);
  return false; // Indica que não haverá resposta assíncrona.
});

// ======================================================================
// --- Funções Manipuladoras (Handlers) ---
// Cada função agora é autônoma e registrada no mapa `messageHandlers`.
// ======================================================================

/**
 * @handler handleGetAgentState
 * @description Busca o estado salvo de uma sessão de chat no IndexedDB e o retorna para a UI.
 * É essencial para restaurar o chat ao recarregar a página.
 */
async function handleGetAgentState(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  if (!sender.tab?.id) return;

  const config: RunnableConfig = {
    configurable: { thread_id: request.context.attendanceId },
  };

  const tuple = await checkpointer.getTuple(config);
  console.log(`[Background] Fetched checkpoint for thread_id: ${request.context.attendanceId}`, tuple);

  if (tuple) {
    console.log(`[Background] Checkpoint found for thread_id: ${request.context.attendanceId}`);
    // O `getTuple` já retorna o checkpoint com `channel_values` pronto para uso.
    // A única coisa a garantir é que as mensagens dentro de channel_values estejam no formato correto para a UI.
    const messages = tuple.checkpoint.channel_values.messages as BaseMessage[];

    const stateForUi: Partial<StoredAgentState> = {
      ...tuple.checkpoint.channel_values,
      messages: messages.map((msg: BaseMessage) => msg.toDict()),
    };
    sendResponse({ success: true, state: stateForUi });
  } else {
    console.log(`[Background] No checkpoint found for thread_id: ${request.context.attendanceId}`);
    sendResponse({ success: false, state: null });
  }
}

/**
 * @handler handleInvokeAgent
 * @description Ponto de entrada para invocar o agente. Roteia para um comando de ferramenta (slash command)
 * ou para a lógica principal do agente de conversação.
 */
async function handleInvokeAgent(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  const { query } = request;
  if (query.startsWith('/')) {
    const command = query.substring(1).trim();
    if (command === 'clear') {
      return handleClearChatCommand(request.context, sender, sendResponse);
    } else {
      // Roteia para outros comandos de barra (slash commands)
      executeToolCommand(command, request.context, sender);
      sendResponse({ success: true, message: "Slash command invoked." });
      return;
    }
  } else {
    return invokeStatefulAgent(request, sender);
  }
}

/**
 * NOVO: Manipula o comando para limpar o histórico do chat.
 */
async function handleClearChatCommand(context: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  console.log(`[Background] Received /clear command for session: ${context.attendanceId}`);
  const config: RunnableConfig = {
    configurable: { thread_id: context.attendanceId },
  };

  try {
    await checkpointer.delete(config);

    // Em vez de usar sendResponse, enviamos uma mensagem para a UI,
    // o que se encaixa melhor no nosso padrão de eventos.
    chrome.tabs.sendMessage(tabId, {
      type: 'agentChatCleared',
      context: context
    });

    // Respondemos à chamada original para que ela não fique pendente.
    sendResponse({ success: true, message: "Chat history cleared." });

  } catch (error: any) {
    console.error("Failed to clear chat history:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * @handler handleChangePersona
 * @description Manipula a mudança de persona (atualmente apenas loga a ação).
 */
function handleChangePersona(request: any) {
  console.log(`[Background] Persona change request received for protocol: ${request.context.protocolNumber}. New persona ID: ${request.newPersonaId}`);
  // Aqui você pode adicionar lógica para atualizar o estado do agente com a nova persona, se necessário.
}

/**
 * @function executeToolCommand
 * @description Executa uma ferramenta diretamente via um slash command e envia o resultado de volta para a UI.
 */
async function executeToolCommand(toolName: string, context: any, sender: chrome.runtime.MessageSender) {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  console.log(`[Background] Executing slash command for tool: ${toolName}`);

  // CORREÇÃO: Criamos um registro combinado de todas as ferramentas disponíveis para depuração.
  const allAvailableTools: Record<string, Runnable> = { ...agentTools, ...contextTools };
  const toolToExecute = allAvailableTools[toolName];

  let reply: string;

  if (!sender.tab?.url) {
    reply = "```\nError: Could not determine origin URL.\n```";
  } else if (!toolToExecute) {
    reply = `\`\`\`\nError: Tool "${toolName}" not found.\n\`\`\``;
  } else {
    try {
      const baseUrl = new URL(sender.tab.url).origin;
      const result = await (toolToExecute as any).invoke({ ...context, baseUrl });
      reply = '```text\n' + result + '\n```';
    } catch (error: any) {
      reply = `\`\`\`\n❌ Error executing tool "${toolName}":\n\n${error.message}\n\`\`\``;
    }
  }

  chrome.tabs.sendMessage(tabId, {
    type: 'slashCommandResult',
    context: context,
    reply: reply
  });
}


/**
 * @function invokeStatefulAgent
 * @description Lida com a lógica principal de invocar o grafo LangGraph, gerenciando o estado e o streaming.
 */
async function invokeStatefulAgent(request: any, sender: chrome.runtime.MessageSender) {
  const { context, query, personaId } = request;
  const tabId = sender.tab!.id!;
  const baseUrl = new URL(sender.tab!.url!).origin;

  try {
    const config: RunnableConfig = {
      configurable: {
        thread_id: context.attendanceId,
        protocolNumber: context.protocolNumber,
        attendanceId: context.attendanceId,
        contactId: context.contactId,
        baseUrl: baseUrl,
      },
    };

    const thread = await checkpointer.get(config);
    let inputs: Partial<AgentState>;

    if (!thread) {
      console.log(`[Agent] Creating new state for attendance ${context.attendanceId}.`);
      const persona = availablePersonas.find(p => p.id === personaId) ?? availablePersonas[0];
      if (!persona) throw new Error("No persona configured.");
      inputs = createInitialState(persona, context, sender);
      inputs.messages = [new HumanMessage(query)];
    } else {
      console.log(`[Agent] Existing state found for attendance ${context.attendanceId}.`);
      inputs = { messages: [new HumanMessage(query)] };
    }

    console.log("[Agent] Invoking agent stream...");
    const eventStream = agentGraph.streamEvents(inputs, { ...config, version: "v2" });

    for await (const event of eventStream) {
      console.log(`[Agent] Event received: ${event.event}`, event.data);
      switch (event.event) {
        case "on_chat_model_stream": {
          const chunk = event.data.chunk as AIMessageChunk;
          if (typeof chunk.content === "string" && chunk.content.length > 0) {
            chrome.tabs.sendMessage(tabId, { type: "agentTokenChunk", token: chunk.content, messageId: chunk.id, context });
          }
          break;
        }
      }
    }

    chrome.tabs.sendMessage(tabId, { type: "agentStreamEnd", context });
  } catch (e: any) {
    console.error(`[Agent] Error invoking agent for attendance ${context.attendanceId}:`, e);
    chrome.tabs.sendMessage(tabId, { type: "agentError", error: e.message, context });
  }
}

// --- Funções Auxiliares (sem alterações) ---

function createInitialState(persona: Persona, context: any, sender: chrome.runtime.MessageSender): AgentState {
  const providerConfig = get(aiProviderConfigStore);
  const credentials = get(aiCredentialsStore);
  const providerMeta = PROVIDER_METADATA_MAP.get(providerConfig.provider)!;

  let apiKey: string | undefined, baseUrl: string | undefined;
  if (providerMeta.apiKeySettings?.credentialKey) apiKey = credentials[providerMeta.apiKeySettings.credentialKey];
  if (providerMeta.baseUrlSettings?.credentialKey) baseUrl = credentials[providerMeta.baseUrlSettings.credentialKey];

  return {
    messages: [],
    system_prompt: persona.prompt,
    available_tool_names: persona.tool_names,
    protocol_number: context.protocolNumber,
    attendance_id: context.attendanceId,
    contact_id: context.contactId,
    base_url: new URL(sender.tab!.url!).origin,
    last_processed_client_message_timestamp: null,
    provider: providerConfig.provider,
    model: providerConfig.model,
    api_key: apiKey,
    llm_base_url: baseUrl,
    persona_id: persona.id,
  };
}

function setupLangSmith() {
  const LANGSMITH_API_KEY = "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";
  const LANGSMITH_PROJECT = "omni-max-assistant";
  const LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";

  if (typeof globalThis.process === 'undefined') {
    (globalThis as any).process = { env: {} };
  }
  globalThis.process.env.LANGCHAIN_TRACING_V2 = "true"; // Correção para V2
  globalThis.process.env.LANGCHAIN_ENDPOINT = LANGSMITH_ENDPOINT;
  globalThis.process.env.LANGCHAIN_API_KEY = LANGSMITH_API_KEY;
  globalThis.process.env.LANGCHAIN_PROJECT = LANGSMITH_PROJECT;

  console.log(`[LangSmith] Tracing is configured for project: "${LANGSMITH_PROJECT}"`);
}

/**
 * @handler handleListAvailableModels
 * @description Delegates the model listing logic to our dedicated service.
 */
function handleListAvailableModels(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  const { provider, credentials } = request as { provider: string, credentials: AiCredentials };
  listAvailableModels(provider, credentials)
    .then(models => sendResponse({ success: true, models }))
    .catch(error => sendResponse({ success: false, error: error.message }));
}