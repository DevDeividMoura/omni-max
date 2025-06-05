/**
 * @file src/storage/IStorageAdapter.ts
 * @description Defines the abstraction for storage persistence (Dependency Inversion Principle)
 * and provides a concrete implementation using `chrome.storage.sync`.
 */

/**
 * @interface IStorageAdapter
 * @description Defines the contract for a storage persistence layer.
 * This interface allows for different storage mechanisms to be used interchangeably.
 */
export interface IStorageAdapter {
  /**
   * Retrieves a value from storage by its key.
   * @template T The expected type of the stored value.
   * @param {string} key The key of the item to retrieve.
   * @returns {Promise<T | undefined>} A promise that resolves with the retrieved value,
   * or undefined if the key is not found or an error occurs.
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Stores a value in storage under a specific key.
   * @template T The type of the value to store.
   * @param {string} key The key under which to store the value.
   * @param {T} value The value to store.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  set<T>(key: string, value: T): Promise<void>;
}

/**
 * @class ChromeStorageAdapter
 * @implements {IStorageAdapter}
 * @description A concrete implementation of {@link IStorageAdapter} that uses the
 * `chrome.storage.sync` API for data persistence. This storage is synced
 * across devices where the user is logged into Chrome.
 */
export class ChromeStorageAdapter implements IStorageAdapter {
  /**
   * Retrieves a value from `chrome.storage.sync`.
   * @template T The expected type of the stored value.
   * @param {string} key The key of the item to retrieve.
   * @returns {Promise<T | undefined>} A promise that resolves with the retrieved value,
   * or undefined if the key is not found.
   */
  async get<T>(key: string): Promise<T | undefined> {
    const res = await chrome.storage.sync.get(key);
    return res[key] as T | undefined;
  }

  /**
   * Stores a value in `chrome.storage.sync`.
   * @template T The type of the value to store.
   * @param {string} key The key under which to store the value.
   * @param {T} value The value to store.
   * @returns {Promise<void>} A promise that resolves when the set operation is complete.
   */
  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.sync.set({ [key]: value });
  }
}

/**
 * @const defaultStorageAdapter
 * @description Provides a default instance of the {@link ChromeStorageAdapter}.
 * This can be used throughout the application or replaced/mocked in testing environments.
 * @type {IStorageAdapter}
 */
export const defaultStorageAdapter: IStorageAdapter = new ChromeStorageAdapter();