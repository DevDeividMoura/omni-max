// src/components/assistant/agentChatStore.ts

import { writable } from 'svelte/store';
import type { StoredMessage } from "@langchain/core/messages";

export type ChatMessage = {
  id: string;
  type: "user" | "ai";
  content: string; 
  isThinking?: boolean;
  toolCalls?: any[];
};

export interface SessionChatState {
  messages: ChatMessage[];
}

const { subscribe, update } = writable<Record<string, SessionChatState>>({});

function getOrCreateSession(store: Record<string, SessionChatState>, sessionId: string): SessionChatState {
  if (!store[sessionId]) {
    store[sessionId] = { messages: [] };
  }
  return store[sessionId];
}

export const agentChatStore = {
  subscribe,

  setInitialState: (sessionId: string, initialState: any) => {
    update((store) => {
      const session = getOrCreateSession(store, sessionId);
      
      // CORREÇÃO: Mapear a estrutura correta do StoredMessage para a ChatMessage da UI.
      // Agora acessamos `msg.data.id` e `msg.data.content`.
      session.messages = initialState.messages
        .filter((msg: StoredMessage) => msg.type === "human" || msg.type === "ai")
        .map((msg: StoredMessage) => ({
          id: msg.data.id!,
          type: msg.type === "human" ? "user" : "ai",
          content: msg.data.content as string,
          isThinking: false,
          toolCalls: msg.data.additional_kwargs?.tool_calls ?? [],
        }));
      
      console.log(`[AgentChatStore] Hydrated session ${sessionId} with ${session.messages.length} messages.`);
      return { ...store, [sessionId]: session };
    });
  },

  // As outras funções permanecem como na sugestão anterior, pois já estão corretas.
  addUserMessage: (sessionId: string, userMessageContent: string) => {
    update(store => {
      const session = getOrCreateSession(store, sessionId);
      session.messages.push({
        id: crypto.randomUUID(),
        type: 'user',
        content: userMessageContent,
        isThinking: false,
      });
      console.log(`[AgentChatStore] Added user message to session ${sessionId}: ${userMessageContent}`);
      return { ...store, [sessionId]: session };
    });
  },

  addEmptyAiMessage: (sessionId: string): string => {
    const tempId = `temp-ai-${crypto.randomUUID()}`;
    update(store => {
      const session = getOrCreateSession(store, sessionId);
      session.messages.push({
        id: tempId,
        type: 'ai',
        content: '',
        isThinking: true,
      });
      console.log(`[AgentChatStore] Added empty AI message to session ${sessionId} with temp ID: ${tempId}`);
      return { ...store, [sessionId]: session };
    });
    return tempId;
  },

  appendTokenToLastAiMessage: (sessionId: string, token: string, messageId: string) => {
    update(store => {
      const session = store[sessionId];
      if (!session || session.messages.length === 0) return store;
      const lastMessage = session.messages[session.messages.length - 1];

      if (lastMessage && lastMessage.type === 'ai') {
        if (lastMessage.isThinking) {
          lastMessage.isThinking = false;
          if(messageId) lastMessage.id = messageId; 
        }
        lastMessage.content += token;
      }
      console.log(`[AgentChatStore] Appended token to last AI message in session ${sessionId}: ${token}`);
      return { ...store };
    });
  },

  finalizeLastAiMessage: (sessionId: string) => {
     update(store => {
        const session = store[sessionId];
        if (!session || session.messages.length === 0) return store;
        const lastMessage = session.messages[session.messages.length - 1];
        if (lastMessage && lastMessage.type === 'ai' && lastMessage.isThinking) {
          lastMessage.isThinking = false;
          if (lastMessage.content === "") {
            session.messages.pop();
          }
        }
        console.log(`[AgentChatStore] Finalized last AI message in session ${sessionId}`);
        return { ...store };
      });
  },
  
  /**
   * NOVO: Remove completamente o estado de uma sessão da store da UI.
   * @param sessionId O ID da sessão a ser limpa.
   */
  clearSession: (sessionId: string) => {
    update(store => {
      if (store[sessionId]) {
        delete store[sessionId];
        console.log(`[AgentChatStore] Cleared UI state for session ${sessionId}`);
      }
      // Retorna uma nova cópia do objeto para garantir a reatividade do Svelte.
      return { ...store };
    });
  },
};