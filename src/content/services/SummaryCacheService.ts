// src/content/services/SummaryCacheService.ts
import { defaultStorageAdapter, type IStorageAdapter } from '../../storage/IStorageAdapter';
import type { SummaryCache } from '../types';

/** Key used to store the summaries cache in the storage adapter. */
const SUMMARIES_STORAGE_KEY = 'omniMaxSummaries';

/**
 * @class SummaryCacheService
 * @description Manages the caching of chat summaries using a provided storage adapter.
 * This service allows saving, retrieving, removing, and clearing summaries
 * associated with protocol numbers.
 */
export class SummaryCacheService {
  private storageAdapter: IStorageAdapter;

  /**
   * Constructs an instance of SummaryCacheService.
   * @param {IStorageAdapter} [storageAdapter=defaultStorageAdapter] - The storage adapter to use for persistence.
   * Defaults to `defaultStorageAdapter`.
   */
  constructor(storageAdapter: IStorageAdapter = defaultStorageAdapter) {
    this.storageAdapter = storageAdapter;
  }

  /**
   * Retrieves the entire summary cache object from storage.
   * @returns {Promise<SummaryCache>} A Promise that resolves to the summary cache,
   * or an empty object if no cache exists or an error occurs.
   * @private
   */
  private async getCache(): Promise<SummaryCache> {
    return (await this.storageAdapter.get<SummaryCache>(SUMMARIES_STORAGE_KEY)) || {};
  }

  /**
   * Saves the entire summary cache object to storage.
   * @param {SummaryCache} cache - The summary cache object to save.
   * @returns {Promise<void>} A Promise that resolves when the cache has been saved.
   * @private
   */
  private async saveCache(cache: SummaryCache): Promise<void> {
    await this.storageAdapter.set(SUMMARIES_STORAGE_KEY, cache);
  }

  /**
   * Retrieves a cached summary for a given protocol number.
   * @param {string} protocolNumber - The protocol number for which to retrieve the summary.
   * @returns {Promise<string | null>} A Promise that resolves to the summary string
   * if found, or `null` otherwise.
   */
  public async getSummary(protocolNumber: string): Promise<string | null> {
    const cache = await this.getCache();
    // The key in SummaryCache is protocolNumber
    return cache[protocolNumber] || null;
  }

  /**
   * Saves a summary for a given protocol number to the cache.
   * @param {string} protocolNumber - The protocol number to associate with the summary.
   * @param {string} summary - The summary string to save.
   * @returns {Promise<void>} A Promise that resolves when the summary has been saved.
   */
  public async saveSummary(protocolNumber: string, summary: string): Promise<void> {
    const cache = await this.getCache();
    cache[protocolNumber] = summary;
    await this.saveCache(cache);
    console.log(`Omni Max [SummaryCacheService]: Summary saved for protocol ${protocolNumber}.`);
  }

  /**
   * Removes a cached summary for a given protocol number.
   * If no summary exists for the protocol, no action is taken.
   * @param {string} protocolNumber - The protocol number for which to remove the summary.
   * @returns {Promise<void>} A Promise that resolves when the summary has been removed or
   * if no summary was found for the given protocol.
   */
  public async removeSummary(protocolNumber: string): Promise<void> {
    const cache = await this.getCache();
    if (Object.prototype.hasOwnProperty.call(cache, protocolNumber)) { // More robust check
      delete cache[protocolNumber];
      await this.saveCache(cache);
      console.log(`Omni Max [SummaryCacheService]: Summary removed for protocol ${protocolNumber}.`);
    }
  }

  /**
   * Clears summaries from the cache that do not correspond to any of the provided active protocol numbers.
   * This is useful for removing stale or irrelevant cached summaries.
   * @param {string[]} activeProtocolNumbers - An array of currently active protocol numbers.
   * Summaries for protocols not in this list will be removed from the cache.
   * @returns {Promise<void>} A Promise that resolves when invalid summaries have been cleared.
   */
  public async clearInvalidSummaries(activeProtocolNumbers: string[]): Promise<void> {
    const cache = await this.getCache();
    let cacheHasChanged = false;

    for (const cachedProtocolNumber in cache) {
      if (Object.prototype.hasOwnProperty.call(cache, cachedProtocolNumber)) {
        if (!activeProtocolNumbers.includes(cachedProtocolNumber)) {
          delete cache[cachedProtocolNumber];
          cacheHasChanged = true;
          console.log(`Omni Max [SummaryCacheService]: Invalid summary cleared for protocol ${cachedProtocolNumber}.`);
        }
      }
    }

    if (cacheHasChanged) {
      await this.saveCache(cache);
    }
  }
}