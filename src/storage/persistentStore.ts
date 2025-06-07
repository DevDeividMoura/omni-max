import { writable, get, type Writable } from 'svelte/store';
import type { IStorageAdapter } from './IStorageAdapter';
import { defaultStorageAdapter } from './IStorageAdapter';

/**
 * @function debounce
 * @description Creates a debounced version of a function that delays invoking the function
 * until after `delay` milliseconds have elapsed since the last time it was invoked.
 * @template F - The type of the function to debounce.
 * @param {F} fn - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {F} The new debounced function.
 */
function debounce<F extends (...args: any[]) => void>(fn: F, delay: number): F {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as F;
}

/**
 * @function persistentStore
 * @description Creates a Svelte writable store that persists its value to `chrome.storage.sync`
 * (or another configured storage adapter) and synchronizes changes across browser sessions
 * and instances where the user is logged in.
 *
 * It loads the initial value from storage, saves changes to storage (debounced),
 * and listens for external changes to the storage key to update the store's value.
 * If `chrome.storage.sync` is unavailable, it operates as an in-memory store for the current session.
 *
 * @template T - The type of the value held by the store.
 * @param {string} key - The key under which the value will be stored in the storage.
 * @param {T} initialValue - The initial value of the store if no value is found in storage.
 * @param {IStorageAdapter} [adapter=defaultStorageAdapter] - The storage adapter to use for persistence.
 * @returns {Writable<T>} A Svelte writable store.
 */
export function persistentStore<T>(
  key: string,
  initialValue: T,
  adapter: IStorageAdapter = defaultStorageAdapter
): Writable<T> {
  const store = writable<T>(initialValue);
  let initialized = false;
  let lastSavedState = initialValue; // Stores the last value successfully saved to the adapter

  // Check for Chrome storage availability
  const hasChromeSync =
    typeof chrome !== 'undefined' &&
    chrome.storage !== undefined &&
    chrome.storage.sync !== undefined;

  if (!hasChromeSync) {
    console.warn(
      `Omni Max [PersistentStore] chrome.storage.sync não disponível para a chave "${key}". Operando em memória.`
    );
    initialized = true;
    return store;
  }

  // Load initial value from the storage adapter
  adapter
    .get<T>(key)
    .then(savedValue => {
      if (savedValue !== undefined) {
        store.set(savedValue);
        lastSavedState = savedValue;
      }
    })
    .catch(error => console.warn(`[PersistentStore] Error reading key "${key}" from storage:`, error))
    .finally(() => {
      initialized = true; // Initialization complete, subscriptions can now trigger saves
    });

  // Debounced function to save the store's value to the adapter
  const saveToStorage = debounce((currentValue: T) => {
    // Avoid saving if the value hasn't changed from the last known saved state
    try {
      if (JSON.stringify(currentValue) === JSON.stringify(lastSavedState)) {
        return;
      }
    } catch (e) {
      // If JSON.stringify fails (e.g., circular references, though unlikely for typical store values),
      // proceed with the save attempt as a fallback, or handle error appropriately.
      // For this implementation, we'll proceed, assuming comparison failure means "possibly different".
    }

    adapter
      .set(key, currentValue)
      .then(() => {
        lastSavedState = currentValue; // Update last known saved state upon successful save
      })
      .catch(error => console.warn(`Omni Max [PersistentStore] Error saving key "${key}" to storage:`, error));
  }, 1000);

  // Subscribe to store changes to trigger saves, only after initialization
  store.subscribe(currentValue => {
    if (!initialized) {
      return; // Don't save during the initial load phase
    }
    saveToStorage(currentValue);
  });

  // Listen for external changes to the storage key (e.g., from other extension parts or synced instances)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if ((areaName === 'local' || areaName === 'sync') && Object.hasOwn(changes, key)) {
      const { newValue } = changes[key];
      const currentValueInStore = get(store);

      // Update the local Svelte store only if the new value from storage is different
      // from the current value in the Svelte store to prevent redundant updates or loops.
      try {
        if (JSON.stringify(newValue) !== JSON.stringify(currentValueInStore)) {
          store.set(newValue);
          lastSavedState = newValue; // Reflect that this new value is now the "saved" state
        }
      } catch (e) {
        // Fallback if JSON.stringify fails
        store.set(newValue);
        lastSavedState = newValue;
      }
    }
  });

  return store;
}