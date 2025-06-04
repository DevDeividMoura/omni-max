// Em seu arquivo persistentStore.test.ts

import { persistentStore } from './persistentStore'; // Ajuste o caminho se necessário
import { get } from 'svelte/store';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
// Presume-se que chrome.storage.sync.set já está sendo espiado pelo vitest-setup.ts

const PROMPTS_STORE_KEY_TEST = 'omniMaxPromptsTest'; // Use uma chave diferente para evitar conflitos se necessário
const BOOLEAN_STORE_KEY_TEST = 'testBooleanStore';

describe('persistentStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Seu vitest-setup.ts já deve mockar chrome.storage.sync.get para retornar {}
    // e chrome.storage.sync.set para ser um spy.
    // vi.resetAllMocks() é chamado pelo setup global ou aqui se necessário.
  });

  afterEach(() => {
    vi.runOnlyPendingTimers(); // Garante que todos os timers pendentes sejam executados
    vi.useRealTimers();
  });

  describe('Initialization and Basic Operations', () => {
    it('should update value and call chrome.storage.sync.set on store.set()', async () => {
      const initialData = { prompt1: 'initial' };
      // Mock chrome.storage.sync.get para retornar o estado inicial desejado para este teste específico
      // Se o setup global já retorna {}, e queremos simular um store vazio, está ok.
      // Se quiséssemos simular um valor já salvo, faríamos:
      // vi.mocked(chrome.storage.sync.get).mockResolvedValueOnce({ [PROMPTS_STORE_KEY_TEST]: initialData });

      const store = persistentStore(PROMPTS_STORE_KEY_TEST, initialData);

      // 1. Aguardar a store ser inicializada (adapter.get() resolver e initialized = true)
      await vi.advanceTimersByTimeAsync(0); // Processa a Promise da inicialização

      const newValue = { prompt1: 'updated', prompt2: 'new' }; // Certifique-se que é diferente do initialData
      store.set(newValue);

      expect(get(store)).toEqual(newValue); // Verifica o valor na store Svelte

      // 2. Avançar o timer para o debounce
      await vi.advanceTimersByTimeAsync(1000); // Para disparar a função 'save'

      // 3. Verificar se chrome.storage.sync.set foi chamado
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [PROMPTS_STORE_KEY_TEST]: newValue });
    });

    it('should update value and call chrome.storage.sync.set on store.update()', async () => {
      const initialData = { count: 0 };
      // vi.mocked(chrome.storage.sync.get).mockResolvedValueOnce({ [PROMPTS_STORE_KEY_TEST]: initialData }); // Se necessário
      const store = persistentStore<{ count: number }>(PROMPTS_STORE_KEY_TEST, initialData);

      await vi.advanceTimersByTimeAsync(0); // Inicialização

      store.update(s => ({ ...s, count: s.count + 1 }));
      const expectedValue = { count: 1 }; // Diferente de initialData
      expect(get(store)).toEqual(expectedValue);

      await vi.advanceTimersByTimeAsync(1000); // Debounce

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [PROMPTS_STORE_KEY_TEST]: expectedValue });
    });
  });

  describe('persistentStore with Boolean values', () => {
    it('should set boolean value and call chrome.storage.sync.set', async () => {
      const initialBoolean = true;
      // vi.mocked(chrome.storage.sync.get).mockResolvedValueOnce({ [BOOLEAN_STORE_KEY_TEST]: initialBoolean });
      const store = persistentStore<boolean>(BOOLEAN_STORE_KEY_TEST, initialBoolean);

      await vi.advanceTimersByTimeAsync(0); // Inicialização

      const newBooleanValue = false; // Diferente de initialBoolean
      store.set(newBooleanValue);
      expect(get(store)).toBe(newBooleanValue);

      await vi.advanceTimersByTimeAsync(1000); // Debounce

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [BOOLEAN_STORE_KEY_TEST]: newBooleanValue });
    });
  });
});