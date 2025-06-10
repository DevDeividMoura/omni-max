// src/popup/index.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mock, type MockedFunction } from 'vitest';
import { mount as svelteMount } from 'svelte';
import OmniMaxPopupComponent from '../components/OmniMaxPopup.svelte';

vi.mock('svelte', () => ({
  mount: vi.fn(),
}));

vi.mock('../components/OmniMaxPopup.svelte', () => ({
  default: class MockedOmniMaxPopup { },
}));

const mount = svelteMount as MockedFunction<typeof svelteMount>;
const OmniMaxPopup = OmniMaxPopupComponent as unknown as typeof OmniMaxPopupComponent;

describe('Popup Initialization Script (src/popup/index.ts)', () => {
  let getElementByIdSpy: Mock<(elementId: string) => HTMLElement | null>;
  let consoleErrorSpy: Mock<(...args: any[]) => void>;
  let addEventListenerSpy: Mock<(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void>;
  let mockAppElement: HTMLElement | null;
  let originalReadyState: DocumentReadyState;

  beforeEach(() => {
    vi.useFakeTimers(); // Habilita o uso de temporizadores falsos
    vi.resetAllMocks();

    vi.mocked(chrome.tabs.query).mockImplementation((...args: any[]) => {
      const callback = args.find(arg => typeof arg === 'function');
      const mockTabs = [{ id: 123 } as chrome.tabs.Tab];
      if (callback) {
        callback(mockTabs);
      }
      return Promise.resolve(mockTabs);
    });

    vi.mocked(chrome.tabs.sendMessage).mockImplementation((...args: any[]) => {
      const callback = args.find(arg => typeof arg === 'function');
      const mockResponse = { locale: 'pt-BR' };
      if (callback) {
        callback(mockResponse);
      }
      return Promise.resolve(mockResponse);
    });

    getElementByIdSpy = vi.spyOn(document, 'getElementById') as Mock;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { }) as Mock;
    addEventListenerSpy = vi.spyOn(document, 'addEventListener') as Mock;

    mockAppElement = document.createElement('div');
    mockAppElement.id = 'app';
    document.body.innerHTML = '';
    document.body.appendChild(mockAppElement);
    getElementByIdSpy.mockReturnValue(mockAppElement);

    originalReadyState = document.readyState;
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (mockAppElement && mockAppElement.parentNode) {
      mockAppElement.parentNode.removeChild(mockAppElement);
    }
    mockAppElement = null;

    Object.defineProperty(document, 'readyState', {
      value: originalReadyState,
      writable: true,
      configurable: true,
    });
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers(); // Restaura os temporizadores reais
  });

  async function executePopupScript() {
    vi.resetModules();
    await import('../popup/index');
  }

  describe('render function behavior (triggered by script execution)', () => {
    it('should find #app, clear its innerHTML, and mount OmniMaxPopup if #app exists', async () => {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      getElementByIdSpy.mockReturnValue(mockAppElement);

      await executePopupScript();
      await vi.runAllTimersAsync();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app');
      expect(mockAppElement!.innerHTML).toBe('');
      expect(mount).toHaveBeenCalledOnce();
      expect(mount).toHaveBeenCalledWith(OmniMaxPopup, { target: mockAppElement });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log an error if #app element is not found', async () => {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      getElementByIdSpy.mockReturnValue(null);

      await executePopupScript();
      await vi.runAllTimersAsync();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app');
      expect(mount).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Target element #app not found in popup.html");
    });
  });

  describe('Script execution timing based on document.readyState', () => {
    it('should call render logic immediately if document.readyState is "interactive"', async () => {
      Object.defineProperty(document, 'readyState', { value: 'interactive', configurable: true });
      getElementByIdSpy.mockReturnValue(mockAppElement);

      await executePopupScript();
      await vi.runAllTimersAsync();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app');
      expect(mount).toHaveBeenCalledOnce();
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    it('should call render logic immediately if document.readyState is "complete"', async () => {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      getElementByIdSpy.mockReturnValue(mockAppElement);

      await executePopupScript();
      await vi.runAllTimersAsync();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app');
      expect(mount).toHaveBeenCalledOnce();
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    it('should add DOMContentLoaded listener and then render if document.readyState is "loading"', async () => {
      Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

      await executePopupScript();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
      expect(getElementByIdSpy).not.toHaveBeenCalled();
      expect(mount).not.toHaveBeenCalled();

      const domContentLoadedCallback = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'DOMContentLoaded'
      )?.[1];

      if (typeof domContentLoadedCallback !== 'function') {
        throw new Error('DOMContentLoaded listener was not added or was not a function');
      }

      getElementByIdSpy.mockReturnValue(mockAppElement);
      // Invoca o listener, que por sua vez chama a função async `render`
      (domContentLoadedCallback as EventListener)(new Event('DOMContentLoaded'));
      
      // Agora, esperamos que as operações assíncronas dentro de `render` terminem
      await vi.runAllTimersAsync();

      expect(getElementByIdSpy).toHaveBeenCalledWith('app');
      expect(mount).toHaveBeenCalledOnce();
    });
  });
});