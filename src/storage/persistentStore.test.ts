/**
 * @file storage.test.ts
 * @description Unit tests for the persistent Svelte stores defined in storage.ts,
 * specifically testing the `persistentStore` factory function using `vitest-chrome`
 * for mocking Chrome extension APIs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chrome } from 'vitest-chrome';
import { get } from 'svelte/store';
import { persistentStore, type PromptsConfig } from '.'; // Assuming PromptsConfig is exported or used appropriately
// Note: 'chrome' is globally available and mocked by 'vitest-chrome' via 'vitest-setup.ts'.

/**
 * Default initial value for PromptsConfig, used across multiple tests.
 * This mirrors the initial value defined in `storage.ts` for consistency in testing.
 */
const DEFAULT_PROMPTS_VALUE: PromptsConfig = {
  summaryPrompt: 'Resuma esta conversa de atendimento ao cliente de forma concisa, destacando o problema principal e a resolução.',
  improvementPrompt: 'Revise a seguinte resposta para um cliente, tornando-a mais clara, empática e profissional, mantendo o significado original:',
};

/** Key used for testing persistentStore with PromptsConfig. */
const PROMPTS_STORE_KEY = 'omniMaxPromptsTest'; // Changed key to avoid collision with actual store if tests run in mixed env

describe('persistentStore', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // `vi.resetAllMocks()` is typically called in `vitest-setup.ts` by `vitest-chrome`.
    // Spy on console.warn to verify warnings and suppress them during tests.
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.warn implementation after each test.
    consoleWarnSpy.mockRestore();
  });

  // --- Test Suite for Initialization and Basic Store Operations ---
  describe('Initialization and Basic Operations', () => {
    /**
     * Tests if the store initializes with its default value when chrome.storage.sync.get
     * resolves with no data for the specified key (e.g., first run or cleared storage).
     */
    it('should initialize with default value if storage is empty or key not found', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({})); // Simulate empty storage or key not found

      const store = persistentStore<PromptsConfig>(PROMPTS_STORE_KEY, DEFAULT_PROMPTS_VALUE);

      // Wait for the asynchronous initialization logic within persistentStore to complete.
      await vi.waitFor(() => {
        expect(get(store)).toEqual(DEFAULT_PROMPTS_VALUE);
      });
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(PROMPTS_STORE_KEY);
    });

    /**
     * Tests if the store correctly initializes with a value retrieved from chrome.storage.sync
     * if that value exists for the given key.
     */
    it('should initialize with stored value if present', async () => {
      const storedValue: PromptsConfig = {
        summaryPrompt: 'Stored Summary From Test',
        improvementPrompt: 'Stored Improvement From Test',
      };
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({ [PROMPTS_STORE_KEY]: storedValue }));

      const store = persistentStore<PromptsConfig>(PROMPTS_STORE_KEY, DEFAULT_PROMPTS_VALUE);

      await vi.waitFor(() => {
        expect(get(store)).toEqual(storedValue);
      });
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(PROMPTS_STORE_KEY);
    });

    /**
     * Verifies that calling `store.set()` updates the store's value locally
     * and triggers a call to `chrome.storage.sync.set` to persist the change.
     */
    it('should update value and call chrome.storage.sync.set on store.set()', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({})); // Start with empty storage
      const store = persistentStore<PromptsConfig>(PROMPTS_STORE_KEY, DEFAULT_PROMPTS_VALUE);
      await vi.waitFor(() => expect(get(store)).toEqual(DEFAULT_PROMPTS_VALUE)); // Ensure initial state

      const newValue: PromptsConfig = {
        summaryPrompt: 'New Summary via Set',
        improvementPrompt: 'New Improvement via Set',
      };
      store.set(newValue);

      expect(get(store)).toEqual(newValue);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [PROMPTS_STORE_KEY]: newValue });
    });

    /**
     * Verifies that calling `store.update()` updates the store's value locally based on the updater function
     * and triggers a call to `chrome.storage.sync.set` to persist the new state.
     */
    it('should update value and call chrome.storage.sync.set on store.update()', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({})); // Start with empty storage
      const store = persistentStore<PromptsConfig>(PROMPTS_STORE_KEY, DEFAULT_PROMPTS_VALUE);
      await vi.waitFor(() => expect(get(store)).toEqual(DEFAULT_PROMPTS_VALUE));

      store.update(current => ({
        ...current,
        summaryPrompt: 'Updated Summary via Update Fn',
      }));

      const expectedValue: PromptsConfig = {
        ...DEFAULT_PROMPTS_VALUE,
        summaryPrompt: 'Updated Summary via Update Fn',
      };
      expect(get(store)).toEqual(expectedValue);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [PROMPTS_STORE_KEY]: expectedValue });
    });

    /**
     * Tests if subscribers are correctly notified upon store initialization and subsequent value changes
     * triggered by `store.set()`.
     */
    it('should notify subscribers on value change via set', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({}));
      const store = persistentStore<PromptsConfig>(PROMPTS_STORE_KEY, DEFAULT_PROMPTS_VALUE);
      await vi.waitFor(() => expect(get(store)).toEqual(DEFAULT_PROMPTS_VALUE));

      const subscriber = vi.fn();
      const unsubscribe = store.subscribe(subscriber);

      expect(subscriber).toHaveBeenCalledOnce(); // Initial call with current value
      expect(subscriber).toHaveBeenCalledWith(DEFAULT_PROMPTS_VALUE);

      subscriber.mockClear(); // Clear previous calls for the next assertion

      const newValue: PromptsConfig = { summaryPrompt: 'Notify Test Summary', improvementPrompt: 'Notify Test Improvement' };
      store.set(newValue);

      expect(subscriber).toHaveBeenCalledOnce();
      expect(subscriber).toHaveBeenCalledWith(newValue);
      unsubscribe();
    });
  });

  // --- Test Suite for chrome.storage.onChanged Listener ---
  describe('chrome.storage.onChanged Listener', () => {
    let store: ReturnType<typeof persistentStore<PromptsConfig>>;

    beforeEach(async () => {
      // Initialize the store with a known value for these tests
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({[PROMPTS_STORE_KEY]: DEFAULT_PROMPTS_VALUE }));
      store = persistentStore<PromptsConfig>(PROMPTS_STORE_KEY, DEFAULT_PROMPTS_VALUE);
      await vi.waitFor(() => expect(get(store)).toEqual(DEFAULT_PROMPTS_VALUE));
    });

    /**
     * Tests if the store updates its local value when a `chrome.storage.onChanged` event
     * is fired for the same key and storage area ('sync').
     */
    it('should update store value if onChanged event matches key and areaName="sync"', () => {
      const externalChangeValue: PromptsConfig = {
        summaryPrompt: 'External Change Occurred',
        improvementPrompt: 'External Change Occurred',
      };
      const changes = {
        [PROMPTS_STORE_KEY]: { newValue: externalChangeValue, oldValue: DEFAULT_PROMPTS_VALUE },
      };

      // Simulate the onChanged event using vitest-chrome's listener invocation
      chrome.storage.onChanged.callListeners(changes, 'sync');
      
      expect(get(store)).toEqual(externalChangeValue);
    });

    /**
     * Ensures the store does NOT update its value if the `chrome.storage.onChanged` event
     * is for a different storage key.
     */
    it('should NOT update store value if onChanged event is for a different key', () => {
      const originalValue = get(store); // Store current value before external change
      const changes = {
        ['anotherKeyEntirely']: { newValue: { summaryPrompt: 'Different Key Data', improvementPrompt: 'Different Key Data' } },
      };
      chrome.storage.onChanged.callListeners(changes, 'sync');
      expect(get(store)).toEqual(originalValue); // Value should remain unchanged
    });
    
    /**
     * Verifies that the store does not re-set its value or unnecessarily notify subscribers
     * if the `newValue` from the `onChanged` event is identical to the current store value
     * (checked via `JSON.stringify`).
     */
    it('should NOT update or notify subscribers if new value from onChanged is the same as current', () => {
      const originalValue = get(store);
      const subscriber = vi.fn();
      const unsubscribe = store.subscribe(subscriber);
      subscriber.mockClear(); // Clear initial subscription call

      const changes = {
        // Simulate an event where newValue is a different object instance but has the same content
        [PROMPTS_STORE_KEY]: { newValue: JSON.parse(JSON.stringify(originalValue)) },
      };

      chrome.storage.onChanged.callListeners(changes, 'sync');
      expect(get(store)).toEqual(originalValue); // Value should be unchanged
      expect(subscriber).not.toHaveBeenCalled(); // No new notification should occur
      unsubscribe();
    });
  });

  // --- Test Suite for Fallback Behavior when chrome.storage.sync is Unavailable ---
  describe('Fallback when chrome.storage.sync is unavailable', () => {
    let originalChromeStorageSync: typeof chrome.storage.sync | undefined;

    beforeEach(() => {
      // Temporarily remove chrome.storage.sync to simulate unavailability
      originalChromeStorageSync = chrome.storage.sync;
      // @ts-expect-error: Intentionally making 'sync' undefined for this test case.
      chrome.storage.sync = undefined;
    });

    afterEach(() => {
      // Restore the original (mocked) chrome.storage.sync
      // @ts-expect-error: Restoring 'sync' to its original (potentially mocked) state.
      chrome.storage.sync = originalChromeStorageSync;
    });

    /**
     * Tests that `persistentStore` logs a warning and operates as an in-memory store
     * when `chrome.storage.sync` is not available.
     */
    it('should warn and operate in-memory if chrome.storage.sync is unavailable', () => {
      const testInMemoryKey = 'testStoreInMemory';
      const initialInMemoryValue = { data: 'initial in-memory data' };
      const store = persistentStore(testInMemoryKey, initialInMemoryValue);

      expect(console.warn).toHaveBeenCalledWith(
        `Omni Max [PersistentStore]: Chrome storage.sync API not available for key "${testInMemoryKey}". Store will operate in-memory only for this session.`
      );
      expect(get(store)).toEqual(initialInMemoryValue); // Should initialize with default
      
      const newInMemoryValue = { data: 'updated in-memory data' };
      store.set(newInMemoryValue);
      expect(get(store)).toEqual(newInMemoryValue); // Should update in-memory

      // Ensure chrome.storage.sync methods (if they were available) were not called
      if (originalChromeStorageSync) {
          expect(originalChromeStorageSync.get).not.toHaveBeenCalled();
          expect(originalChromeStorageSync.set).not.toHaveBeenCalled();
      }
    });
  });

  // --- Test Suite for a Store with a Boolean Value (e.g., globalExtensionEnabledStore) ---
  describe('persistentStore with Boolean values', () => {
    const BOOLEAN_STORE_KEY = 'testBooleanStore';
    const INITIAL_BOOLEAN_VALUE = true;

    /**
     * Tests correct initialization of a boolean store with a value from storage.
     */
    it('should initialize correctly with a stored boolean value', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({ [BOOLEAN_STORE_KEY]: false }));
      const store = persistentStore<boolean>(BOOLEAN_STORE_KEY, INITIAL_BOOLEAN_VALUE);
      
      await vi.waitFor(() => {
        expect(get(store)).toBe(false);
      });
      expect(chrome.storage.sync.get).toHaveBeenCalledWith(BOOLEAN_STORE_KEY);
    });

    /**
     * Tests correct setting of a boolean store's value and persistence via chrome.storage.sync.set.
     */
    it('should set boolean value and call chrome.storage.sync.set', async () => {
      vi.mocked(chrome.storage.sync.get).mockImplementation(() => Promise.resolve({})); // Start with default
      const store = persistentStore<boolean>(BOOLEAN_STORE_KEY, INITIAL_BOOLEAN_VALUE);
      await vi.waitFor(() => expect(get(store)).toBe(INITIAL_BOOLEAN_VALUE)); // Ensure initial state
      
      vi.mocked(chrome.storage.sync.set).mockClear(); // Clear any set calls from initialization if any

      store.set(false);
      expect(get(store)).toBe(false);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [BOOLEAN_STORE_KEY]: false });
    });
  });
});