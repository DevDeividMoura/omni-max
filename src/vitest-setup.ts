// src/vitest-setup.ts
/**
 * @file vitest-setup.ts
 * @description Global setup for Vitest tests involving Chrome extension APIs.
 * This file configures `vitest-chrome` to mock the `chrome` global object
 * and establishes default mock implementations for critical asynchronous APIs.
 *
 * It uses a helper function `applyDefaultStorageSyncMocks` to:
 * 1. **Pre-emptively Mock:** `vitestChromeInstance.storage.sync` methods *before*
 * it's assigned to `globalThis.chrome`, ensuring Promise-returning functions
 * are available during initial module imports (e.g., `storage.ts` initialization).
 * 2. **Re-apply Baseline Mocks Per-Test:** In a `beforeEach` hook, after mocks are reset,
 * the same default Promise-returning behaviors are re-established for
 * `globalThis.chrome.storage.sync.get` and `globalThis.chrome.storage.sync.set`,
 * providing a consistent, safe baseline for each test case.
 */
import { vi, beforeEach } from 'vitest';
import { chrome as vitestChromeInstance } from 'vitest-chrome';

/**
 * Applies default mock implementations to a given `chrome.storage.sync` object.
 * Ensures that `get` returns a Promise resolving to an empty object,
 * and `set` returns a void Promise. This is crucial for compatibility with code
 * expecting these methods to be thenable.
 *
 * @param {typeof vitestChromeInstance.storage.sync | typeof globalThis.chrome.storage.sync | undefined} syncStorageObject The storage.sync object to mock.
 * @param {string} context A string indicating the context (e.g., "pre-emptive", "beforeEach") for debug logging.
 */
function applyDefaultStorageSyncMocks(
    syncStorageObject: typeof vitestChromeInstance.storage.sync | typeof globalThis.chrome.storage.sync | undefined,
    context: string
): void {
    if (syncStorageObject) {
        vi.mocked(syncStorageObject.get).mockImplementation(
            async (keys?: string | string[] | { [key: string]: any } | null) => {
                // console.debug(`[vitest-setup ${context}] Default chrome.storage.sync.get mock returning {} for keys:`, keys);
                return {};
            }
        );

        vi.mocked(syncStorageObject.set).mockImplementation(
            async (items: { [key: string]: any }) => {
                // console.debug(`[vitest-setup ${context}] Default chrome.storage.sync.set mock called with items:`, items);
            }
        );
    } else {
        console.error(
            `[vitest-setup ${context}] CRITICAL: chrome.storage.sync object is not available for applying default mocks.`
        );
    }
}

// --- 1. PRE-EMPTIVE MOCKING on vitestChromeInstance ---
// Applies default mocks directly to the instance from `vitest-chrome`
// *before* it's assigned to `globalThis.chrome`.
applyDefaultStorageSyncMocks(
    vitestChromeInstance?.storage?.sync,
    "Pre-emptive Instance"
);

// Stub the global 'chrome' object with the pre-configured mock instance.
vi.stubGlobal('chrome', vitestChromeInstance);

// --- 2. PER-TEST BASELINE MOCKING on globalThis.chrome ---
beforeEach(() => {
    // vi.resetAllMocks() clears the call history AND mock implementations
    // (like the .mockImplementation above) of ALL mocks.
    // This restores the mocks to their base vi.fn() .
    vi.resetAllMocks();

    // Re-apply default mocks to `globalThis.chrome.storage.sync` for the current test.
    applyDefaultStorageSyncMocks(
        globalThis.chrome?.storage?.sync,
        "beforeEach on globalThis.chrome"
    );
});

console.log(
    'Vitest global setup: `chrome` API is mocked. Pre-emptive and per-test baseline mocks for `storage.sync.get/set` are configured via a shared function.'
);