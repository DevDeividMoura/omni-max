/**
 * @file src/content/services/TemplateHandlingService.test.ts
 * @description Unit tests for the TemplateHandlingService class.
 * Mocks dependencies like DomService, Config, and chrome.storage to test template
 * transformation, variable selection, and event handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
// Import 'chrome' from vitest-chrome if your setup makes it available for mocking
// import { chrome } from 'vitest-chrome';
import { TemplateHandlingService } from './TemplateHandleService';
import type { DomService } from './DomService';
import type { Config } from '../config';

// --- Mocks for Dependencies ---
const mockDomServiceInstance = {
  getTextSafely: vi.fn(),
  waitNextFrame: vi.fn().mockResolvedValue(undefined),
  getTextNodeAndOffsetAtCharIndex: vi.fn(),
  moveCursorToEnd: vi.fn(),
  // createElementWithOptions not directly used by TemplateHandlingService but good to have if DomService mock is shared
  query: vi.fn(),
  queryAll: vi.fn(),
  applyStyles: vi.fn(),
  createElementWithOptions: vi.fn(),
};
vi.mock('./DomService', () => ({
  DomService: vi.fn(() => mockDomServiceInstance),
}));

const MOCK_CONFIG: Config = {
  selectors: {
    conversaContainer: '.conversa', // Not directly used by TemplateHandlingService but part of Config
    editableChatbox: ".test-editable-chatbox", // Crucial for this service
    // ... other selectors from your actual Config, if needed for completeness, though not directly used
    cpfInfoContainer: 'small',
    cpfLabelQueryInContainer: 'strong',
    nameInfoContainer: 'small',
    phoneInfoContainer: 'small',
    phoneLabelQueryInContainer: 'strong',
    protocolInfoContainer: 'small',
    protocolLabelQueryInContainer: 'strong',
    tabsList: '#tabs',
  },
  textMarkers: { // Not directly used by TemplateHandlingService but part of Config
    cpfLabel: 'CPF Cliente:',
    customerNameIndicator: 'Matrícula:',
    customerNameSeparator: ' - ',
    phoneLabel: 'Telefone:',
    protocolLabel: 'Número de protocolo:',
  },
};
vi.mock('../config', () => ({
  CONFIG: MOCK_CONFIG,
}));


// Mock Selection API
const mockRange = {
  setStart: vi.fn(),
  setEnd: vi.fn(),
  selectNodeContents: vi.fn(), // Not directly used by TemplateHandlingService for selection, but part of Range
  collapse: vi.fn(),           // Same as above
} as unknown as Range; // Cast to Range, we only care about setStart/setEnd for these tests

const mockSelection = {
  removeAllRanges: vi.fn(),
  addRange: vi.fn(),
  toString: vi.fn(() => ''), // Mock what getSelection().toString() might do if needed
  // Add other Selection properties/methods if service uses them
} as unknown as Selection; // Cast to Selection

// --- Test Suite ---
describe('TemplateHandlingService', () => {
  let templateHandlingService: TemplateHandlingService;
  let mockDomService: Mocked<DomService>;
  let mockEditableDiv: HTMLElement;
  let mockConsoleWarn: ReturnType<typeof vi.spyOn>;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;



  const createKeyboardEvent = (key: string, target: HTMLElement | null = mockEditableDiv): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    if (target) {
      Object.defineProperty(event, 'target', { writable: false, value: target });
    }
    vi.spyOn(event, 'preventDefault');
    vi.spyOn(event, 'stopPropagation');
    return event;
  };

  const setupMockChromeSettings = (globalEnabled: boolean, templateProcessorEnabled: boolean) => {
    vi.mocked(chrome.storage.sync.get).mockImplementation(((keys: string[], callback?: (items: any) => void) => {
      const result: Record<string, any> = {
        omniMaxGlobalEnabled: globalEnabled,
        omniMaxModuleStates: {
          templateProcessor: templateProcessorEnabled,
        },
      };
      if (typeof callback === 'function') {
        callback(result);
        return undefined;
      }
      return Promise.resolve(result);
    }) as any);
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup chrome API mock (assuming vitest-chrome makes it globalThis)
    // If not, you might need to set `globalThis.chrome` manually as in previous examples
    // or ensure your vitest-setup.ts handles it.
    if (!globalThis.chrome) {
      // @ts-expect-error - basic mock for storage if not provided by vitest-chrome globalThisly
      globalThis.chrome = { storage: { sync: { get: vi.fn() } } };
    } else if (!globalThis.chrome.storage) {
      // @ts-expect-error
      globalThis.chrome.storage = { sync: { get: vi.fn() } };
    } else if (!globalThis.chrome.storage.sync) {
      // @ts-expect-error
      globalThis.chrome.storage.sync = { get: vi.fn() };
    }
    // Ensure `get` is a Vitest mock function if it was pre-existing
    if (!vi.isMockFunction(globalThis.chrome.storage.sync.get)) {
      globalThis.chrome.storage.sync.get = vi.fn();
    }


    mockDomService = mockDomServiceInstance as any as Mocked<DomService>;
    templateHandlingService = new TemplateHandlingService(MOCK_CONFIG, mockDomService);

    mockEditableDiv = document.createElement('div');
    mockEditableDiv.className = MOCK_CONFIG.selectors.editableChatbox.substring(1); // Remove leading '.'
    mockEditableDiv.setAttribute('contenteditable', 'true');
    document.body.appendChild(mockEditableDiv);

    // Setup default enabled state
    setupMockChromeSettings(true, true);

    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);
    vi.spyOn(document, 'createRange').mockReturnValue(mockRange);

    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    document.body.removeChild(mockEditableDiv);
    vi.restoreAllMocks();
  });

  describe('Listeners', () => {
    it('should attach keydown listener on attachListeners()', () => {
      templateHandlingService.attachListeners();
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });

    it('should detach keydown listener on detachListeners()', () => {
      templateHandlingService.attachListeners(); // First attach
      templateHandlingService.detachListeners();
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });
  });

  describe('onKeyDown Handler', () => {
    it('should do nothing if global extension is disabled', async () => {
      setupMockChromeSettings(false, true);
      const event = createKeyboardEvent('Tab');
      await templateHandlingService['onKeyDown'](event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockDomService.getTextSafely).not.toHaveBeenCalled();
    });

    it('should do nothing if templateProcessor module is disabled', async () => {
      setupMockChromeSettings(true, false);
      const event = createKeyboardEvent('Tab');
      await templateHandlingService['onKeyDown'](event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should do nothing if key is not Tab', async () => {
      const event = createKeyboardEvent('Enter');
      await templateHandlingService['onKeyDown'](event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should do nothing if event target is not the configured editable chatbox', async () => {
      const otherDiv = document.createElement('div');
      const event = createKeyboardEvent('Tab', otherDiv);
      await templateHandlingService['onKeyDown'](event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should call preventDefault and handleTabPressLogic for Tab key on correct target when enabled', async () => {
      const handleTabPressLogicSpy = vi.spyOn(templateHandlingService as any, 'handleTabPressLogic');
      const event = createKeyboardEvent('Tab', mockEditableDiv);

      await templateHandlingService['onKeyDown'](event);

      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(event.stopPropagation).toHaveBeenCalledOnce();
      expect(handleTabPressLogicSpy).toHaveBeenCalledWith(mockEditableDiv);
    });
  });

  describe('handleTabPressLogic', () => {
    it('should transform {FULL NAME} to "Firstname" and move cursor to end if no [VARIABLES]', async () => {
      mockEditableDiv.textContent = "Hello {ANA MARIA SOUZA} how are you?";
      mockDomService.getTextSafely.mockReturnValue("Hello {ANA MARIA SOUZA} how are you?");

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      expect(mockEditableDiv.textContent).toBe("Hello Ana how are you?");
      expect(mockDomService.waitNextFrame).toHaveBeenCalledOnce();
      expect(mockDomService.moveCursorToEnd).toHaveBeenCalledWith(mockEditableDiv);
      expect(mockSelection.addRange).not.toHaveBeenCalled();
    });

    it('should select the first [VARIABLE] if present', async () => {
      const textWithVar = "Your code is [CODE123] and expires soon.";
      mockEditableDiv.textContent = textWithVar;
      mockDomService.getTextSafely.mockReturnValue(textWithVar);
      // Simulate finding [CODE123] at index 13 to 21 (inclusive of brackets)
      // [CODE123] -> 'C' is at index 14, ']' is at index 21
      // Start index for selection (of '[') is 13. End index (of ']') is 21.
      // We want to select from index 13 up to, but not including, index 22 (endIndex + 1)
      const mockStartNode = { nodeValue: textWithVar } as Text;
      mockDomService.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node: mockStartNode, offset: 13 }) // Start of '['
        .mockReturnValueOnce({ node: mockStartNode, offset: 22 }); // End of ']' + 1

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      expect(mockDomService.waitNextFrame).not.toHaveBeenCalled(); // No transformation
      expect(mockRange.setStart).toHaveBeenCalledWith(mockStartNode, 13);
      expect(mockRange.setEnd).toHaveBeenCalledWith(mockStartNode, 22);
      expect(mockSelection.removeAllRanges).toHaveBeenCalledOnce();
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
      expect(mockDomService.moveCursorToEnd).not.toHaveBeenCalled();
    });

    it('should transform {NAME} then select the first [VARIABLE]', async () => {
      const initialText = "Hi {JOÃO SILVA}, your pin is [PIN789].";
      const transformedText = "Hi João, your pin is [PIN789].";
      mockEditableDiv.textContent = initialText;

      // First call to getTextSafely (before transformation)
      mockDomService.getTextSafely.mockReturnValueOnce(initialText);
      // Second call to getTextSafely (after transformation, when finding variables)
      // This will be implicitly handled as mockEditableDiv.textContent is updated.
      // Or, if findSelectableVariables uses its own getTextSafely, mock that too.
      // For simplicity, let's assume findSelectableVariables uses the updated textContent.

      // [PIN789] in "Hi João, your pin is [PIN789]."
      // "Hi João, your pin is " -> length 22
      // '[' is at index 22. ']' is at index 29.
      const mockStartNode = { nodeValue: transformedText } as Text; // Node contains transformed text
      mockDomService.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node: mockStartNode, offset: 22 }) // Start of '['
        .mockReturnValueOnce({ node: mockStartNode, offset: 30 }); // End of ']' + 1

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      expect(mockEditableDiv.textContent).toBe(transformedText);
      expect(mockDomService.waitNextFrame).toHaveBeenCalledOnce();
      expect(mockRange.setStart).toHaveBeenCalledWith(mockStartNode, 22);
      expect(mockRange.setEnd).toHaveBeenCalledWith(mockStartNode, 30);
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
      expect(mockDomService.moveCursorToEnd).not.toHaveBeenCalled();
    });

    it('should move cursor to end if no placeholders are present', async () => {
      mockEditableDiv.textContent = "Plain text.";
      mockDomService.getTextSafely.mockReturnValue("Plain text.");

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      expect(mockEditableDiv.textContent).toBe("Plain text."); // No change
      expect(mockDomService.waitNextFrame).not.toHaveBeenCalled();
      expect(mockDomService.moveCursorToEnd).toHaveBeenCalledWith(mockEditableDiv);
    });

    it('should move cursor to end if [VARIABLE] found but getTextNodeAndOffsetAtCharIndex fails for start node', async () => {
      const textWithVar = "Value: [MY_VAR]";
      mockEditableDiv.textContent = textWithVar;
      mockDomService.getTextSafely.mockReturnValue(textWithVar);
      mockDomService.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce(null) // Simulate start node not found
        .mockReturnValueOnce({ node: {} as Text, offset: 1 }); // Dummy end node

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Omni Max [TemplateHandling]: Could not find text nodes for variable selection. Moving cursor to end."
      );
      expect(mockDomService.moveCursorToEnd).toHaveBeenCalledWith(mockEditableDiv);
    });

    it('should move cursor to end if [VARIABLE] found but range setting fails', async () => {
      const textWithVar = "Select [THIS_ONE]";
      mockEditableDiv.textContent = textWithVar;
      mockDomService.getTextSafely.mockReturnValue(textWithVar);
      const mockTextNode = { nodeValue: textWithVar } as Text;
      mockDomService.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node: mockTextNode, offset: 7 })
        .mockReturnValueOnce({ node: mockTextNode, offset: 17 });

      const rangeError = new Error("Simulated Range Error");
      vi.mocked(mockRange.setStart).mockImplementation(() => { throw rangeError; });

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Omni Max [TemplateHandling]: Error setting range for variable selection. Moving cursor to end.",
        rangeError
      );
      expect(mockDomService.moveCursorToEnd).toHaveBeenCalledWith(mockEditableDiv);
    });

    it('should correctly handle empty string from capitalizeFirstName in transformTemplateText', async () => {
      mockEditableDiv.textContent = "Hello { }"; // Space inside, capitalizeFirstName might return ''
      mockDomService.getTextSafely.mockReturnValue("Hello { }");

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);
      // Assuming capitalizeFirstName('') returns ''
      expect(mockEditableDiv.textContent).toBe("Hello ");
      expect(mockDomService.waitNextFrame).toHaveBeenCalledOnce();
      expect(mockDomService.moveCursorToEnd).toHaveBeenCalledWith(mockEditableDiv);
    });

    it('should select only the first variable if multiple [VARIABLES] exist', async () => {
      const textWithMultipleVars = "First [VAR_A] then [VAR_B].";
      mockEditableDiv.textContent = textWithMultipleVars;
      mockDomService.getTextSafely.mockReturnValue(textWithMultipleVars);

      // Mock for [VAR_A] -> '[' at index 6, ']' at 12
      const mockNode = { nodeValue: textWithMultipleVars } as Text;
      mockDomService.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node: mockNode, offset: 6 }) // Start of [VAR_A]
        .mockReturnValueOnce({ node: mockNode, offset: 13 }); // End of [VAR_A] + 1

      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      expect(mockRange.setStart).toHaveBeenCalledWith(mockNode, 6);
      expect(mockRange.setEnd).toHaveBeenCalledWith(mockNode, 13);
      expect(mockSelection.addRange).toHaveBeenCalledOnce(); // Only first variable selected
    });
    describe('transformTemplateText (multiline support)', () => {
      it('preserves blank lines when replacing the name placeholder', () => {
        // Template com placeholder de nome e duas quebras de linha
        const raw = `{NOME DO CLIENTE} entrou no sistema.

Por favor, verifique o status.`;
        // Chamamos o método direto
        const result = (templateHandlingService as any).transformTemplateText(raw);

        // O nome deve virar "Nome" e as quebras de linha devem permanecer
        expect(result).toBe(`Nome entrou no sistema.

Por favor, verifique o status.`);
      });
    });
    it('keeps blank lines after name transform when using textContent', async () => {
      // Template com placeholder e \n\n
      const tpl = `{NOME DO CLIENTE} testando.

Linha seguinte após duas quebras.`;
      mockEditableDiv.textContent = tpl;
      mockDomService.getTextSafely.mockReturnValueOnce(tpl);

      // Simula só o nome (sem nenhuma variável) para forçar só o transformTemplateText
      await templateHandlingService['handleTabPressLogic'](mockEditableDiv);

      // Verifica se ainda há \n\n no resultado
      expect(mockEditableDiv.textContent).toContain('\n\n');
    });




  });
});