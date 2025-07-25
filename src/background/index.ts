// src/background/index.ts

import { get } from 'svelte/store';
import { HumanMessage, AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { Runnable } from "@langchain/core/runnables";

import { platformConfigStore , personasStore, aiProviderConfigStore, aiCredentialsStore, type Persona, type AiCredentials } from '../storage/stores';
import { PROVIDER_METADATA_MAP } from '../shared/providerMetadata';
import { agentTools, contextTools } from './agent/tools';
import { app as agentGraph } from './agent/graph';
import type { AgentState, StoredAgentState } from './agent/state';
import { IndexedDBCheckpointer } from './services/indexedDBCheckpointer';
import { listAvailableModels } from './services/model_lister';
import type { ModelType } from './services/model_lister/IModelLister';
import { createEmbeddingsInstance } from './services/embedding';

import Dexie from 'dexie';
import { Document } from '@langchain/core/documents';
import { IndexedDBVectorStore } from './services/IndexedDBVectorStore';


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
  ['getKnowledgeBaseDocuments', handleGetKnowledgeBaseDocuments],
  ['addDocumentToKnowledgeBase', handleAddDocumentToKnowledgeBase],
  ['deleteDocumentFromKnowledgeBase', handleDeleteDocumentFromKnowledgeBase]
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

// ======================================================================
// --- HANDLERS DA BASE DE CONHECIMENTO (KNOWLEDGE BASE) ---
// ======================================================================

/**
 * @handler handleGetKnowledgeBaseDocuments
 * @description Busca todos os documentos salvos no IndexedDB e os retorna para a UI.
 */
async function handleGetKnowledgeBaseDocuments(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  try {
    // Para uma simples leitura, podemos usar Dexie diretamente.
    const db = new Dexie('omnimax-rag-db');
    db.version(1).stores({ vectors: '++id, content' });
    const documents = await (db as any).vectors.toArray();
    sendResponse({ success: true, documents });
  } catch (error: any) {
    console.error('[Background] Error getting documents:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * @handler handleAddDocumentToKnowledgeBase
 * @description Recebe um novo documento da UI, gera seu embedding e o salva no VectorStore.
 */
async function handleAddDocumentToKnowledgeBase(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  try {
    const { document } = request;

    const providerConfig = get(aiProviderConfigStore);
    const credentials = get(aiCredentialsStore);
    const providerMeta = PROVIDER_METADATA_MAP.get(providerConfig.provider);

    if (!providerMeta) {
      throw new Error(`Provider metadata not found for "${providerConfig.provider}"`);
    }

    const apiKey = providerMeta.apiKeySettings?.credentialKey ? credentials[providerMeta.apiKeySettings.credentialKey] : undefined;
    const baseUrl = providerMeta.baseUrlSettings?.credentialKey ? credentials[providerMeta.baseUrlSettings.credentialKey] : undefined;

    // Esta chamada agora usa a função importada do nosso novo serviço.
    const embeddings = createEmbeddingsInstance(
      providerConfig.provider,
      providerConfig.embeddingModel,
      apiKey,
      baseUrl
    );

    const vectorStore = new IndexedDBVectorStore(embeddings, { dbName: 'omnimax-rag-db' });
    await vectorStore.addDocuments([new Document(document)]);

    sendResponse({ success: true });
  } catch (error: any) {
    console.error('[Background] Error adding document:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * @handler handleDeleteDocumentFromKnowledgeBase
 * @description Recebe um ID de documento e o remove do IndexedDB.
 */
async function handleDeleteDocumentFromKnowledgeBase(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  try {
    const { documentId } = request;
    if (typeof documentId !== 'number') {
      throw new Error("ID do documento inválido.");
    }

    // Para uma exclusão simples, Dexie direto é mais eficiente.
    const db = new Dexie('omnimax-rag-db');
    db.version(1).stores({ vectors: '++id, content' });
    await (db as any).vectors.delete(documentId);

    sendResponse({ success: true });
  } catch (error: any) {
    console.error('[Background] Error deleting document:', error);
    sendResponse({ success: false, error: error.message });
  }
}


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
 * @description Delegates the model listing logic to our dedicated service,
 * now including the type of model to fetch.
 */
function handleListAvailableModels(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  // Extrai o novo parâmetro 'modelType' da requisição.
  const { provider, credentials, modelType } = request as {
    provider: string,
    credentials: AiCredentials,
    modelType: ModelType
  };

  // Chama o serviço passando todos os três parâmetros.
  // Adicionamos 'chat' como um fallback para garantir retrocompatibilidade.
  listAvailableModels(provider, credentials, modelType || 'chat')
    .then(models => sendResponse({ success: true, models }))
    .catch(error => sendResponse({ success: false, error: error.message }));
}


// ======================================================================
// --- GERENCIAMENTO DO PAINEL LATERAL (SIDE PANEL) ---
// ======================================================================


/**
 * Atualiza o estado do painel lateral (Side Panel) com base na URL da aba.
 * Gerencia a abertura e fechamento automático com base no histórico da aba.
 * @param {chrome.tabs.Tab} tab - O objeto da aba a ser verificado.
 */
async function updateSidePanel(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.url || !tab.id) {
    return;
  }

  try {
    const url = new URL(tab.url);
    const tabId = tab.id;

    const allowedOrigin = get(platformConfigStore).allowedOrigin;

    const isAllowed = url.origin === allowedOrigin &&             // 1
                      url.pathname.startsWith('/Painel') && 
                      !url.pathname.startsWith('/Painel/login');  

    if (isAllowed) {
      // Habilita o painel lateral na origem e caminho corretos.
      console.log(`[SidePanel] Habilitando para a aba ${tabId} (Origem e Caminho válidos)`);
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: 'src/sidepanel/sidepanel.html',
        enabled: true
      });
    }
  } catch (error) {
    if (error instanceof TypeError) {
      console.warn(`[SidePanel] URL inválida ou interna ignorada: ${tab.url}`);
    } else {
      console.error(`[SidePanel] Erro ao atualizar o painel lateral para a aba ${tab.id}:`, error);
    }
  }
}

// --- Listeners para Eventos de Abas ---

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await updateSidePanel(tab);
  } catch (error) {
    console.error(`[onActivated] Erro ao obter informações da aba ${activeInfo.tabId}:`, error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab) { // Garante que a aba existe antes de prosseguir
    await updateSidePanel(tab);
  }
});


// Substitua a sua função initializeSidePanelState por esta
async function initializeSidePanelState(): Promise<void> {
  try {
    // PASSO 1: Define o estado padrão GLOBAL como desabilitado.
    // Isso garante que todas as abas comecem com o painel desabilitado.
    console.log('[SidePanel] Definindo estado global padrão como DESABILITADO.');
    // Chamamos setOptions SEM tabId para definir o padrão global.
    await chrome.sidePanel.setOptions({ enabled: false });
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

    // PASSO 2: Agora, verifica a aba ativa para habilitá-la SE necessário.
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      await updateSidePanel(activeTab);
    }
  } catch (error) {
    console.error('[Initializer] Erro ao configurar o estado inicial do painel lateral:', error);
  }
}

initializeSidePanelState();