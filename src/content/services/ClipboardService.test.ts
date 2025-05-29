/**
 * @file src/content/services/ClipboardService.test.ts
 * @description Unit tests for the ClipboardService class.
 * These tests mock the `navigator.clipboard` API to verify the service's behavior
 * under various conditions, including successful copies, invalid inputs, and API errors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipboardService } from './ClipboardService';

/**
 * Mock implementation for the `navigator.clipboard` API.
 */
const mockClipboardAPI = {
  writeText: vi.fn(),
};

// Stores the original `navigator` object if it exists, to be restored after tests.
let originalNavigatorObject: typeof navigator | undefined;

/**
 * Test suite for the `ClipboardService`.
 */
describe('ClipboardService', () => {
  let clipboardService: ClipboardService;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clipboardService = new ClipboardService();

    // Save the original navigator object (if it exists in the test environment)
    // and replace `global.navigator` with a mock for clipboard operations.
    if (typeof globalThis.navigator !== 'undefined') {
      originalNavigatorObject = globalThis.navigator;
    }
    // @ts-expect-error: Overriding the global navigator for testing purposes.
    global.navigator = {
      clipboard: mockClipboardAPI,
    } as typeof navigator;

    // `vi.resetAllMocks()` is called to clear history and implementations from `mockClipboardAPI.writeText`
    // and any other mocks that might have been set up by `vitest-chrome` or other global setups.
    vi.resetAllMocks();

    // Spy on console methods to verify outputs and suppress them during tests.
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console method spies.
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Restore the original navigator object.
    if (originalNavigatorObject) {
      // @ts-expect-error: Restoring original navigator.
      global.navigator = originalNavigatorObject;
      originalNavigatorObject = undefined; // Clear for next test if needed
    } else {
      // If navigator didn't exist initially, delete the mock.
      // @ts-expect-error: Deleting potentially non-existent property.
      delete global.navigator;
    }
  });

  /**
   * Test suite for the `copy` method of `ClipboardService`.
   */
  describe('copy method', () => {
    /**
     * Tests that valid text is successfully copied to the clipboard,
     * a success message is logged, and the method returns true.
     */
    it('should copy valid text, log success, and return true', async () => {
      const textToCopy = 'Sample text for clipboard';
      const label = 'Test Data Label';
      mockClipboardAPI.writeText.mockResolvedValue(undefined); // Simulate successful writeText

      const result = await clipboardService.copy(textToCopy, label);

      expect(result).toBe(true);
      expect(mockClipboardAPI.writeText).toHaveBeenCalledOnce();
      expect(mockClipboardAPI.writeText).toHaveBeenCalledWith(textToCopy);
      expect(consoleLogSpy).toHaveBeenCalledOnce();
      expect(consoleLogSpy).toHaveBeenCalledWith(`Omni Max [ClipboardService]: ${label} "${textToCopy}" copied!`);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    /**
     * Test cases for invalid text inputs (null, undefined, empty, whitespace).
     * Ensures `copy` returns false and logs a warning without calling `writeText`.
     */
    const invalidTextTestCases = [
      { description: 'null', value: null, label: 'Null Data Label' },
      { description: 'undefined', value: undefined, label: 'Undefined Data Label' },
      { description: 'an empty string', value: '', label: 'Empty String Label' },
      { description: 'only whitespace', value: '   \t\n   ', label: 'Whitespace Label' },
    ];

    invalidTextTestCases.forEach(testCase => {
      it(`should return false and warn if text is ${testCase.description}`, async () => {
        const result = await clipboardService.copy(testCase.value, testCase.label);

        expect(result).toBe(false);
        expect(mockClipboardAPI.writeText).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledOnce();
        expect(consoleWarnSpy).toHaveBeenCalledWith(`Omni Max [ClipboardService]: No valid ${testCase.label} found to copy.`);
        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    /**
     * Tests that if `navigator.clipboard.writeText` promise rejects,
     * the method returns false and logs an error.
     */
    it('should return false and log error if navigator.clipboard.writeText fails', async () => {
      const textToCopy = 'Some valid text';
      const label = 'Data That Causes Error';
      const expectedError = new Error('Simulated Clipboard API error');
      mockClipboardAPI.writeText.mockRejectedValue(expectedError);

      const result = await clipboardService.copy(textToCopy, label);

      expect(result).toBe(false);
      expect(mockClipboardAPI.writeText).toHaveBeenCalledExactlyOnceWith(textToCopy);
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Omni Max [ClipboardService]: Failed to copy ${label}:`, expectedError);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * Tests that if `navigator.clipboard` itself is undefined (e.g., in a non-secure context or older browser),
     * the method handles the TypeError gracefully, returns false, and logs an error.
     */
    it('should return false and log error if navigator.clipboard itself is undefined', async () => {
      // @ts-expect-error: Forcing navigator.clipboard to be undefined for this specific test.
      global.navigator.clipboard = undefined;
      
      const textToCopy = "Text when clipboard is missing";
      const label = "Data with No Clipboard API";

      // The ClipboardService instance uses the global navigator, so this change will be picked up.
      const result = await clipboardService.copy(textToCopy, label);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      // Check that the error message contains the expected prefix and the error object is a TypeError.
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(`Omni Max [ClipboardService]: Failed to copy ${label}:`);
      expect(consoleErrorSpy.mock.calls[0][1]).toBeInstanceOf(TypeError);
      // `writeText` should not have been called if `navigator.clipboard` was undefined.
      expect(mockClipboardAPI.writeText).not.toHaveBeenCalled();
    });
  });
});