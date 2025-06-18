import { get } from 'svelte/store';
import { 
  AIMessage, 
  HumanMessage, 
  SystemMessage, 
  ToolMessage,
  BaseMessage,
  mapChatMessagesToStoredMessages, // <-- IMPORTAR
  mapStoredMessagesToChatMessages  // <-- IMPORTAR
} from "@langchain/core/messages";
import {
  personasStore,
  aiProviderConfigStore,
  aiCredentialsStore,
  type Persona
} from '../storage/stores';
import { PROVIDER_METADATA_MAP } from '../ai/providerMetadata';
import { masterToolRegistry } from './agent/tools';
import { getAgentSession, saveAgentSession, type AgentSessionState } from './services/agentDataManager'; // Importa o tipo correto
import { app as agentGraph } from './agent/graph';
import type { AgentState } from './agent/state';

// Carrega as personas
let availablePersonas: Persona[] = get(personasStore);
personasStore.subscribe(updatedPersonas => {
  availablePersonas = updatedPersonas;
});

// Listener principal
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
      invokeStatefulAgent(request, sender); // <- Chamada da função "callback"
    }

    return true; // Indica que a resposta será assíncrona
  }

  if (request.type === 'changePersona') {
    console.log("Persona change request received for:", request.context.protocolNumber);
  }
});

// CORREÇÃO #1: Adotando sua sugestão de type casting para o invoke da ferramenta.
async function executeToolCommand(toolName: string, context: any, sender: chrome.runtime.MessageSender) {
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
  chrome.tabs.sendMessage(tabId, { type: 'agentResponse', reply, context });
}

async function invokeStatefulAgent(request: any, sender: chrome.runtime.MessageSender) {
  const { context, query, personaId } = request;
  const tabId = sender.tab!.id!;

  try {
    const sessionData = await getAgentSession(context.attendanceId);
    let agentState: AgentState;

    if (sessionData && sessionData.agentGraphState) {
      console.log(`[Background] Existing state found for attendance ${context.attendanceId}.`);
      const storedState = sessionData.agentGraphState;

      // CORREÇÃO: Usa a função oficial da LangChain para "reidratar" as mensagens.
      console.log("[Background] Deserializing messages using mapStoredMessagesToChatMessages...");
       agentState = {
        ...storedState,
        messages: mapStoredMessagesToChatMessages(storedState.messages),
      };

    } else {
      // ... (lógica para criar estado inicial não muda) ...
      console.log(`[Background] No state for ${context.attendanceId}. Creating new.`);
      const firstPersona = availablePersonas.find(p => p.id === personaId) ?? availablePersonas[0];
      if (!firstPersona) throw new Error("No personas configured.");
      agentState = createInitialState(firstPersona, context, sender);
    }

    if (personaId !== agentState.persona_id) {
      // ... (lógica de mudança de persona não muda) ...
      console.log(`[Background] Persona changed from ${agentState.persona_id} to ${personaId}.`);
      const newPersona = availablePersonas.find(p => p.id === personaId);
      if (newPersona) {
        agentState = updatePersonaInState(agentState, newPersona);
      }
    }
    
    agentState.messages.push(new HumanMessage(query));

    const finalState = await agentGraph.invoke(agentState);

    // CORREÇÃO: Antes de salvar, serializamos as mensagens para um formato seguro.
    const finalStateToSave = {
        ...finalState,
        messages: mapChatMessagesToStoredMessages(finalState.messages),
    };

    const newSessionData: AgentSessionState = {
        agentGraphState: finalStateToSave,
        lastProcessedClientMessageTimestamp: Date.now()
    };
    await saveAgentSession(context.attendanceId, newSessionData);

    // ... (lógica para enviar resposta não muda) ...
    const lastMessage = finalState.messages[finalState.messages.length - 1];
    chrome.tabs.sendMessage(tabId, {
      type: 'agentResponse',
      reply: typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content),
      context: context,
    });
    
  } catch (e: any) {
    // ... (lógica de erro não muda) ...
    console.error("[Background] Error in stateful agent invocation:", e);
    const errorMessage = `\`\`\`\n❌ An error occurred:\n\n${e.message}\n\`\`\``;
    chrome.tabs.sendMessage(tabId, { type: 'agentResponse', reply: errorMessage, context });
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