/**
 * @file src/storage/stores.test.ts
 * @description Sanity checks for Svelte stores defined in `stores.ts`.
 */
import * as stores from './stores';
import { describe, it, expect } from 'vitest';
import { get, type Readable } from 'svelte/store';

/**
 * @describe Store Sanity Check
 * @description Basic sanity checks for all exported Svelte stores.
 */
describe('Store Sanity Check', () => {
  /**
   * @it should instantiate all persistent stores without throwing an error
   * @description Verifies that all exported variables ending with 'Store' can be
   * instantiated and their initial values accessed using `get()` without errors.
   * This serves as a basic check that stores are set up correctly.
   */
  it('should instantiate all persistent stores without throwing an error', () => {
    const storeEntries = Object.entries(stores).filter(([key]) => key.endsWith('Store'));
    expect(storeEntries.length).toBeGreaterThan(0); // Ensure some stores were found

    for (const [_key, storeInstance] of storeEntries) {
      // Cast 'storeInstance' to Readable<unknown> to satisfy svelte's get(...) type,
      // allowing access to its value for this basic check.
      expect(() => get(storeInstance as Readable<unknown>)).not.toThrowError();
    }
  });
});