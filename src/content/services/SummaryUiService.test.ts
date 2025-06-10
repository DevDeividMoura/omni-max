// src/content/services/SummaryUiService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked, type Mock } from 'vitest';
import { SummaryUiService, SUMMARY_BUTTON_CLASS } from './SummaryUiService';
import type { DomService } from './DomService';
import type { AIServiceManager } from '../../ai/AIServiceManager';
import type { MatrixApiService } from './MatrixApiService';
import type { SummaryCacheService } from './SummaryCacheService';
import type { ActiveChatContext, CustomerServiceSession } from '../types';
import type { Translator } from '../../i18n/translator.content';
import { marked } from 'marked';
import { getLocaleFromAgent } from '../../utils/language';

// Mock do `marked` para simular a conversão de markdown para HTML
vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((text: string) => `<p>${text.replace(/\*/g, 'em')}</p>`), // Simples mock de parse
  },
}));

// Mock do módulo de utils/language
vi.mock('../../utils/language', () => ({
  getLocaleFromAgent: vi.fn(() => 'pt-BR'), // Mock default para o locale
}));

// Create mock translator (remove the old mock)
const mockTranslator = {
  t: vi.fn().mockImplementation(async (key: string, options?: { values?: Record<string, string | number> }) => {
    const message = options?.values?.message || '';
    const replacements: Record<string, string> = {
      'content.summary_popup.title': 'Resumo da Conversa',
      'content.summary_popup.close_button_title': 'Fechar',
      'content.summary_popup.close_button_aria_label': 'Fechar resumo',
      'content.summary_popup.loading_text': 'Analisando conversa...',
      'content.summary_popup.no_summary_available': 'Nenhuma mensagem encontrada para este atendimento ou protocolo.',
      'content.summary_popup.error_generating': `Erro ao gerar resumo: ${message}`,
      'content.summary_button.label': 'Resumir',
      'content.summary_button.context_error_alert': 'Omni Max: Não foi possível identificar o atendimento ativo para resumir.',
    };
    return replacements[key] || key;
  })
} as unknown as Mocked<Translator>;

const SUMMARY_POPUP_HOST_ID = 'omni-max-summary-popup-host';

describe('SummaryUiService', () => {
  let mockDomService: Mocked<DomService>;
  let mockAiManager: Mocked<AIServiceManager>;
  let mockMatrixApiService: Mocked<MatrixApiService>;
  let mockSummaryCacheService: Mocked<SummaryCacheService>;
  let mockGetActiveChatContextCallback: Mock<() => ActiveChatContext | null>;
  let summaryUiService: SummaryUiService;

  let mockHostElement: HTMLDivElement;
  let mockShadowRoot: ShadowRoot;

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

    mockGetActiveChatContextCallback = vi.fn();

    // Mock do DOM
    mockHostElement = document.createElement('div');
    mockShadowRoot = mockHostElement.attachShadow({ mode: 'open' });
    vi.spyOn(mockHostElement, 'attachShadow').mockReturnValue(mockShadowRoot);
    vi.spyOn(mockShadowRoot, 'appendChild');
    vi.spyOn(document.body, 'appendChild').mockImplementation(node => node as HTMLElement);
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
    window.alert = vi.fn(); // Mock de window.alert

    // Reset the translator mock for each test
    mockTranslator.t.mockClear();

    // Configuração inicial do mock para simular que o host não existe
    mockDomService.query.mockImplementation((selector: string) => {
      if (selector === `#${SUMMARY_POPUP_HOST_ID}`) {
        return null;
      }
      return null;
    });

    // Add the translator mock as the last parameter
    summaryUiService = new SummaryUiService(
      mockDomService,
      mockAiManager,
      mockMatrixApiService,
      mockSummaryCacheService,
      mockGetActiveChatContextCallback,
      mockTranslator
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    const host = document.getElementById(SUMMARY_POPUP_HOST_ID);
    if (host) host.remove();
  });

  describe('initialize (createPopupBaseLayout)', () => {
    it('should create popup base layout if host does not exist', async () => {
      // Simula a não existência do host
      mockDomService.query.mockReturnValue(null);
      // Cria uma nova instância para acionar o construtor e a inicialização
      summaryUiService = new SummaryUiService(
        mockDomService, 
        mockAiManager, 
        mockMatrixApiService, 
        mockSummaryCacheService, 
        mockGetActiveChatContextCallback,
        mockTranslator
      );
      // Força a execução de promessas pendentes
      await new Promise(resolve => setImmediate(resolve));

      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('div', { id: SUMMARY_POPUP_HOST_ID });
    });
  });

  describe('injectSummaryButton', () => {
    it('should inject button with correct content and listener', async () => {
      const targetDiv = document.createElement('div');
      vi.spyOn(targetDiv, 'querySelector').mockReturnValue(null); // Botão não existe
      vi.spyOn(targetDiv, 'appendChild');

      const mockButton = document.createElement('button');
      vi.spyOn(mockButton, 'addEventListener');
      mockDomService.createElementWithOptions.mockReturnValue(mockButton);

      await summaryUiService.injectSummaryButton(targetDiv, 'p1', 'c1');

      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('button', expect.anything());
      expect(targetDiv.appendChild).toHaveBeenCalledWith(mockButton);
      expect(mockButton.innerHTML).toContain(await mockTranslator.t('content.summary_button.label'));
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('showAndGenerateSummary', () => {
    const mockRect = { left: 10, top: 20, width: 30, height: 40, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => { } };
    const protocolNumber = 'p123';
    const contactId = 'c456';
    const mockSession: CustomerServiceSession = {
      protocolNumber, contactId, messages: [{ role: 'customer', senderName: 'Cust', content: 'Hello', displayTimestamp: 'ts', timestamp: new Date(), originalAttendanceId: 'a1' }], originalAttendanceIds: ['a1']
    };

    beforeEach(() => {
      // Simula que o popup está pronto para ser mostrado
      (summaryUiService as any).summaryPopupHostElement = document.createElement('div');
      (summaryUiService as any).popupMainElement = document.createElement('div');
      (summaryUiService as any).popupOverlayElement = document.createElement('div');
      (summaryUiService as any).popupContentAreaElement = document.createElement('div');
      vi.spyOn(summaryUiService as any, 'updatePopupContent').mockImplementation(() => { });
    });

    it('should display "no messages" when API returns empty', async () => {
      mockSummaryCacheService.getSummary.mockResolvedValue(null);
      mockMatrixApiService.getAtendimentosByContato.mockResolvedValue([]);

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      const expectedText = await mockTranslator.t('content.summary_popup.no_summary_available');
      expect((summaryUiService as any).currentSummaryText).toBe(expectedText);
      expect(mockAiManager.generateSummary).not.toHaveBeenCalled();
    });

    it('should handle error during AI summary generation', async () => {
      mockSummaryCacheService.getSummary.mockResolvedValue(null);
      mockMatrixApiService.getAtendimentosByContato.mockResolvedValue([mockSession]);
      const error = new Error("AI failed");
      mockAiManager.generateSummary.mockRejectedValue(error);

      await summaryUiService.showAndGenerateSummary(mockRect, protocolNumber, contactId);

      const expectedText = await mockTranslator.t('content.summary_popup.error_generating', { values: { message: error.message } });
      expect((summaryUiService as any).currentSummaryText).toBe(expectedText);
    });
  });
});