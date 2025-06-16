import { writable } from 'svelte/store';
import type { ActiveChatContext } from '../../content/types'; // Usaremos o tipo completo

export interface AssistantPopupState {
  isVisible: boolean;
  context: ActiveChatContext | null; // Armazena o contexto completo
  triggerButtonRect: DOMRect | null; 
}

const initialState: AssistantPopupState = {
  isVisible: false,
  context: null,
  triggerButtonRect: null,
};

const { subscribe, set, update } = writable<AssistantPopupState>(initialState);

export const assistantPopupStore = {
  subscribe,
  show: (data: { context: ActiveChatContext; triggerButtonRect: DOMRect }) => {
    update(state => ({ ...state, isVisible: true, context: data.context, triggerButtonRect: data.triggerButtonRect }));
  },
  hide: () => {
    // Mantém o contexto por um momento para transições de fechamento, se necessário, ou limpa tudo.
    // Para simplificar, vamos limpar tudo.
    set(initialState);
  },
};