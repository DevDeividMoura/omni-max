// src/content/services/SummaryCacheService.ts
import { defaultStorageAdapter, type IStorageAdapter } from '../../storage/IStorageAdapter';
import type { SummaryCache } from '../types';

const SUMMARIES_STORAGE_KEY = 'omniMaxSummaries';

export class SummaryCacheService {
  private storageAdapter: IStorageAdapter;

  constructor(storageAdapter: IStorageAdapter = defaultStorageAdapter) {
    this.storageAdapter = storageAdapter;
  }

  private async getCache(): Promise<SummaryCache> {
    return (await this.storageAdapter.get<SummaryCache>(SUMMARIES_STORAGE_KEY)) || {};
  }

  private async saveCache(cache: SummaryCache): Promise<void> {
    await this.storageAdapter.set(SUMMARIES_STORAGE_KEY, cache);
  }

  /**
   * Retrieves a cached summary for a given protocol.
   * @param protocolo The protocol number.
   * @returns A Promise that resolves to the summary string or null if not found.
   */
  public async getSummary(protocolo: string): Promise<string | null> {
    const cache = await this.getCache();
    return cache[protocolo] || null;
  }

  /**
   * Saves a summary for a given protocol to the cache.
   * @param protocolo The protocol number.
   * @param summary The summary string.
   */
  public async saveSummary(protocolo: string, summary: string): Promise<void> {
    const cache = await this.getCache();
    cache[protocolo] = summary;
    await this.saveCache(cache);
    console.log(`Omni Max [SummaryCacheService]: Summary saved for protocol ${protocolo}.`);
  }

  /**
   * Removes a cached summary for a given protocol.
   * @param protocolo The protocol number.
   */
  public async removeSummary(protocolo: string): Promise<void> {
    const cache = await this.getCache();
    if (cache[protocolo]) {
      delete cache[protocolo];
      await this.saveCache(cache);
      console.log(`Omni Max [SummaryCacheService]: Summary removed for protocol ${protocolo}.`);
    }
  }

  /**
   * Clears summaries from the cache that do not correspond to any of the provided active protocols.
   * @param activeProtocols An array of currently active protocol numbers.
   */
  public async clearInvalidSummaries(activeProtocols: string[]): Promise<void> {
    const cache = await this.getCache();
    let changed = false;
    for (const cachedProtocol in cache) {
      if (!activeProtocols.includes(cachedProtocol)) {
        delete cache[cachedProtocol];
        changed = true;
        console.log(`Omni Max [SummaryCacheService]: Invalid summary cleared for protocol ${cachedProtocol}.`);
      }
    }
    if (changed) {
      await this.saveCache(cache);
    }
  }
}