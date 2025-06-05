// src/content/services/TemplateHandlingService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
import {
  globalExtensionEnabledStore,
  moduleStatesStore,
} from '../../storage/stores';
import { TemplateHandlingService } from './TemplateHandlingService';
import type { DomService } from './DomService';
import type { Config } from '../config';

// --- Mocks for Dependencies ---
let mockDomServiceInstance: Mocked<DomService>;

const MOCK_CONFIG: Config = {
  selectors: {
    conversaContainer: '.conversa',
    editableChatbox: ".test-editable-chatbox", // Crucial
    cpfInfoContainer: 'small',
    cpfLabelQueryInContainer: 'strong',
    nameInfoContainer: 'small',
    phoneInfoContainer: 'small',
    phoneLabelQueryInContainer: 'strong',
    protocolInfoContainer: 'small',
    protocolLabelQueryInContainer: 'strong',
    tabsList: '#tabs',
  },
  textMarkers: {
    cpfLabel: 'CPF Cliente:',
    customerNameIndicator: 'Matrícula:',
    customerNameSeparator: ' - ',
    phoneLabel: 'Telefone:',
    protocolLabel: 'Número de protocolo:',
  },
};

// Mock Selection API
const mockRange = {
  setStart: vi.fn(),
  setEnd: vi.fn(),
  selectNodeContents: vi.fn(),
  collapse: vi.fn(),
} as unknown as Range;

const mockSelection = {
  removeAllRanges: vi.fn(),
  addRange: vi.fn(),
  toString: vi.fn(() => ''),
} as unknown as Selection;

// --- Test Suite ---
describe('TemplateHandlingService', () => {
  let service: TemplateHandlingService;
  let container: HTMLElement;

  const createKeyboardEvent = (key: string, target: HTMLElement) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'target', { value: target, writable: false });
    // Não vamos mais espionar preventDefault/stopPropagation aqui, pois não são esperados
    // vi.spyOn(ev, 'preventDefault');
    // vi.spyOn(ev, 'stopPropagation');
    return ev;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockDomServiceInstance = {
      getTextSafely: vi.fn().mockReturnValue(''),
      waitNextFrame: vi.fn().mockResolvedValue(undefined),
      getTextNodeAndOffsetAtCharIndex: vi.fn(),
      moveCursorToEnd: vi.fn(),
      query: vi.fn(),
      queryAll: vi.fn(),
      applyStyles: vi.fn(),
      createElementWithOptions: vi.fn(),
    } as Mocked<DomService>;

    globalExtensionEnabledStore.set(true);
    moduleStatesStore.set({ templateProcessor: true });

    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);
    vi.spyOn(document, 'createRange').mockReturnValue(mockRange);

    service = new TemplateHandlingService(MOCK_CONFIG, mockDomServiceInstance);

    container = document.createElement('div');
    container.className = MOCK_CONFIG.selectors.editableChatbox.slice(1);
    container.setAttribute('contenteditable', 'true');
    document.body.appendChild(container);

    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    vi.restoreAllMocks();
  });

  describe('Listeners', () => {
    // Estes testes permanecem os mesmos
    it('attachListeners should add keydown listener', () => {
      service.attachListeners();
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });

    it('detachListeners should remove keydown listener', () => {
      service.attachListeners();
      service.detachListeners();
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });
  });

  describe('onKeyDown()', () => {
    // Estes testes permanecem os mesmos em sua verificação de 'not.toHaveBeenCalled()'
    // para preventDefault, pois nesses cenários a lógica principal não é acionada.
    it('does nothing if global disabled', async () => {
      globalExtensionEnabledStore.set(false);
      const ev = createKeyboardEvent('Tab', container);
      vi.spyOn(ev, 'preventDefault'); // Espionar aqui para este teste específico
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing if module disabled', async () => {
      moduleStatesStore.set({ templateProcessor: false });
      const ev = createKeyboardEvent('Tab', container);
      vi.spyOn(ev, 'preventDefault'); // Espionar aqui
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing if key is not Tab', async () => {
      const ev = createKeyboardEvent('Enter', container);
      vi.spyOn(ev, 'preventDefault'); // Espionar aqui
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing if target does not match selector', async () => {
      const otherDiv = document.createElement('div');
      const ev = createKeyboardEvent('Tab', otherDiv);
      vi.spyOn(ev, 'preventDefault'); // Espionar aqui
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    // TESTE AJUSTADO AQUI
    it('calls handleTabPressLogic on valid Tab but does NOT prevent default', async () => {
      container.textContent = 'Hello [VARIABLE]';
      mockDomServiceInstance.getTextSafely.mockReturnValue(container.textContent);

      const spyLogic = vi.spyOn(service as any, 'handleTabPressLogic').mockResolvedValue(undefined);
      const ev = createKeyboardEvent('Tab', container);
      const preventDefaultSpy = vi.spyOn(ev, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(ev, 'stopPropagation');

      await (service as any).onKeyDown(ev);

      // Agora esperamos que preventDefault e stopPropagation NÃO sejam chamados
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(stopPropagationSpy).not.toHaveBeenCalled();
      expect(spyLogic).toHaveBeenCalledWith(container); // A lógica principal ainda deve ser chamada
    });
  });

  describe('handleTabPressLogic()', () => {
    const setupContainerForLogicTest = (initialText: string) => {
      container.textContent = initialText;
      mockDomServiceInstance.getTextSafely.mockReturnValue(container.textContent || '');
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      const textNode = document.createTextNode(initialText);
      container.appendChild(textNode);
      return textNode;
    };

    const setupNodeOffsetMocks = (textNode: Text, startIdx: number, startOff: number, endIdx: number, endOff: number) => {
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex
        .mockImplementation((rootNode, charIndex) => {
          if (rootNode === container) {
            if (charIndex === startIdx) return { node: textNode, offset: startOff };
            if (charIndex === endIdx) return { node: textNode, offset: endOff };
          }
          if (charIndex >= 0 && charIndex <= (textNode.nodeValue?.length ?? 0)) return { node: textNode, offset: charIndex };
          return null;
        });
    };

    it('transforms {FULL NAME} and moves cursor end if no variables', async () => {
      setupContainerForLogicTest('Hello {ANA MARIA SOUZA}!');
      await (service as any).handleTabPressLogic(container);
      expect(container.textContent).toBe('Hello Ana!');
      expect(mockDomServiceInstance.waitNextFrame).toHaveBeenCalled();
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container);
    });

    it('selects first [VAR] placeholder', async () => {
      const txt = 'Check [ABC123] now';
      const textNode = setupContainerForLogicTest(txt);
      setupNodeOffsetMocks(textNode, 6, 6, 14, 14);

      await (service as any).handleTabPressLogic(container);

      expect(mockRange.setStart).toHaveBeenCalledWith(textNode, 6);
      expect(mockRange.setEnd).toHaveBeenCalledWith(textNode, 14);
      expect(mockSelection.removeAllRanges).toHaveBeenCalled();
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
    });

    it('transforms then selects variable', async () => {
      const raw = 'Hi {CARLOS} [X1]';
      setupContainerForLogicTest(raw);

      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex.mockImplementation((rootNode, charIndex) => {
        if (rootNode === container && container.firstChild && container.firstChild.nodeType === Node.TEXT_NODE) {
          const currentTextNode = container.firstChild as Text;
          if (currentTextNode.nodeValue === 'Hi Carlos [X1]') {
            if (charIndex === 10) return { node: currentTextNode, offset: 10 };
            if (charIndex === 14) return { node: currentTextNode, offset: 14 };
          }
        }
        return null;
      });

      await (service as any).handleTabPressLogic(container);

      expect(container.textContent).toBe('Hi Carlos [X1]');
      expect(mockDomServiceInstance.waitNextFrame).toHaveBeenCalled();
      const textNodeAfterTransform = container.firstChild as Text;
      expect(textNodeAfterTransform).toBeTruthy();
      if (textNodeAfterTransform) { // Type guard
        expect(mockRange.setStart).toHaveBeenCalledWith(textNodeAfterTransform, 10);
        expect(mockRange.setEnd).toHaveBeenCalledWith(textNodeAfterTransform, 14);
      }
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
    });

    it('moves cursor end if no placeholders', async () => {
      setupContainerForLogicTest('Just text');
      await (service as any).handleTabPressLogic(container);
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container);
    });

    it('warns and moves cursor end if start node missing', async () => {
      const txt = '[X]';
      const textNode = setupContainerForLogicTest(txt);
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ node: textNode, offset: 2 });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
      await (service as any).handleTabPressLogic(container);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Omni Max [TemplateHandling]: Could not find text nodes for variable selection. Moving cursor to end."
      );
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container);
      consoleWarnSpy.mockRestore();
    });

    it('catches range errors and moves cursor end', async () => {
      const txt = '[Y]';
      const textNode = setupContainerForLogicTest(txt);
      setupNodeOffsetMocks(textNode, 0, 0, 3, 3);

      const error = new Error('fail');
      vi.mocked(mockRange.setStart).mockImplementation(() => { throw error; });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      await (service as any).handleTabPressLogic(container);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Omni Max [TemplateHandling]: Error setting range for variable selection. Moving cursor to end.",
        error
      );
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container);
      consoleWarnSpy.mockRestore();
    });

    it('should select only the first variable if multiple [VARIABLES] exist', async () => {
      const textWithMultipleVars = "First [VAR_A] then [VAR_B].";
      const textNode = setupContainerForLogicTest(textWithMultipleVars);
      setupNodeOffsetMocks(textNode, 6, 6, 13, 13);

      await (service as any).handleTabPressLogic(container);

      expect(mockRange.setStart).toHaveBeenCalledWith(textNode, 6);
      expect(mockRange.setEnd).toHaveBeenCalledWith(textNode, 13);
      expect(mockSelection.addRange).toHaveBeenCalledOnce();
    });

    describe('transformTemplateText (multiline support)', () => {
      it('preserves blank lines when replacing the name placeholder', () => {
        const raw = `{NOME DO CLIENTE} entrou no sistema.\n\nPor favor, verifique o status.`;
        const result = (service as any).transformTemplateText(raw);
        expect(result).toBe(`Nome entrou no sistema.\n\nPor favor, verifique o status.`);
      });
    });

    it('keeps blank lines after name transform when using textContent', async () => {
      const tpl = `{NOME DO CLIENTE} testando.\n\nLinha seguinte após duas quebras.`;
      setupContainerForLogicTest(tpl);

      await (service as any).handleTabPressLogic(container);

      expect(container.textContent).toBe(`Nome testando.\n\nLinha seguinte após duas quebras.`);
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container);
    });
  });
});