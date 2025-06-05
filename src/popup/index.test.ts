/**
 * @file src/popup/index.test.ts
 * @description Unit tests for the popup initialization script (src/popup/index.ts).
 * These tests verify the rendering logic and DOM interaction based on document readyState.
 */
/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach, type Mock, type MockedFunction } from 'vitest';

import { mount as svelteMount } from 'svelte';
import OmniMaxPopupComponent from '../components/OmniMaxPopup.svelte'; // Adjust path if necessary for your project structure

// Mock the 'svelte' module, specifically its 'mount' function.
vi.mock('svelte', () => ({
  mount: vi.fn(),
}));

// Mock the main Svelte component used by the popup.
vi.mock('../components/OmniMaxPopup.svelte', () => ({ // Adjust path if necessary
  default: class MockedOmniMaxPopup { }, // Simple class mock for the component
}));

// Properly type 'mount' as a mocked function of svelteMount's type.
const mount = svelteMount as MockedFunction<typeof svelteMount>;
// Cast the imported component to its expected type for use in mount assertions.
const OmniMaxPopup = OmniMaxPopupComponent as unknown as typeof OmniMaxPopupComponent;

/**
 * @describe Popup Initialization Script (src/popup/index.ts)
 * @description Contains tests for the script that initializes the browser action popup.
 */
describe('Popup Initialization Script (src/popup/index.ts)', () => {
  // Type spies using the function signature as the generic argument for Vitest's Mock type.
  let getElementByIdSpy: Mock<(elementId: string) => HTMLElement | null>;
  let consoleErrorSpy: Mock<(...args: any[]) => void>; // Generic mock for console.error
  let addEventListenerSpy: Mock<
    (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void
  >;
  let mockAppElement: HTMLElement | null;
  let originalReadyState: DocumentReadyState;

  beforeEach(() => {
    vi.resetAllMocks(); // Reset all mocks to a clean state before each test

    // Spy on document.getElementById and console.error
    getElementByIdSpy = vi.spyOn(document, 'getElementById') as Mock<(elementId: string) => HTMLElement | null>;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { }) as Mock<(...args: any[]) => void>;
    addEventListenerSpy = vi.spyOn(document, 'addEventListener') as Mock<
      (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void
    >;

    // Create and append a mock #app element to the document body for tests
    mockAppElement = document.createElement('div');
    mockAppElement.id = 'app';
    document.body.innerHTML = ''; // Clear body
    document.body.appendChild(mockAppElement);
    getElementByIdSpy.mockReturnValue(mockAppElement); // Default mock for getElementById

    // Save and mock document.readyState
    originalReadyState = document.readyState;
    Object.defineProperty(document, 'readyState', {
      value: 'complete', // Default to 'complete' for most tests, can be overridden
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up the mock #app element
    if (mockAppElement && mockAppElement.parentNode) {
      mockAppElement.parentNode.removeChild(mockAppElement);
    }
    mockAppElement = null;

    // Restore original document.readyState
    Object.defineProperty(document, 'readyState', {
      value: originalReadyState,
      writable: true,
      configurable: true,
    });
    vi.resetModules(); // Important for re-importing the script in executePopupScript
    vi.restoreAllMocks(); // Restore original implementations of spied functions
  });

  /**
   * @function executePopupScript
   * @description Helper function to re-import and execute the popup script.
   * `vi.resetModules()` is called before import to ensure the script runs afresh.
   */
  async function executePopupScript() {
    vi.resetModules(); // Ensures the script's top-level code runs again
    await import('../popup/index'); // Adjust path based on your test file's location
  }

  /**
   * @describe render function behavior (triggered by script execution)
   * @description Tests the core logic of the render function.
   */
  describe('render function behavior (triggered by script execution)', () => {
    it('should find #app, clear its innerHTML, and mount OmniMaxPopup if #app exists', async () => {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      getElementByIdSpy.mockReturnValue(mockAppElement); // Ensure #app is found

      await executePopupScript();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app');
      expect(mockAppElement!.innerHTML).toBe(''); // Check if content was cleared
      expect(mount).toHaveBeenCalledOnce();
      expect(mount).toHaveBeenCalledWith(OmniMaxPopup, { target: mockAppElement });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log an error if #app element is not found', async () => {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      getElementByIdSpy.mockReturnValue(null); // Simulate #app not being found

      await executePopupScript();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app');
      expect(mount).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Target element #app not found in popup.html");
    });
  });

  /**
   * @describe Script execution timing based on document.readyState
   * @description Tests how the script behaves with different document.readyState values.
   */
  describe('Script execution timing based on document.readyState', () => {
    it('should call render logic immediately if document.readyState is "interactive"', async () => {
      Object.defineProperty(document, 'readyState', { value: 'interactive', configurable: true });
      getElementByIdSpy.mockReturnValue(mockAppElement);

      await executePopupScript();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app'); // render() should have been called
      expect(mount).toHaveBeenCalledOnce();
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    it('should call render logic immediately if document.readyState is "complete"', async () => {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      getElementByIdSpy.mockReturnValue(mockAppElement);

      await executePopupScript();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app'); // render() should have been called
      expect(mount).toHaveBeenCalledOnce();
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    it('should add DOMContentLoaded listener and then render if document.readyState is "loading"', async () => {
      Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

      await executePopupScript();

      // Initially, render should not be called directly
      expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
      expect(getElementByIdSpy).not.toHaveBeenCalled();
      expect(mount).not.toHaveBeenCalled();

      // Find and invoke the DOMContentLoaded callback
      const domContentLoadedCallback = addEventListenerSpy.mock.calls.find(
        (call: [string, EventListenerOrEventListenerObject | null, ...any[]]) => call[0] === 'DOMContentLoaded'
      )?.[1];

      if (typeof domContentLoadedCallback === 'function') {
        getElementByIdSpy.mockReturnValue(mockAppElement); // Ensure #app is found when callback runs
        domContentLoadedCallback(new Event('DOMContentLoaded')); // Simulate event

        // Now render should have been called
        expect(getElementByIdSpy).toHaveBeenCalledWith('app');
        expect(mount).toHaveBeenCalledOnce();
      } else {
        // This ensures the test fails if the listener was not correctly added.
        throw new Error('DOMContentLoaded listener was not added or was not a function');
      }
    });
  });
});