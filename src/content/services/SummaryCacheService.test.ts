// src/content/services/SummaryCacheService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
import { SummaryCacheService } from './SummaryCacheService';
import type { IStorageAdapter } from '../../storage/IStorageAdapter';
import { defaultStorageAdapter } from '../../storage/IStorageAdapter';
import type { SummaryCache } from '../types';

const SUMMARIES_STORAGE_KEY = 'omniMaxSummaries';

describe('SummaryCacheService', () => {
  let service: SummaryCacheService;
  let mockStorageAdapter: Mocked<IStorageAdapter>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockStorageAdapter = {
      get: vi.fn().mockImplementation(async <T>(key: string): Promise<T | undefined> => {
        // Implementação mock padrão para 'get'.
        // Os testes devem usar .mockResolvedValueOnce() para fornecer valores específicos.
        // Retornar undefined aqui simula uma chave não encontrada ou um cache vazio inicialmente.
        return undefined;
      }),
      set: vi.fn().mockImplementation(async <T>(key: string, value: T): Promise<void> => {
        // Implementação mock padrão para 'set'.
        return Promise.resolve();
      }),
    };
    service = new SummaryCacheService(mockStorageAdapter);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ... seus testes continuam aqui ...

  describe('constructor', () => {
    it('should use the provided storage adapter', () => {
      expect((service as any).storageAdapter).toBe(mockStorageAdapter);
    });

    it('should use defaultStorageAdapter if no adapter is provided', () => {
      const defaultService = new SummaryCacheService();
      expect((defaultService as any).storageAdapter).toBe(defaultStorageAdapter);
    });
  });

  describe('getSummary', () => {
    it('should return null if the cache is empty (adapter.get returns undefined)', async () => {
      // O mock padrão no beforeEach já retorna undefined para .get()
      // mockStorageAdapter.get.mockResolvedValue(undefined); // ou mockStorageAdapter.get.mockResolvedValue({});
      const summary = await service.getSummary('proto1');
      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(summary).toBeNull();
    });

    it('should return null if the cache is fetched as empty object', async () => {
      mockStorageAdapter.get.mockResolvedValue({}); // Simula cache vazio
      const summary = await service.getSummary('proto1');
      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(summary).toBeNull();
    });

    it('should return null if the protocol number is not in the cache', async () => {
      const existingCache: SummaryCache = { 'protoExisting': 'summary for existing' };
      mockStorageAdapter.get.mockResolvedValue(existingCache);
      const summary = await service.getSummary('protoNew');
      expect(summary).toBeNull();
    });

    it('should return the summary if the protocol number exists in the cache', async () => {
      const protocol = 'proto123';
      const expectedSummary = 'This is a cached summary.';
      const existingCache: SummaryCache = { [protocol]: expectedSummary };
      mockStorageAdapter.get.mockResolvedValue(existingCache);

      const summary = await service.getSummary(protocol);
      expect(summary).toBe(expectedSummary);
    });
  });

  describe('saveSummary', () => {
    it('should add a new summary to an empty cache (adapter.get returns undefined)', async () => {
      // mockStorageAdapter.get já retorna undefined por padrão no beforeEach
      const protocol = 'newProto';
      const summaryText = 'New summary text.';

      await service.saveSummary(protocol, summaryText);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY, {
        [protocol]: summaryText,
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Omni Max [SummaryCacheService]: Summary saved for protocol ${protocol}.`);
    });

    it('should add a new summary to an empty cache (adapter.get returns empty object)', async () => {
      mockStorageAdapter.get.mockResolvedValue({});
      const protocol = 'newProto';
      const summaryText = 'New summary text.';

      await service.saveSummary(protocol, summaryText);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY, {
        [protocol]: summaryText,
      });
    });

    it('should add a new summary to an existing cache', async () => {
      const existingCache: SummaryCache = { 'existingProto': 'old summary' };
      mockStorageAdapter.get.mockResolvedValue(existingCache);
      const protocol = 'addedProto';
      const summaryText = 'Summary to be added.';

      await service.saveSummary(protocol, summaryText);

      expect(mockStorageAdapter.set).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY, {
        'existingProto': 'old summary',
        [protocol]: summaryText,
      });
    });

    it('should overwrite an existing summary', async () => {
      const protocol = 'protoToOverwrite';
      const oldSummary = 'This will be overwritten.';
      const newSummary = 'This is the new, updated summary.';
      const existingCache: SummaryCache = { [protocol]: oldSummary };
      mockStorageAdapter.get.mockResolvedValue(existingCache);

      await service.saveSummary(protocol, newSummary);

      expect(mockStorageAdapter.set).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY, {
        [protocol]: newSummary,
      });
    });
  });

  describe('removeSummary', () => {
    it('should remove an existing summary from the cache', async () => {
      const protocolToRemove = 'protoRemove';
      const otherProtocol = 'protoKeep';
      const existingCache: SummaryCache = {
        [protocolToRemove]: 'summary to remove',
        [otherProtocol]: 'summary to keep',
      };
      mockStorageAdapter.get.mockResolvedValue(existingCache);

      await service.removeSummary(protocolToRemove);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY, {
        [otherProtocol]: 'summary to keep',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Omni Max [SummaryCacheService]: Summary removed for protocol ${protocolToRemove}.`);
    });

    it('should do nothing if the protocol to remove does not exist in the cache', async () => {
      const protocolToKeep = 'protoKeep1';
      const existingCache: SummaryCache = { [protocolToKeep]: 'summary' };
      mockStorageAdapter.get.mockResolvedValue(existingCache);

      await service.removeSummary('nonExistentProto');

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Summary removed'));
    });

    it('should do nothing if the cache is empty (adapter.get returns undefined)', async () => {
      // mockStorageAdapter.get já retorna undefined por padrão
      await service.removeSummary('anyProto');
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
    });

    it('should do nothing if the cache is empty (adapter.get returns empty object)', async () => {
      mockStorageAdapter.get.mockResolvedValue({});
      await service.removeSummary('anyProto');
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
    });
  });

  describe('clearInvalidSummaries', () => {
    it('should remove summaries not in the active list', async () => {
      const initialCache: SummaryCache = {
        'active1': 'summary active 1',
        'stale1': 'summary stale 1',
        'active2': 'summary active 2',
        'stale2': 'summary stale 2',
      };
      mockStorageAdapter.get.mockResolvedValue(initialCache);
      const activeProtocols = ['active1', 'active2'];

      await service.clearInvalidSummaries(activeProtocols);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY, {
        'active1': 'summary active 1',
        'active2': 'summary active 2',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(`Omni Max [SummaryCacheService]: Invalid summary cleared for protocol stale1.`);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Omni Max [SummaryCacheService]: Invalid summary cleared for protocol stale2.`);
    });

    it('should not call set if no summaries are cleared', async () => {
      const initialCache: SummaryCache = {
        'active1': 'summary active 1',
        'active2': 'summary active 2',
      };
      mockStorageAdapter.get.mockResolvedValue(initialCache);
      const activeProtocols = ['active1', 'active2', 'active3'];

      await service.clearInvalidSummaries(activeProtocols);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Invalid summary cleared for protocol'));
    });

    it('should handle an empty initial cache correctly (adapter.get returns undefined)', async () => {
      // mockStorageAdapter.get já retorna undefined por padrão
      const activeProtocols = ['active1'];

      await service.clearInvalidSummaries(activeProtocols);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
    });

    it('should handle an empty initial cache correctly (adapter.get returns empty object)', async () => {
      mockStorageAdapter.get.mockResolvedValue({});
      const activeProtocols = ['active1'];

      await service.clearInvalidSummaries(activeProtocols);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).not.toHaveBeenCalled();
    });

    it('should handle an empty activeProtocols list (clearing all)', async () => {
      const initialCache: SummaryCache = {
        'stale1': 'summary stale 1',
        'stale2': 'summary stale 2',
      };
      mockStorageAdapter.get.mockResolvedValue(initialCache);
      const activeProtocols: string[] = [];

      await service.clearInvalidSummaries(activeProtocols);

      expect(mockStorageAdapter.get).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY);
      expect(mockStorageAdapter.set).toHaveBeenCalledWith(SUMMARIES_STORAGE_KEY, {});
      expect(consoleLogSpy).toHaveBeenCalledWith(`Omni Max [SummaryCacheService]: Invalid summary cleared for protocol stale1.`);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Omni Max [SummaryCacheService]: Invalid summary cleared for protocol stale2.`);
    });
  });
});