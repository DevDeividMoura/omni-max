/**
 * @file src/storage/IStorageAdapter.test.ts
 * @description Unit tests for the ChromeStorageAdapter.
 */
import { ChromeStorageAdapter, type IStorageAdapter } from './IStorageAdapter';
import { vi, describe, it, expect, beforeEach } from 'vitest';

/**
 * @describe ChromeStorageAdapter
 * @description Test suite for the {@link ChromeStorageAdapter} class.
 */
describe('ChromeStorageAdapter', () => {
  let adapter: IStorageAdapter;

  beforeEach(() => {
    adapter = new ChromeStorageAdapter();

    // Reset all mocks before each test to ensure isolation
    vi.resetAllMocks();

    // Mock the global chrome.storage.sync API
    // Using 'as any' for simplicity in mocking the chrome global structure.
    globalThis.chrome = {
      storage: {
        sync: {
          get: vi.fn().mockResolvedValue({ testKey: 'mockedValue' }), // Default mock for get
          set: vi.fn().mockResolvedValue(undefined), // Default mock for set
        },
      },
    } as any;
  });

  /**
   * @it should call chrome.storage.sync.get with the correct key and return the stored value
   * @description Verifies that the adapter's get method correctly calls `chrome.storage.sync.get`
   * and returns the expected value from the mock.
   */
  it('should call chrome.storage.sync.get with the correct key and return the stored value', async () => {
    const result = await adapter.get<string>('testKey');
    expect(chrome.storage.sync.get).toHaveBeenCalledWith('testKey');
    expect(result).toBe('mockedValue');
  });

  /**
   * @it should call chrome.storage.sync.set with the correct key-value pair
   * @description Verifies that the adapter's set method correctly calls `chrome.storage.sync.set`
   * with the provided key and value.
   */
  it('should call chrome.storage.sync.set with the correct key-value pair', async () => {
    await adapter.set('testKey', 'newValue');
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ testKey: 'newValue' });
  });

  /**
   * @it should return undefined if the key does not exist in storage for get operation
   * @description Verifies that `get` returns undefined when `chrome.storage.sync.get`
   * resolves with an object that does not contain the requested key.
   */
  it('should return undefined if the key does not exist in storage for get operation', async () => {

    const result = await adapter.get<string>('nonExistentKey');
    expect(chrome.storage.sync.get).toHaveBeenCalledWith('nonExistentKey');
    expect(result).toBeUndefined();
  });
});