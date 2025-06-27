// src/content/services/ShortcutService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get, writable } from 'svelte/store';
import { ShortcutService } from './ShortcutService';
import type { ExtractionService } from './ExtractionService';
import type { ClipboardService } from './ClipboardService';
import type { Translator } from '../../i18n/translator.content';
import * as stores from '../../storage/stores';
import * as notifications from '../components/notifications/notifications';

// Mocks
vi.mock('./ExtractionService');
vi.mock('./ClipboardService');
vi.mock('../../components/notifications/notifications');

const mockExtractionService = {
  extractDocumentNumber: vi.fn(),
  extractCustomerName: vi.fn(),
  extractPhoneNumber: vi.fn(),
  extractProtocolNumber: vi.fn(),
};

const mockClipboardService = {
  copy: vi.fn(),
};

const mockTranslator = {
  t: vi.fn().mockImplementation(async (key: string, options?: any) => {
    const label = options?.values?.label || '';
    if (key.includes('copy_success')) return `Copiado: ${label}`;
    if (key.includes('copy_failed')) return `Falha ao copiar: ${label}`;
    return key;
  }),
};

const mockAddNotification = vi.spyOn(notifications, 'addNotification');

describe('ShortcutService', () => {
  let service: ShortcutService;

  const createEvent = (key: string, ctrl = true, shift = true) =>
    new KeyboardEvent('keydown', { key, ctrlKey: ctrl, shiftKey: shift, bubbles: true, cancelable: true });

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset stores to default states for each test
    stores.globalExtensionEnabledStore.set(true);
    stores.shortcutsOverallEnabledStore.set(true);
    stores.moduleStatesStore.set({
      shortcutCopyDocumentNumber: true,
      shortcutCopyName: true,
      shortcutServiceOrderTemplate: true,
    });
    stores.shortcutKeysStore.set({
      shortcutCopyDocumentNumber: 'X',
      shortcutCopyName: 'Z',
      shortcutServiceOrderTemplate: 'S',
    });

    service = new ShortcutService(
      mockExtractionService as unknown as ExtractionService,
      mockClipboardService as unknown as ClipboardService,
      mockTranslator as unknown as Translator
    );

    // Attach listeners to a mocked document
    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
    service.attachListeners();
  });

  it('should not trigger if shortcuts are globally disabled', async () => {
    stores.shortcutsOverallEnabledStore.set(false);
    const event = createEvent('X');
    await (service as any).handleCtrlShiftKeyDown(event);
    expect(mockExtractionService.extractDocumentNumber).not.toHaveBeenCalled();
  });
  
  it('should not trigger if the specific module is disabled', async () => {
    stores.moduleStatesStore.update(s => ({ ...s, shortcutCopyDocumentNumber: false }));
    const event = createEvent('X');
    await (service as any).handleCtrlShiftKeyDown(event);
    expect(mockExtractionService.extractDocumentNumber).not.toHaveBeenCalled();
  });

  describe('Copy Document Number (Ctrl+Shift+X)', () => {
    it('should copy document number and show success notification', async () => {
      mockExtractionService.extractDocumentNumber.mockResolvedValue('123.456.789-00');
      mockClipboardService.copy.mockResolvedValue(true);
      mockTranslator.t.mockResolvedValueOnce('Número do Documento'); // for label
      mockTranslator.t.mockResolvedValueOnce('Copiado: Número do Documento'); // for success message

      const event = createEvent('X');
      await (service as any).handleCtrlShiftKeyDown(event);

      expect(mockClipboardService.copy).toHaveBeenCalledWith('123.456.789-00', 'Número do Documento');
      expect(mockAddNotification).toHaveBeenCalledWith('Copiado: Número do Documento', 'success');
    });

    it('should show warning if document number is not found', async () => {
      mockExtractionService.extractDocumentNumber.mockResolvedValue(null);
      mockTranslator.t.mockResolvedValueOnce('Número do Documento');
      mockTranslator.t.mockResolvedValueOnce('alerts.document_not_found');

      const event = createEvent('X');
      await (service as any).handleCtrlShiftKeyDown(event);
      
      expect(mockAddNotification).toHaveBeenCalledWith('alerts.document_not_found', 'warning');
    });

    it('should show error if clipboard copy fails', async () => {
        mockExtractionService.extractDocumentNumber.mockResolvedValue('123.456.789-00');
        mockClipboardService.copy.mockResolvedValue(false);
        mockTranslator.t.mockResolvedValueOnce('Número do Documento'); // label
        mockTranslator.t.mockResolvedValueOnce('Falha ao copiar: Número do Documento'); // error message

        const event = createEvent('X');
        await (service as any).handleCtrlShiftKeyDown(event);
        
        expect(mockAddNotification).toHaveBeenCalledWith('Falha ao copiar: Número do Documento', 'error');
    });
  });

  describe('Service Order Template (Ctrl+Shift+S)', () => {
    it('should generate and copy template with available data', async () => {
        mockExtractionService.extractPhoneNumber.mockResolvedValue('11987654321');
        mockExtractionService.extractProtocolNumber.mockResolvedValue('2025001');
        mockClipboardService.copy.mockResolvedValue(true);
        
        // Mock all translator calls
        mockTranslator.t
            .mockResolvedValueOnce('Situação')
            .mockResolvedValueOnce('Telefone')
            .mockResolvedValueOnce('Protocolo')
            .mockResolvedValueOnce('OBS')
            .mockResolvedValueOnce('RELATO_DO_CLIENTE')
            .mockResolvedValueOnce('TELEFONE')
            .mockResolvedValueOnce('PROTOCOLO')
            .mockResolvedValueOnce('OBSERVAÇÕES')
            .mockResolvedValueOnce('Template de Ordem de Serviço') // label
            .mockResolvedValueOnce('Copiado: Template de Ordem de Serviço'); // success

        const event = createEvent('S');
        await (service as any).handleCtrlShiftKeyDown(event);
        
        const expectedTemplate = `Situação: [RELATO_DO_CLIENTE] |||\nTelefone: 11987654321 |||\nProtocolo: 2025001 |||\nOBS: [OBSERVAÇÕES]`;
        
        expect(mockClipboardService.copy).toHaveBeenCalledWith(expectedTemplate, 'Template de Ordem de Serviço');
        expect(mockAddNotification).toHaveBeenCalledWith('Copiado: Template de Ordem de Serviço', 'success');
    });
  });
});