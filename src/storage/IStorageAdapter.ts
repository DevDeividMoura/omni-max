// src/storage/IStorageAdapter.ts

/**
 * Abstração de persistência (DIP)
 */
export interface IStorageAdapter {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
}

/**
 * Implementação concreta usando chrome.storage.sync
 */
export class ChromeStorageAdapter implements IStorageAdapter {
  async get<T>(key: string): Promise<T | undefined> {
    const res = await chrome.storage.sync.get(key)
    return res[key] as T | undefined
  }
  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.sync.set({ [key]: value })
  }
}

/**
 * Instância padrão — em testes você pode mockar ou substituir
 */
export const defaultStorageAdapter: IStorageAdapter = new ChromeStorageAdapter()
