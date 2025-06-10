/**
 * @file src/content/services/ShortcutService.test.ts
 * @description Unit tests for the ShortcutService class.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
import {
  globalExtensionEnabledStore,
  shortcutsOverallEnabledStore,
  moduleStatesStore,
  shortcutKeysStore,
} from '../../storage/stores';
import { ShortcutService } from './ShortcutService';
import type { ExtractionService } from './ExtractionService';
import type { ClipboardService } from './ClipboardService';
import type { NotificationService } from './NotificationService';
// Import the Translator type instead of a default instance
import type { Translator } from '../../i18n/translator.content';

// --- Mocks para Dependências ---

const mockExtractionServiceInstance = {
  extractDocumentNumber: vi.fn(),
  extractCustomerName: vi.fn(),
  extractPhoneNumber: vi.fn(),
  extractProtocolNumber: vi.fn(),
} as unknown as Mocked<ExtractionService>;

vi.mock('./ExtractionService', () => ({
  ExtractionService: vi.fn(() => mockExtractionServiceInstance),
}));

const mockClipboardServiceInstance = {
  copy: vi.fn(),
};
vi.mock('./ClipboardService', () => ({
  ClipboardService: vi.fn(() => mockClipboardServiceInstance),
}));

const mockNotificationServiceInstance = {
  showToast: vi.fn(),
} as unknown as NotificationService;
vi.mock('./NotificationService', () => ({
  NotificationService: vi.fn(() => mockNotificationServiceInstance),
}));

// --- Suite de Testes ---
describe('ShortcutService', () => {
  let shortcutService: ShortcutService;
  // Create a mock translator instance
  const mockTranslator = {
    t: vi.fn(),
  } as unknown as Mocked<Translator>;

  const createKeyboardEvent = (key: string, ctrl = true, shift = true) =>
    new KeyboardEvent('keydown', { key, ctrlKey: ctrl, shiftKey: shift });

  beforeEach(() => {
    vi.resetAllMocks();

    // Define a implementação do mock para o tradutor ANTES de cada teste
    mockTranslator.t.mockImplementation(async (key: string, options?: { values?: { label?: string } }) => {
      const label = options?.values?.label ?? '';
      switch (key) {
        case 'alerts.copy_success': return `"${label}" copiado para a área de transferência!`;
        case 'alerts.copy_failed': return `Falha ao copiar "${label}".`;
        case 'modules.shortcuts.shortcut_copy_document_number.label': return 'Número do Documento';
        case 'modules.shortcuts.shortcut_copy_name.label': return 'Nome do Cliente';
        case 'modules.shortcuts.shortcut_service_order_template.label': return 'Template de Ordem de Serviço';
        case 'alerts.document_not_found': return 'Documento do cliente não encontrado na página.';
        case 'alerts.customer_name_not_found': return 'Nome do cliente não encontrado na página.';
        case 'templates.service_order.situation': return 'Situação';
        case 'templates.service_order.phone': return 'Telefone';
        case 'templates.service_order.protocol': return 'Protocolo';
        case 'templates.service_order.notes': return 'OBS';
        case 'templates.service_order.situation_placeholder': return 'RELATO_DO_CLIENTE';
        case 'templates.service_order.phone_placeholder': return 'TELEFONE';
        case 'templates.service_order.protocol_placeholder': return 'PROTOCOLO';
        case 'templates.service_order.notes_placeholder': return 'OBSERVAÇÕES';
        case 'alerts.template_creation_failed': return 'Não foi possível gerar o template.';
        default: return key;
      }
    });

    globalExtensionEnabledStore.set(true);
    shortcutsOverallEnabledStore.set(true);
    moduleStatesStore.set({
      shortcutCopyDocumentNumber: true,
      shortcutCopyName: true,
      shortcutServiceOrderTemplate: true,
    });
    shortcutKeysStore.set({
      shortcutCopyDocumentNumber: 'X',
      shortcutCopyName: 'Z',
      shortcutServiceOrderTemplate: 'S',
    });

    shortcutService = new ShortcutService(
      mockExtractionServiceInstance,
      mockClipboardServiceInstance as ClipboardService,
      mockNotificationServiceInstance,
      mockTranslator
    );

    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('attachListeners / detachListeners', () => {
    it('attaches keydown listener', () => {
      shortcutService.attachListeners();
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });

    it('detaches and re-attaches listener if called twice', () => {
      shortcutService.attachListeners();
      shortcutService.attachListeners();
      expect(document.removeEventListener).toHaveBeenCalledTimes(2);
      expect(document.addEventListener).toHaveBeenCalledTimes(2);
    });

    it('detaches listener on detachListeners', () => {
      shortcutService.attachListeners();
      shortcutService.detachListeners();
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });
  });

  describe('handleCtrlShiftKeyDown guards', () => {
    it('ignores non-Ctrl+Shift events', async () => {
      const ev = createKeyboardEvent('X', false, false);
      await (shortcutService as any).handleCtrlShiftKeyDown(ev);
      expect(mockExtractionServiceInstance.extractDocumentNumber).not.toHaveBeenCalled();
    });

    it('ignores when globally disabled', async () => {
      globalExtensionEnabledStore.set(false);
      const ev = createKeyboardEvent('X');
      await (shortcutService as any).handleCtrlShiftKeyDown(ev);
      expect(mockNotificationServiceInstance.showToast).not.toHaveBeenCalled();
    });

    it('ignores when shortcuts section disabled', async () => {
      shortcutsOverallEnabledStore.set(false);
      const ev = createKeyboardEvent('X');
      await (shortcutService as any).handleCtrlShiftKeyDown(ev);
      expect(mockNotificationServiceInstance.showToast).not.toHaveBeenCalled();
    });

    it('ignores when specific module disabled', async () => {
      moduleStatesStore.update(ms => ({ ...ms, shortcutCopyDocumentNumber: false }));
      const ev = createKeyboardEvent('X');
      await (shortcutService as any).handleCtrlShiftKeyDown(ev);
      expect(mockExtractionServiceInstance.extractDocumentNumber).not.toHaveBeenCalled();
    });
  });

  describe('Copy Document Number (Ctrl+Shift+X)', () => {
    const KEY = 'X';

    it('copies and notifies on success', async () => {
      const LABEL = await mockTranslator.t('modules.shortcuts.shortcut_copy_document_number.label');
      mockExtractionServiceInstance.extractDocumentNumber.mockResolvedValue('123');
      mockClipboardServiceInstance.copy.mockResolvedValue(true);

      const ev = createKeyboardEvent(KEY);
      await (shortcutService as any).handleCtrlShiftKeyDown(ev);

      expect(mockExtractionServiceInstance.extractDocumentNumber).toHaveBeenCalled();
      expect(mockClipboardServiceInstance.copy).toHaveBeenCalledWith('123', LABEL);
      expect(mockNotificationServiceInstance.showToast).toHaveBeenCalledWith(`"${LABEL}" copiado para a área de transferência!`, 'success');
    });

    it('warns if no data', async () => {
      mockExtractionServiceInstance.extractDocumentNumber.mockResolvedValue(null);
      const ev = createKeyboardEvent(KEY);
      await (shortcutService as any).handleCtrlShiftKeyDown(ev);

      expect(mockNotificationServiceInstance.showToast).toHaveBeenCalledWith('Documento do cliente não encontrado na página.', 'warning');
    });

    it('errors if copy fails', async () => {
      const LABEL = await mockTranslator.t('modules.shortcuts.shortcut_copy_document_number.label');
      mockExtractionServiceInstance.extractDocumentNumber.mockResolvedValue('123');
      mockClipboardServiceInstance.copy.mockResolvedValue(false);

      const ev = createKeyboardEvent(KEY);
      await (shortcutService as any).handleCtrlShiftKeyDown(ev);

      expect(mockNotificationServiceInstance.showToast).toHaveBeenCalledWith(`Falha ao copiar "${LABEL}".`, 'error');
    });
  });

  describe('Copy Customer Name Shortcut (Ctrl+Shift+Z)', () => {
    const NAME_KEY = 'Z';

    it('should extract, copy, and notify success if name is found and copied using default key', async () => {
      const NAME_LABEL = await mockTranslator.t('modules.shortcuts.shortcut_copy_name.label');
      const mockName = 'Fulano de Tal';
      mockExtractionServiceInstance.extractCustomerName.mockResolvedValue(mockName);
      mockClipboardServiceInstance.copy.mockResolvedValue(true);

      const event = createKeyboardEvent(NAME_KEY);
      await (shortcutService as any).handleCtrlShiftKeyDown(event);

      expect(mockExtractionServiceInstance.extractCustomerName).toHaveBeenCalledOnce();
      expect(mockClipboardServiceInstance.copy).toHaveBeenCalledWith(mockName, NAME_LABEL);
      expect(mockNotificationServiceInstance.showToast)
        .toHaveBeenCalledWith(`"${NAME_LABEL}" copiado para a área de transferência!`, 'success');
    });

    it('should use custom configured key for copy name shortcut', async () => {
      const NAME_LABEL = await mockTranslator.t('modules.shortcuts.shortcut_copy_name.label');
      shortcutKeysStore.update(keys => ({ ...keys, shortcutCopyName: 'N' }));

      const mockName = 'Ciclano Custom';
      mockExtractionServiceInstance.extractCustomerName.mockResolvedValue(mockName);
      mockClipboardServiceInstance.copy.mockResolvedValue(true);

      const event = createKeyboardEvent('N');
      await (shortcutService as any).handleCtrlShiftKeyDown(event);

      expect(mockExtractionServiceInstance.extractCustomerName).toHaveBeenCalledOnce();
      expect(mockClipboardServiceInstance.copy).toHaveBeenCalledWith(mockName, NAME_LABEL);
      expect(mockNotificationServiceInstance.showToast)
        .toHaveBeenCalledWith(`"${NAME_LABEL}" copiado para a área de transferência!`, 'success');
    });
  });

  describe('Service Order Template Shortcut (Ctrl+Shift+S)', () => {
    const SO_KEY = 'S';

    it('should generate template with extracted phone and protocol, copy, and notify', async () => {
      const SO_LABEL = await mockTranslator.t('modules.shortcuts.shortcut_service_order_template.label');
      const mockPhone = '11999998888';
      const mockProtocol = '2025001';
      mockExtractionServiceInstance.extractPhoneNumber.mockResolvedValue(mockPhone);
      mockExtractionServiceInstance.extractProtocolNumber.mockResolvedValue(mockProtocol);
      mockClipboardServiceInstance.copy.mockResolvedValue(true);

      const expectedTemplate = `Situação: [RELATO_DO_CLIENTE] |||
Telefone: ${mockPhone} |||
Protocolo: ${mockProtocol} |||
OBS: [OBSERVAÇÕES]`;

      const event = createKeyboardEvent(SO_KEY);
      await (shortcutService as any).handleCtrlShiftKeyDown(event);

      expect(mockExtractionServiceInstance.extractPhoneNumber).toHaveBeenCalledOnce();
      expect(mockExtractionServiceInstance.extractProtocolNumber).toHaveBeenCalledOnce();
      expect(mockClipboardServiceInstance.copy)
        .toHaveBeenCalledWith(expectedTemplate, SO_LABEL);
      expect(mockNotificationServiceInstance.showToast)
        .toHaveBeenCalledWith(`"${SO_LABEL}" copiado para a área de transferência!`, 'success');
    });

    it('should generate template with placeholders if phone or protocol not found', async () => {
      const SO_LABEL = await mockTranslator.t('modules.shortcuts.shortcut_service_order_template.label');
      mockExtractionServiceInstance.extractPhoneNumber.mockResolvedValue(null);
      mockExtractionServiceInstance.extractProtocolNumber.mockResolvedValue(null);
      mockClipboardServiceInstance.copy.mockResolvedValue(true);

      const expectedTemplateWithPlaceholders = `Situação: [RELATO_DO_CLIENTE] |||
Telefone: [TELEFONE] |||
Protocolo: [PROTOCOLO] |||
OBS: [OBSERVAÇÕES]`;

      const event = createKeyboardEvent(SO_KEY);
      await (shortcutService as any).handleCtrlShiftKeyDown(event);

      expect(mockClipboardServiceInstance.copy)
        .toHaveBeenCalledWith(expectedTemplateWithPlaceholders, SO_LABEL);
      expect(mockNotificationServiceInstance.showToast)
        .toHaveBeenCalledWith(`"${SO_LABEL}" copiado para a área de transferência!`, 'success');
    });

    it('should notify error if template copying fails', async () => {
      const SO_LABEL = await mockTranslator.t('modules.shortcuts.shortcut_service_order_template.label');
      mockExtractionServiceInstance.extractPhoneNumber.mockResolvedValue('123');
      mockExtractionServiceInstance.extractProtocolNumber.mockResolvedValue('456');
      mockClipboardServiceInstance.copy.mockResolvedValue(false);

      const event = createKeyboardEvent(SO_KEY);
      await (shortcutService as any).handleCtrlShiftKeyDown(event);

      expect(mockNotificationServiceInstance.showToast)
        .toHaveBeenCalledWith(`Falha ao copiar "${SO_LABEL}".`, 'error');
    });
  });
});