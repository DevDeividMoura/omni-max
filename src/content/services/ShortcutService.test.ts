/**
 * @file src/content/services/ShortcutService.test.ts
 * @description Unit tests for the ShortcutService class.
 * These tests mock its dependencies (ExtractionService, ClipboardService, NotificationService)
 * and use vitest-chrome for mocking the Chrome API.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked } from 'vitest';
// Certifique-se de que 'chrome' de 'vitest-chrome' esteja disponível globalmente
// ou importe-o se sua configuração exigir: import { chrome } from 'vitest-chrome';
import { ShortcutService } from './ShortcutService';
import type { ExtractionService } from './ExtractionService';
import type { ClipboardService } from './ClipboardService';
import type { NotificationService } from './NotificationService';
import type { ShortcutKeysConfig } from '../../storage';

// --- Mocks for Dependencies ---
const mockExtractionServiceInstance = {
  extractDocumentNumber: vi.fn(),
  extractCustomerName: vi.fn(),
  extractPhoneNumber: vi.fn(),
  extractProtocolNumber: vi.fn(),
};
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
};
vi.mock('./NotificationService', () => ({
  NotificationService: vi.fn(() => mockNotificationServiceInstance),
}));

// --- Helper Types ---
interface MockSettings {
  globalEnable?: boolean;
  shortcutsOverallEnable?: boolean;
  moduleStates?: Record<string, boolean>;
  shortcutKeys?: ShortcutKeysConfig;
}

// --- Test Suite ---
describe('ShortcutService', () => {
  let shortcutService: ShortcutService;
  let mockExtractionService: Mocked<ExtractionService>;
  let mockClipboardService: Mocked<ClipboardService>;
  let mockNotificationService: Mocked<NotificationService>;

  const createKeyboardEvent = (key: string, ctrlKey = true, shiftKey = true): KeyboardEvent => {
    return new KeyboardEvent('keydown', { key, ctrlKey, shiftKey, bubbles: true, cancelable: true });
  };

  // Helper to setup chrome.storage.sync.get mock using vitest-chrome's mocked 'chrome'
  const setupMockSettings = (settings: MockSettings) => {
    // O 'chrome' aqui deve ser o mockado pelo vitest-chrome
    vi.mocked(chrome.storage.sync.get).mockImplementation(((keys: string[], callback?: (items: any) => void) => {
      const result: Record<string, any> = {};
      if (settings.globalEnable !== undefined) result.omniMaxGlobalEnabled = settings.globalEnable;
      if (settings.shortcutsOverallEnable !== undefined) result.omniMaxShortcutsOverallEnabled = settings.shortcutsOverallEnable;
      if (settings.moduleStates !== undefined) result.omniMaxModuleStates = settings.moduleStates;
      if (settings.shortcutKeys !== undefined) result.omniMaxShortcutKeys = settings.shortcutKeys;

      if (typeof callback === 'function') {
        // Simula o comportamento de callback para compatibilidade, embora o serviço use Promises
        callback(result);
        return undefined; // `get` com callback não retorna Promise
      }
      // Simula o comportamento de Promise
      return Promise.resolve(result);
    }) as any); // Usamos 'as any' aqui porque a assinatura mockada pode precisar cobrir ambos os casos (callback e promise)
                 // de forma simplificada para o teste. O importante é que Promise.resolve(result) funcione.
  };


  beforeEach(() => {
    vi.resetAllMocks();

    // As instâncias mockadas são convertidas para any e depois para Mocked<T>
    // para lidar com mocks parciais e ainda ter acesso às propriedades .mock.
    mockExtractionService = mockExtractionServiceInstance as any as Mocked<ExtractionService>;
    mockClipboardService = mockClipboardServiceInstance as any as Mocked<ClipboardService>;
    mockNotificationService = mockNotificationServiceInstance as any as Mocked<NotificationService>;

    shortcutService = new ShortcutService(
      mockExtractionService,
      mockClipboardService,
      mockNotificationService
    );

    setupMockSettings({
      globalEnable: true,
      shortcutsOverallEnable: true,
      moduleStates: {
        shortcutCopyDocumentNumber: true,
        shortcutCopyName: true,
        shortcutServiceOrderTemplate: true,
      },
      shortcutKeys: {
        shortcutCopyName: 'Z',
        shortcutCopyDocumentNumber: 'X',
        shortcutServiceOrderTemplate: 'S',
      },
    });

    vi.spyOn(document, 'addEventListener');
    vi.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ... (o restante dos seus testes 'describe' e 'it' permanecem os mesmos) ...
  // Exemplo:
  describe('attachListeners and detachListeners', () => {
    it('should add keydown event listener on attachListeners', () => {
      shortcutService.attachListeners();
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });

    it('should remove previous listener and add new one on multiple attachListeners calls', () => {
        shortcutService.attachListeners();
        shortcutService.attachListeners();
        expect(document.removeEventListener).toHaveBeenCalledTimes(2);
        expect(document.addEventListener).toHaveBeenCalledTimes(2);
        expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
        expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });

    it('should remove keydown event listener on detachListeners', () => {
      shortcutService.attachListeners();
      shortcutService.detachListeners();
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });
  });

  describe('handleCtrlShiftKeyDown', () => {
    // --- Pre-condition / Guard Tests ---
    it('should do nothing if not Ctrl+Shift combination', async () => {
      const event = createKeyboardEvent('X', false, false);
      await shortcutService['handleCtrlShiftKeyDown'](event);

      expect(mockExtractionService.extractDocumentNumber).not.toHaveBeenCalled();
    });

    it('should do nothing if globalEnable is false', async () => {
      setupMockSettings({ globalEnable: false });
      const event = createKeyboardEvent('X');
      await shortcutService['handleCtrlShiftKeyDown'](event);

      expect(mockNotificationService.showToast).not.toHaveBeenCalled();
    });

    it('should do nothing if shortcutsOverallEnable is false', async () => {
      setupMockSettings({ globalEnable: true, shortcutsOverallEnable: false });
      const event = createKeyboardEvent('X');
      await shortcutService['handleCtrlShiftKeyDown'](event);

      expect(mockNotificationService.showToast).not.toHaveBeenCalled();
    });

    it('should do nothing if the specific module is disabled', async () => {
      setupMockSettings({
        globalEnable: true,
        shortcutsOverallEnable: true,
        moduleStates: { shortcutCopyDocumentNumber: false },
        shortcutKeys: { shortcutCopyDocumentNumber: 'X' }
      });
      const event = createKeyboardEvent('X');
      await shortcutService['handleCtrlShiftKeyDown'](event);

      expect(mockExtractionService.extractDocumentNumber).not.toHaveBeenCalled();
    });

    it('should do nothing if the pressed key does not match any configured shortcut', async () => {
      const event = createKeyboardEvent('Q');
      await shortcutService['handleCtrlShiftKeyDown'](event);

      expect(mockClipboardService.copy).not.toHaveBeenCalled();
    });


    // --- Successful Shortcut Execution Tests ---
    describe('Copy Document Number Shortcut (Ctrl+Shift+X)', () => {
      const DOC_KEY = 'X';
      const DOC_LABEL = "Número do Documento";

      it('should extract, copy, and notify success if document number is found and copied', async () => {
        const mockDocNumber = '12345678900';
        mockExtractionService.extractDocumentNumber.mockResolvedValue(mockDocNumber);
        mockClipboardService.copy.mockResolvedValue(true);

        const event = createKeyboardEvent(DOC_KEY);
        await shortcutService['handleCtrlShiftKeyDown'](event);

        expect(mockExtractionService.extractDocumentNumber).toHaveBeenCalledOnce();
        expect(mockClipboardService.copy).toHaveBeenCalledWith(mockDocNumber, DOC_LABEL);
        expect(mockNotificationService.showToast).toHaveBeenCalledWith(`${DOC_LABEL} "${mockDocNumber}" copiado!`, 'success');
      });

      it('should notify warning if document number is not found', async () => {
        mockExtractionService.extractDocumentNumber.mockResolvedValue(null);

        const event = createKeyboardEvent(DOC_KEY);
        await shortcutService['handleCtrlShiftKeyDown'](event);

        expect(mockExtractionService.extractDocumentNumber).toHaveBeenCalledOnce();
        expect(mockClipboardService.copy).not.toHaveBeenCalled();
        expect(mockNotificationService.showToast).toHaveBeenCalledWith(`${DOC_LABEL} não encontrado na página.`, 'warning');
      });

      it('should notify error if document number is found but copying fails', async () => {
        const mockDocNumber = '12345678900';
        mockExtractionService.extractDocumentNumber.mockResolvedValue(mockDocNumber);
        mockClipboardService.copy.mockResolvedValue(false);

        const event = createKeyboardEvent(DOC_KEY);
        await shortcutService['handleCtrlShiftKeyDown'](event);

        expect(mockClipboardService.copy).toHaveBeenCalledWith(mockDocNumber, DOC_LABEL);
        expect(mockNotificationService.showToast).toHaveBeenCalledWith(`Falha ao copiar ${DOC_LABEL}.`, 'error');
      });
    });

    describe('Copy Customer Name Shortcut (Ctrl+Shift+Z)', () => {
        const NAME_KEY = 'Z';
        const NAME_LABEL = "Nome do Cliente";

        it('should extract, copy, and notify success if name is found and copied using default key', async () => {
            const mockName = 'Fulano de Tal';
            mockExtractionService.extractCustomerName.mockResolvedValue(mockName);
            mockClipboardService.copy.mockResolvedValue(true);

            const event = createKeyboardEvent(NAME_KEY);
            await shortcutService['handleCtrlShiftKeyDown'](event);

            expect(mockExtractionService.extractCustomerName).toHaveBeenCalledOnce();
            expect(mockClipboardService.copy).toHaveBeenCalledWith(mockName, NAME_LABEL);
            expect(mockNotificationService.showToast).toHaveBeenCalledWith(`${NAME_LABEL} "${mockName}" copiado!`, 'success');
        });

        it('should use custom configured key for copy name shortcut', async () => {
            const CUSTOM_NAME_KEY = 'N';
            setupMockSettings({
                globalEnable: true,
                shortcutsOverallEnable: true,
                moduleStates: { shortcutCopyName: true },
                shortcutKeys: { shortcutCopyName: CUSTOM_NAME_KEY }
            });
            const mockName = 'Ciclano Custom';
            mockExtractionService.extractCustomerName.mockResolvedValue(mockName);
            mockClipboardService.copy.mockResolvedValue(true);

            const event = createKeyboardEvent(CUSTOM_NAME_KEY);
            await shortcutService['handleCtrlShiftKeyDown'](event);

            expect(mockExtractionService.extractCustomerName).toHaveBeenCalledOnce();
            expect(mockClipboardService.copy).toHaveBeenCalledWith(mockName, NAME_LABEL);
            expect(mockNotificationService.showToast).toHaveBeenCalledWith(`${NAME_LABEL} "${mockName}" copiado!`, 'success');
        });
    });

    describe('Service Order Template Shortcut (Ctrl+Shift+S)', () => {
        const SO_KEY = 'S';
        const SO_LABEL = "Template de Ordem de Serviço";

        it('should generate template with extracted phone and protocol, copy, and notify', async () => {
            const mockPhone = '11999998888';
            const mockProtocol = '2025001';
            mockExtractionService.extractPhoneNumber.mockResolvedValue(mockPhone);
            mockExtractionService.extractProtocolNumber.mockResolvedValue(mockProtocol);
            mockClipboardService.copy.mockResolvedValue(true);

            const expectedTemplate = `Situação: [RELATO_DO_CLIENTE] |||
Telefone: ${mockPhone} |||
Protocolo: ${mockProtocol} |||
OBS: [OBSERVAÇÕES]`;

            const event = createKeyboardEvent(SO_KEY);
            await shortcutService['handleCtrlShiftKeyDown'](event);

            expect(mockExtractionService.extractPhoneNumber).toHaveBeenCalledOnce();
            expect(mockExtractionService.extractProtocolNumber).toHaveBeenCalledOnce();
            expect(mockClipboardService.copy).toHaveBeenCalledWith(expectedTemplate, SO_LABEL);
            expect(mockNotificationService.showToast).toHaveBeenCalledWith(`${SO_LABEL} "${expectedTemplate}" copiado!`, 'success');
        });

        it('should generate template with placeholders if phone or protocol not found', async () => {
            mockExtractionService.extractPhoneNumber.mockResolvedValue(null);
            mockExtractionService.extractProtocolNumber.mockResolvedValue(null);
            mockClipboardService.copy.mockResolvedValue(true);

            const expectedTemplateWithPlaceholders = `Situação: [RELATO_DO_CLIENTE] |||
Telefone: [TELEFONE] |||
Protocolo: [PROTOCOLO] |||
OBS: [OBSERVAÇÕES]`;

            const event = createKeyboardEvent(SO_KEY);
            await shortcutService['handleCtrlShiftKeyDown'](event);

            expect(mockClipboardService.copy).toHaveBeenCalledWith(expectedTemplateWithPlaceholders, SO_LABEL);
            expect(mockNotificationService.showToast).toHaveBeenCalledWith(`${SO_LABEL} "${expectedTemplateWithPlaceholders}" copiado!`, 'success');
        });

         it('should still show success even if template is mostly placeholders (data is considered "found")', async () => {
            mockExtractionService.extractPhoneNumber.mockResolvedValue(null);
            mockExtractionService.extractProtocolNumber.mockResolvedValue(null);
            mockClipboardService.copy.mockResolvedValue(true);

            const templateWithPlaceholders = `Situação: [RELATO_DO_CLIENTE] |||
Telefone: [TELEFONE] |||
Protocolo: [PROTOCOLO] |||
OBS: [OBSERVAÇÕES]`;

            const event = createKeyboardEvent(SO_KEY);
            await shortcutService['handleCtrlShiftKeyDown'](event);

            expect(mockClipboardService.copy).toHaveBeenCalledWith(templateWithPlaceholders, SO_LABEL);
            expect(mockNotificationService.showToast).toHaveBeenCalledWith(`${SO_LABEL} "${templateWithPlaceholders}" copiado!`, 'success');
        });

        it('should notify error if template copying fails', async () => {
            mockExtractionService.extractPhoneNumber.mockResolvedValue('123');
            mockExtractionService.extractProtocolNumber.mockResolvedValue('456');
            mockClipboardService.copy.mockResolvedValue(false);

            const event = createKeyboardEvent(SO_KEY);
            await shortcutService['handleCtrlShiftKeyDown'](event);
            expect(mockNotificationService.showToast).toHaveBeenCalledWith(`Falha ao copiar ${SO_LABEL}.`, 'error');
        });
    });

    it('should correctly use defaultKey if specific shortcutKey is missing from settings', async () => {
        setupMockSettings({
            globalEnable: true,
            shortcutsOverallEnable: true,
            moduleStates: { shortcutCopyDocumentNumber: true },
            shortcutKeys: { shortcutCopyName: 'N' }
        });
        const mockDocNumber = '98765432100';
        mockExtractionService.extractDocumentNumber.mockResolvedValue(mockDocNumber);
        mockClipboardService.copy.mockResolvedValue(true);

        const event = createKeyboardEvent('X');
        await shortcutService['handleCtrlShiftKeyDown'](event);

        expect(mockExtractionService.extractDocumentNumber).toHaveBeenCalledOnce();
        expect(mockClipboardService.copy).toHaveBeenCalledWith(mockDocNumber, "Número do Documento");
        expect(mockNotificationService.showToast).toHaveBeenCalledWith(`Número do Documento "${mockDocNumber}" copiado!`, 'success');
    });
  });
});