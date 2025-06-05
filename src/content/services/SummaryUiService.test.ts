// src/content/services/SummaryUiService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked, type Mock } from 'vitest';
import { SummaryUiService, SUMMARY_BUTTON_CLASS } from './SummaryUiService';
import type { DomService } from './DomService';
import type { AIServiceManager } from '../../ai/AIServiceManager';
import type { MatrixApiService } from './MatrixApiService';
import type { SummaryCacheService } from './SummaryCacheService';
import type { ActiveChatContext, CustomerServiceSession } from '../types';
import { marked } from 'marked';

vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((text: string) => `<p>${text}</p>`), // Simples mock de parse
  },
}));

const SUMMARY_POPUP_HOST_ID = 'omni-max-summary-popup-host';

describe('SummaryUiService', () => {
  let mockDomService: Mocked<DomService>;
  let mockAiManager: Mocked<AIServiceManager>;
  let mockMatrixApiService: Mocked<MatrixApiService>;
  let mockSummaryCacheService: Mocked<SummaryCacheService>;
  let mockGetActiveChatContextCallback: Mock<() => ActiveChatContext | null>;  // Corrigido
  let summaryUiService: SummaryUiService;

  let mockHostElement: HTMLDivElement;
  let mockIsConnectedGetter: ReturnType<typeof vi.spyOn>;
  let mockShadowRoot: ShadowRoot;
  let mockPopupMainElement: HTMLElement;
  let mockPopupContentAreaElement: HTMLElement;
  let mockPopupOverlayElement: HTMLElement;
  let mockCloseButton: HTMLButtonElement;
  let updatePopupContentSpy: ReturnType<typeof vi.spyOn>;


  beforeEach(() => {
    mockDomService = {
      query: vi.fn(),
      createElementWithOptions: vi.fn(),
      applyStyles: vi.fn(),
      queryAll: vi.fn(),
      getTextSafely: vi.fn(),
      waitNextFrame: vi.fn().mockResolvedValue(undefined),
      getTextNodeAndOffsetAtCharIndex: vi.fn(),
      moveCursorToEnd: vi.fn(),
    } as Mocked<DomService>;

    mockAiManager = {
      generateSummary: vi.fn(),
      listModels: vi.fn(),
    } as unknown as Mocked<AIServiceManager>;

    mockMatrixApiService = {
      getAtendimentosByContato: vi.fn(),
    } as unknown as Mocked<MatrixApiService>;

    mockSummaryCacheService = {
      getSummary: vi.fn(),
      saveSummary: vi.fn(),
      removeSummary: vi.fn(),
      clearInvalidSummaries: vi.fn(),
    } as unknown as Mocked<SummaryCacheService>;

    mockGetActiveChatContextCallback = vi.fn<() => ActiveChatContext | null>();

    mockHostElement = document.createElement('div');
    mockIsConnectedGetter = vi.spyOn(mockHostElement, 'isConnected', 'get');
    mockIsConnectedGetter.mockReturnValue(false); // Padrão: não conectado

    mockShadowRoot = {
      appendChild: vi.fn(),
      querySelector: vi.fn(),
      // Adicionar outros métodos do ShadowRoot se o serviço os utilizar diretamente
    } as unknown as ShadowRoot;
    // Corrigido: Definir attachShadow no protótipo ou na instância mockada
    mockHostElement.attachShadow = vi.fn().mockReturnValue(mockShadowRoot);


    mockPopupMainElement = document.createElement('div');
    mockPopupContentAreaElement = document.createElement('div');
    mockPopupOverlayElement = document.createElement('div');
    mockCloseButton = document.createElement('button');
    // Adicionar addEventListener aos mocks de elementos se eles são chamados
    mockCloseButton.addEventListener = vi.fn();
    mockPopupOverlayElement.addEventListener = vi.fn();


    mockDomService.createElementWithOptions.mockImplementation(((tagName: string, options?: any) => {
      const el = document.createElement(tagName as any); // Cast para any para simplificar o mock
      if (options?.className) el.className = Array.isArray(options.className) ? options.className.join(' ') : options.className;
      if (options?.id) el.id = options.id;
      if (options?.textContent) el.textContent = options.textContent;

      // Simular o retorno dos elementos mockados específicos
      if (options?.id === SUMMARY_POPUP_HOST_ID) return mockHostElement;
      if (tagName === 'style') return document.createElement('style'); // ou um mock de style se necessário
      if (options?.className === 'popup-overlay') {
        // Garantir que o addEventListener seja mockado neste elemento retornado
        mockPopupOverlayElement.className = options.className; // Atribuir classe para consistência
        return mockPopupOverlayElement;
      }
      if (options?.className === 'popup-wrapper') return mockPopupMainElement;
      if (options?.className === 'popup-inner') return document.createElement('div');
      if (options?.className === 'popup-header') return document.createElement('div');
      if (tagName === 'h3' && options?.className === 'popup-title') return document.createElement('h3');
      if (tagName === 'button' && options?.className === 'close-button') {
        mockCloseButton.className = options.className; // Atribuir classe para consistência
        return mockCloseButton;
      }
      if (options?.id === 'popup-content-area-dynamic') return mockPopupContentAreaElement;
      if (tagName === 'button' && options?.className === SUMMARY_BUTTON_CLASS) {
        const btn = document.createElement('button');
        btn.addEventListener = vi.fn();
        btn.querySelector = vi.fn();
        return btn;
      }
      // Simular appendChild se parent for fornecido
      if (options?.parent && el) {
        (options.parent as Node).appendChild(el);
      }
      return el;
    }) as any);

    vi.spyOn(document.body, 'appendChild').mockImplementation(node => node as HTMLElement); // Ajustado para retornar o nó
    document.body.style.overflow = '';
    vi.spyOn(document, 'addEventListener'); // Não precisa de mockImplementation se só verificamos a chamada
    vi.spyOn(document, 'removeEventListener');
    vi.spyOn(window, 'alert');


    // Configuração inicial de mockDomService.query para createPopupBaseLayout
    mockDomService.query.mockImplementation((selector: string) => {
      if (selector === `#${SUMMARY_POPUP_HOST_ID}`) {
        return null; // Simula que o host não existe, para forçar a criação
      }
      return null;
    });

    summaryUiService = new SummaryUiService(
      mockDomService,
      mockAiManager,
      mockMatrixApiService,
      mockSummaryCacheService,
      mockGetActiveChatContextCallback
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    const host = document.getElementById(SUMMARY_POPUP_HOST_ID);
    if (host) host.remove();
  });

  describe('initialize (createPopupBaseLayout)', () => {
    it('should create popup base layout if host does not exist', () => {
      // O beforeEach principal já configura query para retornar null inicialmente,
      // e instancia summaryUiService, que chama initialize -> createPopupBaseLayout.

      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('div', { id: SUMMARY_POPUP_HOST_ID });
      expect(mockHostElement.attachShadow).toHaveBeenCalledWith({ mode: 'open' });
      // 1 para styleSheet, overlay e wrapper são criados e *devem ser anexados pelo createElementWithOptions*
      // se o mock de createElementWithOptions for ajustado para fazer o append quando options.parent existe.
      // O código do serviço SÓ faz appendChild para o styleSheet.
      expect(mockShadowRoot.appendChild).toHaveBeenCalledTimes(1); // Apenas para o styleSheet
      expect(mockShadowRoot.appendChild).toHaveBeenCalledWith(expect.any(HTMLStyleElement));

      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('div', expect.objectContaining({ className: 'popup-overlay', parent: mockShadowRoot }));
      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('div', expect.objectContaining({ className: 'popup-wrapper', parent: mockShadowRoot }));
      expect(mockCloseButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockPopupOverlayElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should not create popup base layout if host already exists', () => {
      mockDomService.query.mockReturnValue(mockHostElement); // Simula que host já existe
      const createElementSpy = mockDomService.createElementWithOptions; // Pega o spy antes de recriar
      createElementSpy.mockClear(); // Limpa chamadas do beforeEach externo

      // Recria o serviço para que ele veja que o host já existe
      summaryUiService = new SummaryUiService(mockDomService, mockAiManager, mockMatrixApiService, mockSummaryCacheService, mockGetActiveChatContextCallback);

      const hostCreationCall = createElementSpy.mock.calls.find(call => (call[1] as any)?.id === SUMMARY_POPUP_HOST_ID);
      expect(hostCreationCall).toBeUndefined();
    });
  });

  describe('injectSummaryButton', () => {
    let targetDiv: HTMLDivElement;
    let mockSummaryButton: HTMLButtonElement;

    beforeEach(() => {
      targetDiv = document.createElement('div');
      targetDiv.querySelector = vi.fn();
      targetDiv.insertBefore = vi.fn();
      targetDiv.appendChild = vi.fn();

      mockSummaryButton = document.createElement('button');
      mockSummaryButton.addEventListener = vi.fn();
      mockSummaryButton.querySelector = vi.fn();

      // Garante que createElementWithOptions retorne o mockSummaryButton quando apropriado
      const originalCreateImpl = (mockDomService.createElementWithOptions as any).getMockImplementation
        ? (mockDomService.createElementWithOptions as any).getMockImplementation()
        : null;
      mockDomService.createElementWithOptions.mockImplementation(((tagName: string, options?: any) => {
        if (tagName === 'button' && options?.className === SUMMARY_BUTTON_CLASS) {
          return mockSummaryButton;
        }
        if (originalCreateImpl) return originalCreateImpl(tagName, options); // Chama o mock anterior para outros casos
        return document.createElement(tagName as 'button'); // Fallback simples
      }) as any);
    });

    it('should not inject button if it already exists', () => {
      (targetDiv.querySelector as any).mockReturnValue(document.createElement('button'));
      summaryUiService.injectSummaryButton(targetDiv, 'p1', 'c1');
      // Se o botão já existe, createElementWithOptions para o botão de resumo não deve ser chamado
      // ou, se for, o append/insertBefore não deve ocorrer.
      // Como o mock agora está configurado para retornar mockSummaryButton, verificamos se não foi anexado.
      expect(targetDiv.appendChild).not.toHaveBeenCalledWith(mockSummaryButton);
      expect(targetDiv.insertBefore).not.toHaveBeenCalledWith(mockSummaryButton, expect.anything());
    });

    it('should inject button with correct class, styles, and content if it does not exist', () => {
      (targetDiv.querySelector as any).mockReturnValue(null);
      const svgMock = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      (mockSummaryButton.querySelector as any).mockReturnValue(svgMock);

      summaryUiService.injectSummaryButton(targetDiv, 'p1', 'c1');

      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('button', expect.objectContaining({
        className: SUMMARY_BUTTON_CLASS,
        styles: expect.objectContaining({ padding: '4px 12px' })
      }));
      expect(mockSummaryButton.innerHTML).toContain('Resumir');
      expect(mockSummaryButton.innerHTML).toContain('svg');
      expect(mockSummaryButton.querySelector).toHaveBeenCalledWith('svg');
      expect(mockDomService.applyStyles).toHaveBeenCalledWith(svgMock, expect.objectContaining({ fill: '#ffffff' }));
      expect(targetDiv.appendChild).toHaveBeenCalledWith(mockSummaryButton);
      expect(mockSummaryButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('button click should call showAndGenerateSummary if popup is not visible and context is valid', async () => {
      (targetDiv.querySelector as any).mockReturnValue(null);
      summaryUiService.injectSummaryButton(targetDiv, 'protoTest', 'contactTest');

      const clickListener = (mockSummaryButton.addEventListener as any).mock.calls[0][1];
      const mockEvent = { currentTarget: mockSummaryButton, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent;
      mockSummaryButton.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
      (summaryUiService as any)['isPopupVisible'] = false;
      mockGetActiveChatContextCallback.mockReturnValue({ protocolNumber: 'protoTest', contactId: 'contactTest', attendanceId: 'att1' });
      const showSpy = vi.spyOn(summaryUiService, 'showAndGenerateSummary').mockResolvedValue(undefined);

      await clickListener(mockEvent);
      expect(showSpy).toHaveBeenCalled();
    });

    it('button click should call alert if context is invalid', async () => {
      (targetDiv.querySelector as any).mockReturnValue(null);
      summaryUiService.injectSummaryButton(targetDiv, '', '');

      const clickListener = (mockSummaryButton.addEventListener as any).mock.calls[0][1];
      const mockEvent = { currentTarget: mockSummaryButton, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent;
      (summaryUiService as any)['isPopupVisible'] = false;
      mockGetActiveChatContextCallback.mockReturnValue(null);

      await clickListener(mockEvent);
      expect(window.alert).toHaveBeenCalledWith("Omni Max: Não foi possível identificar o atendimento ativo para resumir.");
    });
  });

  describe('showAndGenerateSummary', () => {
    const mockRect = { left: 10, top: 20, width: 30, height: 40 } as DOMRect;
    const protocolNumber = 'p123';
    const contactId = 'c456';
    const mockSession: CustomerServiceSession = {
      protocolNumber, contactId, messages: [{ role: 'customer', senderName: 'Cust', content: 'Hello', displayTimestamp: 'ts', timestamp: new Date(), originalAttendanceId: 'a1' }], originalAttendanceIds: ['a1']
    };

    beforeEach(() => {
      mockIsConnectedGetter.mockReturnValue(true); // Host está conectado

      // Garante que a instância do serviço tenha seus elementos DOM internos definidos
      // Essas atribuições diretas são uma forma de garantir o estado para os testes deste describe.
      // Elas simulam que createPopupBaseLayout já foi executado com sucesso e populou estas propriedades.
      (summaryUiService as any).summaryPopupHostElement = mockHostElement;
      (summaryUiService as any).popupMainElement = mockPopupMainElement;
      (summaryUiService as any).popupContentAreaElement = mockPopupContentAreaElement;
      (summaryUiService as any).popupOverlayElement = mockPopupOverlayElement;

      updatePopupContentSpy = vi.spyOn(summaryUiService as any, 'updatePopupContent');
      updatePopupContentSpy.mockClear(); // Limpar chamadas de testes anteriores ou do construtor
    });

    // Teste CORRIGIDO:
    it('should show popup, attempt cache, handle cache miss, and display no messages when API returns empty', async () => {
      mockSummaryCacheService.getSummary.mockResolvedValue(null); // Cache miss
      mockMatrixApiService.getAtendimentosByContato.mockResolvedValue([]); // API não retorna sessões/mensagens

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      // Verificações da exibição do Popup
      expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockPopupMainElement, expect.objectContaining({ display: 'block' }));
      expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockPopupOverlayElement, expect.objectContaining({ display: 'block' }));
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));

      // Verificações de chamadas de serviço
      expect(mockSummaryCacheService.getSummary).toHaveBeenCalledWith(protocolNumber);
      expect(mockMatrixApiService.getAtendimentosByContato).toHaveBeenCalledWith(contactId);
      expect(mockAiManager.generateSummary).not.toHaveBeenCalled(); // Não deve chamar IA

      // Verificações de estado final e UI
      // isLoadingSummary deve ser false após todas as operações assíncronas.
      expect((summaryUiService as any).isLoadingSummary).toBe(false);
      // updatePopupContent é chamado uma vez para loading, e outra para o resultado final.
      expect(updatePopupContentSpy).toHaveBeenCalledTimes(2);
      // Verificar o texto final exibido
      expect((summaryUiService as any).currentSummaryText).toBe("Nenhuma mensagem encontrada para este atendimento ou protocolo.");
    });

    it('should display cached summary if available', async () => {
      const cachedSummaryText = "I am a cached summary.";
      mockSummaryCacheService.getSummary.mockResolvedValue(cachedSummaryText);

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      expect((summaryUiService as any).isLoadingSummary).toBe(false);
      expect((summaryUiService as any).currentSummaryText).toBe(cachedSummaryText);
      expect(mockMatrixApiService.getAtendimentosByContato).not.toHaveBeenCalled();
      expect(mockAiManager.generateSummary).not.toHaveBeenCalled();
      expect(updatePopupContentSpy).toHaveBeenCalledTimes(2); // loading + final content
    });

    it('should fetch atendimentos, generate summary if no cache, and save to cache', async () => {
      mockSummaryCacheService.getSummary.mockResolvedValue(null);
      mockMatrixApiService.getAtendimentosByContato.mockResolvedValue([mockSession]);
      const generatedSummary = "Newly generated summary by AI.";
      mockAiManager.generateSummary.mockResolvedValue(generatedSummary);

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      expect(mockMatrixApiService.getAtendimentosByContato).toHaveBeenCalledWith(contactId);
      expect(mockAiManager.generateSummary).toHaveBeenCalledWith(expect.stringContaining(mockSession.messages[0].content));
      expect(mockSummaryCacheService.saveSummary).toHaveBeenCalledWith(protocolNumber, generatedSummary);
      expect((summaryUiService as any).currentSummaryText).toBe(generatedSummary);
      expect((summaryUiService as any).isLoadingSummary).toBe(false);
      expect(updatePopupContentSpy).toHaveBeenCalledTimes(2);
    });

    it('should display "no messages" if session has no messages after fetch', async () => {
      mockSummaryCacheService.getSummary.mockResolvedValue(null);
      const sessionNoMessages: CustomerServiceSession = { ...mockSession, messages: [] };
      mockMatrixApiService.getAtendimentosByContato.mockResolvedValue([sessionNoMessages]);

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      expect((summaryUiService as any).currentSummaryText).toBe("Nenhuma mensagem encontrada para este atendimento ou protocolo.");
      expect(mockAiManager.generateSummary).not.toHaveBeenCalled();
      expect((summaryUiService as any).isLoadingSummary).toBe(false);
      expect(updatePopupContentSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle error during AI summary generation', async () => {
      mockSummaryCacheService.getSummary.mockResolvedValue(null);
      mockMatrixApiService.getAtendimentosByContato.mockResolvedValue([mockSession]);
      const error = new Error("AI failed");
      mockAiManager.generateSummary.mockRejectedValue(error);

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      expect((summaryUiService as any).currentSummaryText).toBe(`Erro ao gerar resumo: ${error.message}`);
      expect((summaryUiService as any).isLoadingSummary).toBe(false);
      expect(updatePopupContentSpy).toHaveBeenCalledTimes(2);
    });

    it('should not start new summary generation if one is already active for the protocol', async () => {
      (summaryUiService as any)['activeSummaryRequests'][protocolNumber] = true;

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      expect(mockSummaryCacheService.getSummary).not.toHaveBeenCalled();
      // A primeira chamada para updatePopupContent (loading) ainda acontece ANTES da verificação de activeSummaryRequests
      expect(updatePopupContentSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('hide', () => {
    it('should hide popup elements and restore body overflow', () => {
      (summaryUiService as any)['isPopupVisible'] = true;
      // Atribuir os elementos mockados à instância do serviço para o teste de 'hide'
      (summaryUiService as any)['popupMainElement'] = mockPopupMainElement;
      (summaryUiService as any)['popupOverlayElement'] = mockPopupOverlayElement;

      summaryUiService.hide();

      expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockPopupMainElement, { display: 'none' });
      expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockPopupOverlayElement, { display: 'none' });
      expect(document.body.style.overflow).toBe('');
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('updatePopupContent', () => {
    beforeEach(() => {
      (summaryUiService as any)['popupContentAreaElement'] = mockPopupContentAreaElement;
    });

    it('should display loading skeleton when isLoadingSummary is true', () => {
      (summaryUiService as any)['isLoadingSummary'] = true;
      (summaryUiService as any).updatePopupContent();
      expect(mockPopupContentAreaElement.innerHTML).toContain('loading-state');
      expect(mockPopupContentAreaElement.innerHTML).toContain('skeleton-line');
    });

    it('should display summary content parsed by marked when not loading', () => {
      const summary = "Test *summary* content.";
      const expectedHtml = "<p>Test <em>summary</em> content.</p>";
      (summaryUiService as any)['isLoadingSummary'] = false;
      (summaryUiService as any)['currentSummaryText'] = summary;
      (marked.parse as any).mockReturnValueOnce(expectedHtml); // Corrigido cast

      (summaryUiService as any).updatePopupContent();
      expect(mockPopupContentAreaElement.innerHTML).toBe(`<div class="summary-content">${expectedHtml}</div>`);
    });

    it('should display "Nenhum resumo disponível." if summary text is empty and not loading', () => {
      (summaryUiService as any)['isLoadingSummary'] = false;
      (summaryUiService as any)['currentSummaryText'] = "";
      (marked.parse as any).mockReturnValueOnce("<p>Nenhum resumo disponível.</p>"); // Corrigido cast

      (summaryUiService as any).updatePopupContent();
      expect(mockPopupContentAreaElement.innerHTML).toContain("Nenhum resumo disponível.");
    });
  });
});