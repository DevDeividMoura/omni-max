import type { IStorageAdapter } from './IStorageAdapter';

/**
 * @class ChromeStorageLocalAdapter
 * @implements {IStorageAdapter}
 * @description A concrete implementation of IStorageAdapter that uses the
 * `chrome.storage.local` API for data persistence. This storage is local
 * to the machine and suitable for larger data or frequent writes.
 */
export class ChromeStorageLocalAdapter implements IStorageAdapter {
  /**
   * Retrieves a value from `chrome.storage.local`.
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const res = await chrome.storage.local.get(key);
      return res[key] as T | undefined;
    } catch (error) {
      console.error(`ChromeStorageLocalAdapter: Error getting key "${key}"`, error);
      return undefined;
    }
  }

  /**
   * Stores a value in `chrome.storage.local`.
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`ChromeStorageLocalAdapter: Error setting key "${key}"`, error);
    }
  }
}

export const localstorageAdapter: IStorageAdapter = new ChromeStorageLocalAdapter();