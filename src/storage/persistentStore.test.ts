/**
 * @file src/storage/persistentStore.test.ts
 * @description Unit tests for the persistentStore utility.
 */
import { persistentStore } from './persistentStore';
import { get } from 'svelte/store';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
// Assumes chrome.storage.sync.set is spied upon by vitest-setup.ts or similar global setup.

const PROMPTS_STORE_KEY_TEST = 'omniMaxPromptsTest';
const BOOLEAN_STORE_KEY_TEST = 'testBooleanStore';

/**
 * @describe persistentStore
 * @description Test suite for the persistent Svelte store.
 */
describe('persistentStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Assumes your vitest-setup.ts already mocks chrome.storage.sync.get (e.g., to return {})
    // and chrome.storage.sync.set to be a spy/mock.
    // vi.resetAllMocks() might be called by a global setup or could be called here if needed.
  });

  afterEach(() => {
    vi.runOnlyPendingTimers(); // Ensure all pending timers (like debounce) are executed
    vi.useRealTimers();
  });

  /**
   * @describe Initialization and Basic Operations
   * @description Tests for store initialization, setting, and updating values.
   */
  describe('Initialization and Basic Operations', () => {
    it('should update value and call chrome.storage.sync.set on store.set() after debounce', async () => {
      const initialData = { prompt1: 'initial' };
      // To simulate an empty store or a specific initial state from storage for this test:
      // If global setup returns {}, and we want to simulate an empty store, no specific mock override is needed here for .get.
      // If we wanted to simulate a value already saved in storage:
      // (chrome.storage.sync.get as vi.Mock).mockResolvedValueOnce({ [PROMPTS_STORE_KEY_TEST]: somePreExistingData });

      const store = persistentStore(PROMPTS_STORE_KEY_TEST, initialData);

      // 1. Allow the store's async initialization (adapter.get()) to complete.
      // This processes the Promise chain for loading the initial value.
      await vi.advanceTimersByTimeAsync(0);

      const newValue = { prompt1: 'updated', prompt2: 'new' };
      store.set(newValue);

      expect(get(store)).toEqual(newValue); // Check the Svelte store's current value

      // 2. Advance timers to trigger the debounced save function.
      await vi.advanceTimersByTimeAsync(1000);

      // 3. Verify that chrome.storage.sync.set was called with the correct data.
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [PROMPTS_STORE_KEY_TEST]: newValue });
    });

    it('should update value and call chrome.storage.sync.set on store.update() after debounce', async () => {
      const initialData = { count: 0 };
      // Optional: Mock a specific pre-existing state if needed for this test
      // (chrome.storage.sync.get as vi.Mock).mockResolvedValueOnce({ [PROMPTS_STORE_KEY_TEST]: initialData });
      const store = persistentStore<{ count: number }>(PROMPTS_STORE_KEY_TEST, initialData);

      await vi.advanceTimersByTimeAsync(0); // Allow initialization

      store.update(s => ({ ...s, count: s.count + 1 }));
      const expectedValueAfterUpdate = { count: 1 };
      expect(get(store)).toEqual(expectedValueAfterUpdate);

      await vi.advanceTimersByTimeAsync(1000); // Trigger debounce

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [PROMPTS_STORE_KEY_TEST]: expectedValueAfterUpdate });
    });
  });

  /**
   * @describe persistentStore with Boolean values
   * @description Tests specifically for handling boolean values.
   */
  describe('persistentStore with Boolean values', () => {
    it('should set boolean value and call chrome.storage.sync.set after debounce', async () => {
      const initialBoolean = true;
      // Optional: Mock a specific pre-existing state
      // (chrome.storage.sync.get as vi.Mock).mockResolvedValueOnce({ [BOOLEAN_STORE_KEY_TEST]: initialBoolean });
      const store = persistentStore<boolean>(BOOLEAN_STORE_KEY_TEST, initialBoolean);

      await vi.advanceTimersByTimeAsync(0); // Allow initialization

      const newBooleanValue = false;
      store.set(newBooleanValue);
      expect(get(store)).toBe(newBooleanValue);

      await vi.advanceTimersByTimeAsync(1000); // Trigger debounce

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [BOOLEAN_STORE_KEY_TEST]: newBooleanValue });
    });
  });
});