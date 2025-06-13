import { writable } from 'svelte/store';

export interface SummaryPopupState {
  isVisible: boolean;
  triggerButtonRect: DOMRect | null;
  protocolNumber: string | null;
  contactId: string | null;
}

const initialState: SummaryPopupState = {
  isVisible: false,
  triggerButtonRect: null,
  protocolNumber: null,
  contactId: null,
};

const { subscribe, set, update } = writable<SummaryPopupState>(initialState);

export const summaryPopupStore = {
  subscribe,
  show: (data: { triggerButtonRect: DOMRect; protocolNumber: string; contactId: string }) => {
    update(state => ({ ...state, ...data, isVisible: true }));
  },
  /**
   * [FIX] Hides the popup by resetting the store to its complete initial state.
   * This prevents stale data (like old coordinates) from persisting.
   */
  hide: () => {
    set(initialState);
  },
};