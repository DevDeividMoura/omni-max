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
// Não é estritamente necessário mockar '../config' se você sempre passa MOCK_CONFIG diretamente.
// Se TemplateHandlingService importasse CONFIG diretamente, aí o mock seria necessário.
// vi.mock('../config', () => ({ CONFIG: MOCK_CONFIG }));


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
  let container: HTMLElement; // Este será o nosso 'editableDiv' mock

  const createKeyboardEvent = (key: string, target: HTMLElement) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'target', { value: target, writable: false });
    vi.spyOn(ev, 'preventDefault');
    vi.spyOn(ev, 'stopPropagation');
    return ev;
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Configurar o mock para DomService ANTES de instanciar o TemplateHandlingService
    mockDomServiceInstance = {
      getTextSafely: vi.fn().mockReturnValue(''), // << RETORNO PADRÃO IMPORTANTE
      waitNextFrame: vi.fn().mockResolvedValue(undefined),
      getTextNodeAndOffsetAtCharIndex: vi.fn(),
      moveCursorToEnd: vi.fn(),
      query: vi.fn(), // Adicione todos os métodos usados se necessário
      queryAll: vi.fn(),
      applyStyles: vi.fn(),
      createElementWithOptions: vi.fn(),
    } as Mocked<DomService>;

    // Resetar stores
    globalExtensionEnabledStore.set(true);
    moduleStatesStore.set({ templateProcessor: true });

    // Mockar APIs de seleção do DOM
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);
    vi.spyOn(document, 'createRange').mockReturnValue(mockRange);

    // Instanciar o serviço com o MOCK_CONFIG e o mockDomServiceInstance
    service = new TemplateHandlingService(MOCK_CONFIG, mockDomServiceInstance);

    // Preparar um div editável falso
    container = document.createElement('div');
    container.className = MOCK_CONFIG.selectors.editableChatbox.slice(1); // Remove o '.' inicial
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
    it('attachListeners should add keydown listener', () => {
      service.attachListeners();
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });

    it('detachListeners should remove keydown listener', () => {
      service.attachListeners(); // Adiciona primeiro
      service.detachListeners();
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });
  });

  describe('onKeyDown()', () => {
    it('does nothing if global disabled', async () => {
      globalExtensionEnabledStore.set(false);
      const ev = createKeyboardEvent('Tab', container);
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing if module disabled', async () => {
      moduleStatesStore.set({ templateProcessor: false });
      const ev = createKeyboardEvent('Tab', container);
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing if key is not Tab', async () => {
      const ev = createKeyboardEvent('Enter', container);
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing if target does not match selector', async () => {
      const otherDiv = document.createElement('div'); // Um elemento que não corresponde ao seletor
      const ev = createKeyboardEvent('Tab', otherDiv);
      await (service as any).onKeyDown(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('prevents default and calls handleTabPressLogic on valid Tab', async () => {
      // Definir um textContent para o container para este teste
      container.textContent = 'Hello [VARIABLE]';
      // Garantir que getTextSafely retorne o conteúdo do container para este teste
      mockDomServiceInstance.getTextSafely.mockReturnValue(container.textContent);

      const spyLogic = vi.spyOn(service as any, 'handleTabPressLogic').mockResolvedValue(undefined); // Mockar como async
      const ev = createKeyboardEvent('Tab', container);
      await (service as any).onKeyDown(ev);

      expect(ev.preventDefault).toHaveBeenCalled(); // Deve ser chamado agora
      expect(ev.stopPropagation).toHaveBeenCalled(); // Deve ser chamado agora
      expect(spyLogic).toHaveBeenCalledWith(container);
    });
  });

  describe('handleTabPressLogic()', () => {
    // Helper para configurar o container e mocks para testes de handleTabPressLogic
    const setupContainerForLogicTest = (initialText: string) => {
      container.textContent = initialText;
      // O mock padrão no beforeEach já faz mockReturnValue('')
      // Para testes específicos, sobrescrevemos se necessário:
      mockDomServiceInstance.getTextSafely.mockReturnValue(container.textContent || '');

      // Limpar e recriar o nó de texto filho se já existir, para que os offsets sejam corretos
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
          // Fallback para outros casos ou se o nó de texto não for o esperado
          // Isso pode precisar de ajuste se a estrutura interna do container for mais complexa
          if (charIndex >= 0 && charIndex <= textNode.length) return { node: textNode, offset: charIndex };
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
      // [ABC123] -> '[' é o índice 6. ']' é o índice 13. endIndex + 1 = 14
      setupNodeOffsetMocks(textNode, 6, 6, 14, 14); // Seleciona '[ABC123]'

      await (service as any).handleTabPressLogic(container);

      expect(mockRange.setStart).toHaveBeenCalledWith(textNode, 6);
      expect(mockRange.setEnd).toHaveBeenCalledWith(textNode, 14); // +1 para incluir o ']'
      expect(mockSelection.removeAllRanges).toHaveBeenCalled();
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
    });

    it('transforms then selects variable', async () => {
      const raw = 'Hi {CARLOS} [X1]';
      setupContainerForLogicTest(raw); // getTextSafely retornará 'Hi {CARLOS} [X1]' inicialmente

      // Após a transformação, o textContent se tornará 'Hi Carlos [X1]'
      // e um novo nó de texto será efetivamente criado/atualizado.
      // O `findSelectableVariables` operará em "Hi Carlos [X1]".
      // [X1] -> '[' no índice 10. ']' no índice 13. endIndex + 1 = 14
      // (H=0, i=1,  =2, C=3, a=4, r=5, l=6, o=7, s=8,  =9, [=10, X=11, 1=12, ]=13) -> Erro meu no cálculo anterior, o correto é:
      // H i   C a r l o s   [ X  1  ]
      // 0 1 2 3 4 5 6 7 8 9 10 11 12 13
      // Então, startIndex é 10, endIndex é 13. endIndex + 1 é 14.

      // Mock para getTextNodeAndOffsetAtCharIndex precisa considerar o texto transformado
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex.mockImplementation((rootNode, charIndex) => {
        if (rootNode === container && container.firstChild && container.firstChild.nodeType === Node.TEXT_NODE) {
          const currentTextNode = container.firstChild as Text;
          // Esperamos que o nó de texto seja o transformado
          if (currentTextNode.nodeValue === 'Hi Carlos [X1]') {
            if (charIndex === 10) return { node: currentTextNode, offset: 10 }; // '['
            if (charIndex === 14) return { node: currentTextNode, offset: 14 }; // após ']'
          }
        }
        return null;
      });

      await (service as any).handleTabPressLogic(container);

      expect(container.textContent).toBe('Hi Carlos [X1]');
      expect(mockDomServiceInstance.waitNextFrame).toHaveBeenCalled();
      const textNodeAfterTransform = container.firstChild as Text;
      expect(textNodeAfterTransform).toBeTruthy();
      expect(mockRange.setStart).toHaveBeenCalledWith(textNodeAfterTransform, 10);
      expect(mockRange.setEnd).toHaveBeenCalledWith(textNodeAfterTransform, 14);
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
        .mockReturnValueOnce(null) // Simula falha ao encontrar o nó inicial
        .mockReturnValueOnce({ node: textNode, offset: 2 }); // Nó final encontrado

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
      // '[' no índice 0, ']' no índice 2. endIndex + 1 = 3
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
      // [VAR_A] -> '[' no índice 6. ']' no índice 12. endIndex + 1 = 13
      setupNodeOffsetMocks(textNode, 6, 6, 13, 13);

      await (service as any).handleTabPressLogic(container); // Acessando o método privado para teste

      expect(mockRange.setStart).toHaveBeenCalledWith(textNode, 6);
      expect(mockRange.setEnd).toHaveBeenCalledWith(textNode, 13);
      expect(mockSelection.addRange).toHaveBeenCalledOnce();
    });

    describe('transformTemplateText (multiline support)', () => {
      it('preserves blank lines when replacing the name placeholder', () => {
        const raw = `{NOME DO CLIENTE} entrou no sistema.\n\nPor favor, verifique o status.`;
        const result = (service as any).transformTemplateText(raw); // Acessando o método privado
        expect(result).toBe(`Nome entrou no sistema.\n\nPor favor, verifique o status.`);
      });
    });

    it('keeps blank lines after name transform when using textContent', async () => {
      const tpl = `{NOME DO CLIENTE} testando.\n\nLinha seguinte após duas quebras.`;
      setupContainerForLogicTest(tpl);

      await (service as any).handleTabPressLogic(container); // Acessando o método privado

      expect(container.textContent).toBe(`Nome testando.\n\nLinha seguinte após duas quebras.`);
      // Como não há [VARIAVEIS], deve mover o cursor para o fim
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container);
    });
  });
});