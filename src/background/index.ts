import { get } from 'svelte/store';
import {  
  HumanMessage, 
  SystemMessage, 
} from "@langchain/core/messages";
import {
  personasStore,
  aiProviderConfigStore,
  aiCredentialsStore,
  type Persona
} from '../storage/stores';
import { PROVIDER_METADATA_MAP } from '../ai/providerMetadata';
import { masterToolRegistry } from './agent/tools';

import type { AgentState } from './agent/state';

import { IndexedDBCheckpointer } from './services/indexedDBCheckpointer';
import { app as agentGraph } from './agent/graph';
import type { RunnableConfig } from "@langchain/core/runnables";

import type { AIMessageChunk } from "@langchain/core/messages";

const checkpointer = new IndexedDBCheckpointer();

// Carrega as personas
let availablePersonas: Persona[] = get(personasStore);
personasStore.subscribe(updatedPersonas => {
  availablePersonas = updatedPersonas;
});

// Listener principal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'invokeAgent') {
    if (!sender.tab?.id) {
      sendResponse({ success: false, error: "Cannot process request without sender tab ID."  });
      return false; // Retorna false para indicar que não haverá resposta assíncrona
    }

    const { query } = request;

    if (query.startsWith('/')) {
      const toolName = query.substring(1).trim();
      executeToolCommand(toolName, request.context, sender, sendResponse);
    } else {
      invokeStatefulAgent(request, sender); // <- Chamada da função "callback"
    }
    return true; // Indica que a resposta será assíncrona
  }

  if (request.type === 'changePersona') {
    console.log("Persona change request received for:", request.context.protocolNumber);
  }
  return false;
});

// CORREÇÃO #1: Adotando sua sugestão de type casting para o invoke da ferramenta.
async function executeToolCommand(toolName: string, context: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  console.log(`[Background] Slash command for tool: ${toolName}`);
  const tabId = sender.tab!.id!;
  const toolToExecute = masterToolRegistry[toolName];
  let reply: string;

  if (!sender.tab?.url) {
    reply = "```\nError: Could not determine origin URL.\n```";
  } else if (!toolToExecute) {
    reply = `\`\`\`\nError: Tool "${toolName}" not found.\n\`\`\``;
  } else {
    try {
      const baseUrl = new URL(sender.tab.url).origin;
      let result: any;
      
      // Usando o type casting que você sugeriu para resolver o erro de tipo
      if (toolName === 'get_entire_protocol_history') {
        result = await (toolToExecute as any).invoke({ contactId: context.contactId, protocolNumber: context.protocolNumber, baseUrl });
      } else if (toolName === 'get_latest_messages_from_session') {
        result = await (toolToExecute as any).invoke({ sessionId: context.attendanceId, baseUrl });
      } else {
        throw new Error(`No handler for tool: ${toolName}`);
      }

      reply = '```json\n' + JSON.stringify(result, null, 2) + '\n```';
    } catch (error: any) {
      reply = `\`\`\`\n❌ Error executing tool "${toolName}":\n\n${error.message}\n\`\`\``;
    }
  }
  sendResponse({ success: true, reply: reply });
}

async function invokeStatefulAgent(request: any, sender: chrome.runtime.MessageSender) {
  const { context, query, personaId } = request;
  const tabId = sender.tab!.id!;
  const baseUrl = new URL(sender.tab!.url!).origin;

  try {
    // 1. Crie o objeto de configuração. Ele é a chave para a memória.
    const config: RunnableConfig = {
      configurable: {
        thread_id: context.attendanceId,
        // Passamos todo o contexto aqui para que os nós possam usá-lo
        protocolNumber: context.protocolNumber,
        attendanceId: context.attendanceId,
        contactId: context.contactId,
        baseUrl: baseUrl,
      },
    };
    
    // 2. Verifique se é a primeira vez para injetar o estado inicial.
    // Usamos o próprio checkpointer para isso.
    const threadState = await checkpointer.get(config);

    let inputs: Partial<AgentState>;

    if (!threadState) {
      console.log(`[Background] Criando novo estado para attendance ${context.attendanceId}.`);
      const firstPersona = availablePersonas.find(p => p.id === personaId) ?? availablePersonas[0];
      if (!firstPersona) throw new Error("Nenhuma persona configurada.");
      
      // Na primeira vez, passamos o estado inicial completo.
      inputs = createInitialState(firstPersona, context, sender);
      inputs.messages = [new HumanMessage(query)]; // Adiciona a primeira query
    } else {
      console.log(`[Background] Estado existente encontrado para attendance ${context.attendanceId}.`);
      // Nas vezes seguintes, passamos APENAS a nova mensagem.
      inputs = {
        messages: [new HumanMessage(query)],
      };
    }
    
    // 3. Use .stream() para uma UI reativa!
    console.log("[Background] Invoking agent stream...");
    const eventStream = await agentGraph.streamEvents(inputs, { ...config, version: "v2" });

    for await (const event of eventStream) {
      // Filtramos pelos eventos que nos interessam
      switch (event.event) {
        case "on_llm_stream": {
          const chunk = event.data.chunk as AIMessageChunk;
          if (typeof chunk.content === "string" && chunk.content.length > 0) {
            // Envia cada token para a UI
            chrome.tabs.sendMessage(tabId, {
              type: 'agentTokenChunk',
              token: chunk.content,
              messageId: chunk.id, // Envia o ID para consistência
              context
            });
          }
          break;
        }
        case "on_tool_end": {
            // Informa a UI sobre o resultado da ferramenta
            chrome.tabs.sendMessage(tabId, {
                type: 'agentToolEnd',
                toolOutput: event.data.output,
                toolName: event.name,
                context
            });
            break;
        }
      }
    }

    // Envia o sinal de fim para a UI
    chrome.tabs.sendMessage(tabId, {
      type: 'agentStreamEnd',
      context
    });

  } catch (e: any) {
    chrome.tabs.sendMessage(tabId, {
      type: 'agentError',
      error: e.message,
      context
    });
  }
}

/**
 * Cria o estado inicial para uma nova sessão de chat.
 */
function createInitialState(persona: Persona, context: any, sender: chrome.runtime.MessageSender): AgentState {
  const providerConfig = get(aiProviderConfigStore);
  const credentials = get(aiCredentialsStore);
  const providerMeta = PROVIDER_METADATA_MAP.get(providerConfig.provider)!;
  
  let apiKey: string | undefined, baseUrl: string | undefined;
  if (providerMeta.apiKeySettings?.credentialKey) apiKey = credentials[providerMeta.apiKeySettings.credentialKey];
  if (providerMeta.baseUrlSettings?.credentialKey) baseUrl = credentials[providerMeta.baseUrlSettings.credentialKey];

  return {
    messages: [], // Começa vazio, a primeira mensagem será adicionada depois
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

/**
 * Atualiza um estado existente com uma nova persona.
 */
function updatePersonaInState(currentState: AgentState, newPersona: Persona): AgentState {
  const systemMessage = new SystemMessage(
    `Persona updated. You will now act as: "${newPersona.name}". New instructions: ${newPersona.prompt}`
  );

  return {
    ...currentState,
    messages: [...currentState.messages, systemMessage], // Adiciona a notificação de mudança
    system_prompt: newPersona.prompt,
    available_tool_names: newPersona.tool_names,
    persona_id: newPersona.id,
  };
}

// ======================================================================
// NOVO: Configuração do LangSmith
// ======================================================================

function setupLangSmith() {
  // ATENÇÃO: Método inseguro para demonstração.
  // Nunca suba chaves de API diretamente no código para um repositório.
  const LANGSMITH_API_KEY = "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"; // <--- COLE SUA CHAVE AQUI
  const LANGSMITH_PROJECT = "omni-max-assistant";
  const LANGSMITH_ENDPOINT="https://api.smith.langchain.com"

  // LangChain busca essas variáveis no escopo global (process.env)
  // Mesmo em um service worker, podemos definir essas propriedades para que a biblioteca as encontre.
  if (typeof globalThis.process === 'undefined') {
    (globalThis as any).process = { env: {} };
  }
  
  globalThis.process.env.LANGCHAIN_TRACING = "true";
  globalThis.process.env.LANGCHAIN_ENDPOINT = LANGSMITH_ENDPOINT;
  globalThis.process.env.LANGCHAIN_API_KEY = LANGSMITH_API_KEY;
  globalThis.process.env.LANGCHAIN_PROJECT = LANGSMITH_PROJECT;

  console.log(`[LangSmith] Tracing is configured for project: "${LANGSMITH_PROJECT}"`);
}

// Chame a configuração ANTES de qualquer outra coisa
setupLangSmith();