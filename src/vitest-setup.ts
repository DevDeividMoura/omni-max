/**
 * @file src/vitest-setup.ts
 * @description Global setup for Vitest tests that involve Chrome extension APIs.
 * This script configures `vitest-chrome` to mock the `chrome` global object
 * and establishes default mock implementations for critical asynchronous APIs,
 * particularly `chrome.storage.sync.get` and `chrome.storage.sync.set`.
 *
 * It employs a shared helper function, `applyDefaultStorageSyncMocks`, to:
 * 1. Pre-emptively mock `vitestChromeInstance.storage.sync` methods before this
 * instance is assigned to `globalThis.chrome`. This ensures that Promise-returning
 * functions are available during the initial import phase of modules (e.g., `storage.ts`).
 * 2. Re-apply these baseline mocks in a `beforeEach` hook. After Vitest resets all mocks,
 * this ensures `globalThis.chrome.storage.sync.get` and `globalThis.chrome.storage.sync.set`
 * consistently return Promises, providing a safe and predictable baseline for each test case.
 */
import { vi, beforeEach } from 'vitest';
import { chrome as vitestChromeInstance } from 'vitest-chrome';

/**
 * Applies default mock implementations to a given `chrome.storage.sync`-like object.
 * This function ensures that:
 * - `get` is a mock that returns a Promise resolving to an empty object.
 * - `set` is a mock that returns a Promise resolving to void.
 * This is crucial for compatibility with application code expecting these methods to be thenable.
 *
 * @param syncStorageObject - The storage.sync object to which mocks will be applied.
 * Should be compatible with `chrome.storage.sync`'s interface.
 * @param context - A descriptive string for the context in which mocks are applied
 * (e.g., "Pre-emptive Instance", "beforeEach"). Used for logging in case of errors.
 */
function applyDefaultStorageSyncMocks(
  syncStorageObject:
    | typeof vitestChromeInstance.storage.sync
    | typeof globalThis.chrome.storage.sync
    | undefined,
  context: string
): void {
  if (syncStorageObject) {
    vi.mocked(syncStorageObject.get).mockImplementation(
      // Default mock for chrome.storage.sync.get
      async (_keys?: string | string[] | { [key: string]: any } | null) => {
        return {};
      }
    );

    vi.mocked(syncStorageObject.set).mockImplementation(
      // Default mock for chrome.storage.sync.set
      async (_items: { [key: string]: any }) => {
        // No return value for set, resolves to void
      }
    );
  } else {
    // This console.error is important for debugging setup issues.
    console.error(
      `[vitest-setup ${context}] CRITICAL: chrome.storage.sync object is undefined. Cannot apply default mocks.`
    );
  }
}

// 1. Pre-emptive Mocking on `vitestChromeInstance`
// Apply default mocks directly to the `vitestChromeInstance.storage.sync`
// *before* it's assigned to `globalThis.chrome`. This ensures that modules
// importing `storage.ts` (which might immediately access `chrome.storage.sync`)
// encounter Promise-returning mocks from the start.
applyDefaultStorageSyncMocks(
  vitestChromeInstance?.storage?.sync,
  "Pre-emptive Instance"
);

// Assign the pre-configured `vitestChromeInstance` to `globalThis.chrome`.
vi.stubGlobal('chrome', vitestChromeInstance);

/**
 * @hook beforeEach
 * @description This hook runs before each test case.
 * It first resets all mocks to a clean state using `vi.resetAllMocks()`.
 * This action clears call history and custom implementations of all mocks,
 * restoring them to basic `vi.fn()`.
 * Then, it re-applies the default Promise-returning mocks to `globalThis.chrome.storage.sync.get`
 * and `globalThis.chrome.storage.sync.set`. This ensures a consistent and safe baseline
 * for storage operations in every test, preventing interference between tests and
 * ensuring that awaited calls to these methods do not hang or error by default.
 */
beforeEach(() => {
  vi.resetAllMocks();

  // Re-apply default mocks to `globalThis.chrome.storage.sync` for the current test.
  applyDefaultStorageSyncMocks(
    globalThis.chrome?.storage?.sync,
    "beforeEach on globalThis.chrome"
  );
});

// Initial console log to confirm setup execution.
console.log(
  '[vitest-setup] Global `chrome` API is mocked. Pre-emptive and per-test baseline mocks for `storage.sync.get/set` are configured.'
);