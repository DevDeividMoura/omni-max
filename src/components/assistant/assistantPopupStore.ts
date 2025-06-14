// src/components/assistant/assistantPopupStore.ts
import { writable } from 'svelte/store';

export interface AssistantPopupState {
  isVisible: boolean;
  protocolNumber: string | null;
  // RE-ADICIONADO: Contexto e posicionamento são cruciais
  contactId: string | null;
  triggerButtonRect: DOMRect | null; 
}

const initialState: AssistantPopupState = {
  isVisible: false,
  protocolNumber: null,
  contactId: null,
  triggerButtonRect: null,
};

const { subscribe, set, update } = writable<AssistantPopupState>(initialState);

export const assistantPopupStore = {
  subscribe,
  // FIX: O método show agora aceita o objeto completo
  show: (data: { protocolNumber: string; contactId: string; triggerButtonRect: DOMRect }) => {
    update(state => ({ ...state, ...data, isVisible: true }));
  },
  hide: () => {
    set(initialState);
  },
};