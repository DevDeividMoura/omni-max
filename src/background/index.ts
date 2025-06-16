/**
 * @file src/background/index.ts
 * @description The main service worker for the Omni Max extension.
 * It listens for messages from the UI, orchestrates the AI agent's logic,
 * and sends back responses.
 */

import { personasStore, type Persona } from '../storage/stores';
import { get } from 'svelte/store';
import { getAgentSession, saveAgentSession } from './services/agentDataManager'; // Assumindo que o data manager está aqui

// Mantém uma cópia em memória da lista de personas para acesso rápido.
let availablePersonas: Persona[] = [];

// Inscreve-se na store para atualizar a lista sempre que o usuário fizer alterações no popup.
personasStore.subscribe(updatedPersonas => {
  console.log('Service Worker: Personas list updated.', updatedPersonas);
  availablePersonas = updatedPersonas;
});

// Inicializa a primeira carga.
availablePersonas = get(personasStore);

/**
 * The main message listener for the extension.
 * Handles requests from the content scripts and popup.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service Worker: Received message from UI:', request);

  // Garante que a mensagem veio de uma aba válida
  if (!sender.tab?.id) {
    console.error("Service Worker: Message received without a valid sender tab.");
    return;
  }
  const tabId = sender.tab.id;

  // --- Handler para invocar o agente com uma query ---
  if (request.type === 'invokeAgent') {
    (async () => {
      const { context, query, personaId } = request;
      const persona = availablePersonas.find(p => p.id === personaId) ?? availablePersonas[0];

      // MOCK: Simula o carregamento do estado da sessão
      const sessionState = await getAgentSession(context.protocolNumber);
      console.log(`Service Worker: Invoking agent for protocol ${context.protocolNumber} with persona "${persona?.name}"`);

      // MOCK: Simula um tempo de processamento da IA (1.5 segundos)
      setTimeout(() => {
        let mockReply = `Como um assistente de **${persona?.name}**, eu analisei sua pergunta sobre "${query}".`;

        // MOCK: Gera respostas diferentes com base na query
        if (query.toLowerCase().includes('resumo')) {
          mockReply = `### Resumo do Atendimento - Protocolo ${context.protocolNumber}\n\nCom base na persona **${persona.name}**, aqui estão os pontos principais:\n\n* **Problema Principal:** O cliente relatou um problema com a entrega do pedido #12345.\n* **Ação Tomada:** O atendente verificou o status e abriu um chamado com a transportadora.\n* **Próximo Passo:** Aguardar o retorno da transportadora em até 48 horas.`;
        } else if (query.toLowerCase().includes('extrair ações')) {
            mockReply = `### Ações Necessárias\n\n1.  **[Pendente]** Notificar o cliente assim que a transportadora responder.\n2.  **[Concluído]** Registrar o protocolo de contato com a transportadora.\n3.  **[Sugestão]** Oferecer um cupom de desconto pela inconveniência.`;
        }

        // MOCK: Simula a persistência do novo estado da conversa
        console.log(`Service Worker: Mock saving state for protocol ${context.protocolNumber}`);
        // await saveAgentSession(context.protocolNumber, newSessionState);
        
        // Envia a resposta de volta para a aba que a solicitou
        chrome.tabs.sendMessage(tabId, {
            type: 'agentResponse',
            reply: mockReply,
            context: context,
        });

      }, 1500);
    })();
    
    // Indica que a resposta será enviada de forma assíncrona.
    // O retorno de `sendResponse` não será usado aqui, pois usamos `tabs.sendMessage`.
    return true; 
  }

  // --- Handler para mudança de persona ---
  if (request.type === 'changePersona') {
    (async () => {
      const { context, newPersonaId } = request;
      const newPersona = availablePersonas.find(p => p.id === newPersonaId);

      if (newPersona) {
        console.log(`Service Worker: Changing persona for protocol ${context.protocolNumber} to "${newPersona.name}"`);
        // MOCK: Aqui é onde salvaríamos a mudança de estado na sessão do agente
        // Ex: Adicionar uma nova SystemMessage ao histórico do chat.
        // await saveAgentSession(...)
        
        // Retornamos uma confirmação simples para a chamada original
        sendResponse({ success: true, message: `Persona changed to ${newPersona.name}` });
      } else {
        sendResponse({ success: false, error: "Persona not found" });
      }
    })();

    return true; // Indica resposta assíncrona
  }
});

console.log('Omni Max Service Worker has started.');