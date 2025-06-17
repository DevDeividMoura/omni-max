import { get } from 'svelte/store';
import { HumanMessage } from "@langchain/core/messages";
import {
  personasStore,
  aiProviderConfigStore,
  aiCredentialsStore,
  type Persona
} from '../storage/stores';
import { PROVIDER_METADATA_MAP } from '../ai/providerMetadata';
import type { AgentState } from './agent/state';
import { app as agentGraph } from './agent/graph';
import { masterToolRegistry } from './agent/tools'; // Necessário para o teste de ferramentas

// Carrega as personas da store, como antes.
let availablePersonas: Persona[] = get(personasStore);
personasStore.subscribe(updatedPersonas => {
  availablePersonas = updatedPersonas;
});

// Add these interfaces at the top of your file or in a separate types file

interface EntireProtocolHistoryTool {
  invoke(args: {
    contactId: string;
    protocolNumber: string;
    baseUrl: string;
  }): Promise<any>;
  name: string;
}



interface LatestMessagesFromSessionTool {
  invoke(args: {
    sessionId: string;
    baseUrl: string
  }): Promise<any>;
  name: string;
}



// --- FUNÇÃO AUXILIAR PARA EXECUTAR FERRAMENTAS MANUALMENTE ---
async function executeToolCommand(toolName: string, context: any, sender: chrome.runtime.MessageSender) {
  console.log(`[Background] Slash command detected for tool: ${toolName}`);
  const tabId = sender.tab!.id!;
  const toolToExecute = masterToolRegistry[toolName];
  let reply: string;

  if (!sender.tab?.url) {
    reply = "```\nError: Could not determine the origin URL to run the tool.\n```";
  } else if (!toolToExecute) {
    reply = `\`\`\`\nError: Tool "${toolName}" not found in the registry.\n\`\`\``;
  } else {
    try {
      const baseUrl = new URL(sender.tab.url).origin;
      let result: any;

      // Lógica específica para os argumentos de cada ferramenta
      if (toolName === 'get_entire_protocol_history') {
        result = await (toolToExecute as EntireProtocolHistoryTool).invoke({ contactId: context.contactId, protocolNumber: context.protocolNumber, baseUrl });
      } else if (toolName === 'get_latest_messages_from_session') {
        result = await (toolToExecute as LatestMessagesFromSessionTool).invoke({ sessionId: context.attendanceId, baseUrl });
      } else {
        throw new Error(`No specific argument handler implemented for tool: ${toolName}`);
      }

      const formattedResult = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      reply = '```json\n' + formattedResult + '\n```';
    } catch (error: any) {
      reply = `\`\`\`\n❌ Error executing tool "${toolName}":\n\n${error.message}\n\`\`\``;
    }
  }

  chrome.tabs.sendMessage(tabId, { type: 'agentResponse', reply, context });
}

// --- FUNÇÃO AUXILIAR PARA INVOCAR O GRAFO DE AGENTE ---
async function invokeAgentGraph(request: any, sender: chrome.runtime.MessageSender) {
  const { context, query, personaId } = request;
  const tabId = sender.tab!.id!;

  try {
    const selectedPersona = availablePersonas.find(p => p.id === personaId) ?? availablePersonas[0];
    if (!selectedPersona) throw new Error("No personas configured.");

    const providerConfig = get(aiProviderConfigStore);
    const credentials = get(aiCredentialsStore);
    const providerMeta = PROVIDER_METADATA_MAP.get(providerConfig.provider);
    if (!providerMeta) throw new Error(`Provider metadata for "${providerConfig.provider}" not found.`);

    let apiKey, baseUrl;
    if (providerMeta.apiKeySettings?.credentialKey) {
      apiKey = credentials[providerMeta.apiKeySettings.credentialKey];
    }
    if (providerMeta.baseUrlSettings?.credentialKey) {
      baseUrl = credentials[providerMeta.baseUrlSettings.credentialKey];
    }

    console.log(`[Background] Invoking graph with ${providerConfig.provider}/${providerConfig.model}`);

    const initialState: AgentState = {
      messages: [new HumanMessage(query)],
      system_prompt: selectedPersona.prompt,
      available_tool_names: selectedPersona.tool_names,
      protocol_number: context.protocolNumber,
      attendance_id: context.attendanceId,
      contact_id: context.contactId,
      base_url: new URL(sender.tab!.url!).origin, // Passando a URL do contexto aqui
      last_processed_client_message_timestamp: null,
      provider: providerConfig.provider,
      model: providerConfig.model,
      api_key: apiKey,
      llm_base_url: baseUrl, // Renomeado para evitar conflito
    };

    const finalState = await agentGraph.invoke(initialState);
    const lastMessage = finalState.messages[finalState.messages.length - 1];
    const reply = lastMessage.content;

    chrome.tabs.sendMessage(tabId, {
      type: 'agentResponse',
      reply: typeof reply === 'string' ? reply : JSON.stringify(reply),
      context: context,
    });
  } catch (e: any) {
    console.error("[Background] Error invoking agent graph:", e);
    const errorMessage = `\`\`\`\n❌ An error occurred in the agent:\n\n${e.message}\n\`\`\``;
    chrome.tabs.sendMessage(tabId, { type: 'agentResponse', reply: errorMessage, context });
  }
}


// --- LISTENER PRINCIPAL (AGORA UM ROTEADOR SIMPLES) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'invokeAgent') {
    if (!sender.tab?.id) {
      console.error("Cannot process request without sender tab ID.");
      return;
    }

    const { query } = request;

    if (query.startsWith('/')) {
      const toolName = query.substring(1).trim();
      executeToolCommand(toolName, request.context, sender);
    } else {
      invokeAgentGraph(request, sender); // <- Chamada da função "callback"
    }

    return true; // Indica que a resposta será assíncrona
  }

  if (request.type === 'changePersona') {
    console.log("Persona change request received for:", request.context.protocolNumber);
  }
});