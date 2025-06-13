// src/content/services/SummaryUiService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked, type Mock } from 'vitest';
import { SummaryUiService, SUMMARY_BUTTON_CLASS } from './SummaryUiService';
import type { DomService } from './DomService';
import type { AIServiceManager } from '../../ai/AIServiceManager';
import type { MatrixApiService } from './MatrixApiService';
import type { SummaryCacheService } from './SummaryCacheService';
import type { Translator } from '../../i18n/translator.content';
import type { ActiveChatContext } from '../types';

// Mocks para as dependências do Svelte
import { mount } from 'svelte';
import { get } from 'svelte/store';
import { summaryPopupStore } from '../../components/summary/summaryPopupStore';

// Mock dos módulos inteiros
vi.mock('svelte', () => ({
  mount: vi.fn(),
  // Adicione outras exportações do svelte se necessário, ex: onMount
}));

vi.mock('svelte/store', () => ({
  get: vi.fn(),
  writable: vi.fn(() => ({
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  })),
}));

vi.mock('../../components/summary/summaryPopupStore', () => ({
  summaryPopupStore: {
    subscribe: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  }
}));

// Mock para o componente Svelte
vi.mock('../../components/summary/SummaryPopup.svelte', () => ({
  default: class MockSummaryPopup { },
}));

describe('SummaryUiService', () => {
  let mockDomService: Mocked<DomService>;
  let mockGetActiveChatContext: Mock<() => ActiveChatContext | null>;
  let service: SummaryUiService;
  
  const protocolNumber = 'P123';
  const contactId = 'C456';

  beforeEach(() => {
    vi.resetAllMocks();

    mockDomService = {
      query: vi.fn(),
      createElementWithOptions: vi.fn((tag, options) => {
        const el = document.createElement(tag as string);
        if (options?.className) el.className = Array.isArray(options.className) ? options.className.join(' ') : options.className;
        return el as any;
      }),
    } as unknown as Mocked<DomService>;

    const mockTranslator = {
      t: vi.fn().mockImplementation(async (key: string) => key),
    } as unknown as Mocked<Translator>;

    mockGetActiveChatContext = vi.fn();
    mockDomService.query.mockReturnValue(null);
    document.body.innerHTML = '';

    const mockAiManager = {} as Mocked<AIServiceManager>;
    const mockMatrixApiService = {} as Mocked<MatrixApiService>;
    const mockSummaryCacheService = {} as Mocked<SummaryCacheService>;

    service = new SummaryUiService(
      mockDomService,
      mockAiManager,
      mockMatrixApiService,
      mockSummaryCacheService,
      mockGetActiveChatContext,
      mockTranslator
    );
  });

  describe('Initialization', () => {
    it('should create and mount the popup host on initialization if it does not exist', () => {
      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('div', {
        id: 'omni-max-summary-popup-host',
        parent: document.body,
      });
      // CORREÇÃO: `mount` agora é importado e pode ser usado diretamente.
      expect(mount).toHaveBeenCalled();
    });
  });

  describe('injectSummaryButton', () => {
    let targetContainer: HTMLDivElement;
    let mockButton: HTMLButtonElement;

    beforeEach(() => {
      targetContainer = document.createElement('div');
      mockButton = document.createElement('button');
      mockDomService.createElementWithOptions.mockReturnValue(mockButton);
      vi.spyOn(targetContainer, 'querySelector').mockReturnValue(null);
      // CORREÇÃO: Precisamos espionar `appendChild` para o caso de teste.
      vi.spyOn(targetContainer, 'appendChild');
    });

    it('should inject a summary button if it does not exist', async () => {
      await service.injectSummaryButton(targetContainer, protocolNumber, contactId);

      expect(targetContainer.querySelector).toHaveBeenCalledWith(`.${SUMMARY_BUTTON_CLASS}`);
      expect(mockDomService.createElementWithOptions).toHaveBeenCalledWith('button', expect.any(Object));
      // CORREÇÃO: Verifica `appendChild` pois o contêiner de teste está vazio.
      expect(targetContainer.appendChild).toHaveBeenCalledWith(mockButton);
    });

    it('should attach a click listener that calls summaryPopupStore.show', async () => {
      const addEventListenerSpy = vi.spyOn(mockButton, 'addEventListener');
      await service.injectSummaryButton(targetContainer, protocolNumber, contactId);
      
      const clickCallback = addEventListenerSpy.mock.calls[0][1] as (e: MouseEvent) => void;
      const mockEvent = { 
        preventDefault: vi.fn(), 
        stopPropagation: vi.fn(),
        currentTarget: mockButton,
        getBoundingClientRect: () => ({})
      } as unknown as MouseEvent;

      // CORREÇÃO: Mocka o retorno da função `get` que agora é um mock.
      (get as Mock).mockReturnValue({ isVisible: false });
      mockGetActiveChatContext.mockReturnValue({ protocolNumber, contactId, attendanceId: 'A789' });
      
      await clickCallback(mockEvent);

      expect(summaryPopupStore.show).toHaveBeenCalledOnce();
      expect(summaryPopupStore.show).toHaveBeenCalledWith(expect.objectContaining({
        protocolNumber: protocolNumber,
        contactId: contactId
      }));
    });
  });
});