import { writable } from 'svelte/store';

export type ChatMessage = {
  id: string;
  type: "user" | "ai";
  content: string;
  isThinking?: boolean;
};

export interface SessionChatState {
  messages: ChatMessage[];
}

const { subscribe, update } = writable<Record<string, SessionChatState>>({});

function getOrCreateSession(sessionId: string): SessionChatState {
    let session: SessionChatState | undefined;
    update(store => {
        if (!store[sessionId]) {
            store[sessionId] = { messages: [] };
        }
        session = store[sessionId];
        return store;
    });
    return session!;
}

export const agentChatStore = {
  subscribe,
  
  // CORREÇÃO: A função agora aceita apenas o 'content' da mensagem do usuário como string.
  addMessage: (sessionId: string, userMessageContent: string) => {
    update(store => {
      const session = getOrCreateSession(sessionId);
      
      // Adiciona a mensagem do usuário usando o content recebido.
      session.messages.push({
        id: crypto.randomUUID(),
        type: 'user',
        content: userMessageContent 
      });
      
      // Adiciona o placeholder "pensando" da IA.
      session.messages.push({
        id: crypto.randomUUID(),
        type: 'ai',
        content: '',
        isThinking: true
      });

      return { ...store, [sessionId]: session };
    });
  },

  updateLastAiMessage: (sessionId: string, finalContent: string) => {
    update(store => {
        const session = store[sessionId];
        if (!session || session.messages.length === 0) return store;
        
        const lastMessageIndex = session.messages.length - 1;
        const lastMessage = session.messages[lastMessageIndex];

        if (lastMessage && lastMessage.type === 'ai') {
            lastMessage.content = finalContent;
            lastMessage.isThinking = false;
        }
        
        return { ...store, [sessionId]: session };
    });
  },

  clearSession: (sessionId: string) => {
    update(store => {
      delete store[sessionId];
      return store;
    });
    console.log(`AgentChatStore: Cleared session for ${sessionId}`);
  }
};