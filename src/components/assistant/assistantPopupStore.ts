import { writable } from 'svelte/store';

export interface AssistantPopupState {
  isVisible: boolean;
  protocolNumber: string | null;
  // Outros dados de contexto podem ser adicionados aqui no futuro
}

const initialState: AssistantPopupState = {
  isVisible: false,
  protocolNumber: null,
};

const { subscribe, set, update } = writable<AssistantPopupState>(initialState);

export const assistantPopupStore = {
  subscribe,
  show: (data: { protocolNumber: string }) => {
    update(state => ({ ...state, ...data, isVisible: true }));
  },
  hide: () => {
    // Reset para o estado inicial para limpar todos os dados
    set(initialState);
  },
};