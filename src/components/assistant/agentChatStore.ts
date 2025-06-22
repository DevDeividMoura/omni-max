// agentChatStore.ts - VERSÃO REVISADA E CORRIGIDA

import { writable } from 'svelte/store';
import type { AgentState } from '../../background/agent/state';

export type ChatMessage = {
  id: string;
  type: "user" | "ai";
  content: string; // Sempre será HTML renderizado
  isThinking?: boolean;
  finalState?: AgentState; 
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
  
  addUserMessage: (sessionId: string, userMessageContent: string) => {
    update(store => {
      const session = getOrCreateSession(store, sessionId);
      session.messages.push({
        id: crypto.randomUUID(),
        type: 'user',
        content: userMessageContent,
        isThinking: false,
      });
      return { ...store, [sessionId]: session };
    });
  },

  addEmptyAiMessage: (sessionId: string) => {
    update(store => {
      const session = getOrCreateSession(store, sessionId);
      session.messages.push({
        id: `temp-${crypto.randomUUID()}`, // ID sempre temporário
        type: 'ai',
        content: '', // Conteúdo começa vazio
        isThinking: true,
      });
      return { ...store, [sessionId]: session };
    });
  },
  
  // Esta função agora é a ÚNICA que atualiza o conteúdo de uma mensagem de IA
  updateLastAiMessage: (sessionId: string, newContent: string, messageId?: string) => {
    update(store => {
      const session = store[sessionId];
      if (!session || session.messages.length === 0) return store;
      
      const lastMessage = session.messages[session.messages.length - 1];

      if (lastMessage && lastMessage.type === 'ai') {
        // Na primeira atualização, remove o "pensando" e define o conteúdo
        if (lastMessage.isThinking) {
            lastMessage.isThinking = false;
        }
        lastMessage.content = newContent; // Substitui completamente o conteúdo com a versão mais recente
        if (messageId && lastMessage.id.startsWith('temp-')) {
          lastMessage.id = messageId; // Atualiza para o ID real
        }
      }
      return { ...store, [sessionId]: session };
    });
  },

  finalizeLastAiMessage: (sessionId: string) => {
     update(store => {
        const session = store[sessionId];
        if (!session || session.messages.length === 0) return store;
        const lastMessage = session.messages[session.messages.length - 1];
        if (lastMessage && lastMessage.type === 'ai') {
           lastMessage.isThinking = false;
        }
        return { ...store, [sessionId]: session };
     });
  },
  
  clearSession: (sessionId: string) => {
    update(store => {
      delete store[sessionId];
      return { ...store };
    });
    console.log(`AgentChatStore: Cleared session for ${sessionId}`);
  }
};