/**
 * @file src/content/services/ShortcutService.test.ts
 * @description Unit tests for the ShortcutService class.
 * These tests mock its dependencies (ExtractionService, ClipboardService, NotificationService)
 * and use vitest-chrome for mocking the Chrome API.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mocked  } from 'vitest'
import { get } from 'svelte/store'
import {
  globalExtensionEnabledStore,
  shortcutsOverallEnabledStore,
  moduleStatesStore,
  shortcutKeysStore,
} from '../../storage/stores'
import { ShortcutService } from './ShortcutService'
import type { ExtractionService } from './ExtractionService'
import type { ClipboardService } from './ClipboardService'
import type { NotificationService } from './NotificationService'

// --- Mocks for Dependencies ---
const mockExtractionServiceInstance = {
  extractDocumentNumber: vi.fn(),
  extractCustomerName: vi.fn(),
  extractPhoneNumber: vi.fn(),
  extractProtocolNumber: vi.fn(),
} as unknown as Mocked<ExtractionService>

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
} as unknown as NotificationService
vi.mock('./NotificationService', () => ({
  NotificationService: vi.fn(() => mockNotificationServiceInstance),
}));

// --- Test Suite ---
describe('ShortcutService', () => {
  let shortcutService: ShortcutService

  const createKeyboardEvent = (key: string, ctrl = true, shift = true) =>
    new KeyboardEvent('keydown', { key, ctrlKey: ctrl, shiftKey: shift })

  beforeEach(() => {
    vi.resetAllMocks()

    // Inicializa stores no estado padrão 'habilitado'
    globalExtensionEnabledStore.set(true)
    shortcutsOverallEnabledStore.set(true)
    moduleStatesStore.set({
      shortcutCopyDocumentNumber: true,
      shortcutCopyName: true,
      shortcutServiceOrderTemplate: true,
    })
    shortcutKeysStore.set({
      shortcutCopyDocumentNumber: 'X',
      shortcutCopyName: 'Z',
      shortcutServiceOrderTemplate: 'S',
    })

    shortcutService = new ShortcutService(
      mockExtractionServiceInstance as ExtractionService,
      mockClipboardServiceInstance as ClipboardService,
      mockNotificationServiceInstance as NotificationService
    )

    vi.spyOn(document, 'addEventListener')
    vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('attachListeners / detachListeners', () => {
    it('attaches keydown listener', () => {
      shortcutService.attachListeners()
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    })

    it('detaches and re-attaches listener if called twice', () => {
      shortcutService.attachListeners()
      shortcutService.attachListeners()
      expect(document.removeEventListener).toHaveBeenCalledTimes(2)
      expect(document.addEventListener).toHaveBeenCalledTimes(2)
    })

    it('detaches listener on detachListeners', () => {
      shortcutService.attachListeners()
      shortcutService.detachListeners()
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    })
  })

  describe('handleCtrlShiftKeyDown guards', () => {
    it('ignores non-Ctrl+Shift events', async () => {
      const ev = createKeyboardEvent('X', false, false)
      await (shortcutService as any).handleCtrlShiftKeyDown(ev)
      expect(mockExtractionServiceInstance.extractDocumentNumber).not.toHaveBeenCalled()
    })

    it('ignores when globally disabled', async () => {
      globalExtensionEnabledStore.set(false)
      const ev = createKeyboardEvent('X')
      await (shortcutService as any).handleCtrlShiftKeyDown(ev)
      expect(mockNotificationServiceInstance.showToast).not.toHaveBeenCalled()
    })

    it('ignores when shortcuts section disabled', async () => {
      shortcutsOverallEnabledStore.set(false)
      const ev = createKeyboardEvent('X')
      await (shortcutService as any).handleCtrlShiftKeyDown(ev)
      expect(mockNotificationServiceInstance.showToast).not.toHaveBeenCalled()
    })

    it('ignores when specific module disabled', async () => {
      moduleStatesStore.update(ms => ({ ...ms, shortcutCopyDocumentNumber: false }))
      const ev = createKeyboardEvent('X')
      await (shortcutService as any).handleCtrlShiftKeyDown(ev)
      expect(mockExtractionServiceInstance.extractDocumentNumber).not.toHaveBeenCalled()
    })
  })

  describe('Copy Document Number (Ctrl+Shift+X)', () => {
    const KEY = 'X'
    const LABEL = 'Número do Documento'

    it('copies and notifies on success', async () => {
      mockExtractionServiceInstance.extractDocumentNumber.mockResolvedValue('123')
      mockClipboardServiceInstance.copy.mockResolvedValue(true)

      const ev = createKeyboardEvent(KEY)
      await (shortcutService as any).handleCtrlShiftKeyDown(ev)

      expect(mockExtractionServiceInstance.extractDocumentNumber).toHaveBeenCalled()
      expect(mockClipboardServiceInstance.copy).toHaveBeenCalledWith('123', LABEL)
      expect(mockNotificationServiceInstance.showToast).toHaveBeenCalledWith(`${LABEL} "123" copiado!`, 'success')
    })

    it('warns if no data', async () => {
      mockExtractionServiceInstance.extractDocumentNumber.mockResolvedValue(null)
      const ev = createKeyboardEvent(KEY)
      await (shortcutService as any).handleCtrlShiftKeyDown(ev)

      expect(mockNotificationServiceInstance.showToast).toHaveBeenCalledWith(`${LABEL} não encontrado na página.`, 'warning')
    })

    it('errors if copy fails', async () => {
      mockExtractionServiceInstance.extractDocumentNumber.mockResolvedValue('123')
      mockClipboardServiceInstance.copy.mockResolvedValue(false)
      const ev = createKeyboardEvent(KEY)
      await (shortcutService as any).handleCtrlShiftKeyDown(ev)

      expect(mockNotificationServiceInstance.showToast).toHaveBeenCalledWith(`Falha ao copiar ${LABEL}.`, 'error')
    })
  })

    describe('Copy Customer Name Shortcut (Ctrl+Shift+Z)', () => {
  const NAME_KEY = 'Z'
  const NAME_LABEL = 'Nome do Cliente'

  beforeEach(() => {
    // Reset store state before each test
    globalExtensionEnabledStore.set(true)
    shortcutsOverallEnabledStore.set(true)
    moduleStatesStore.set({
      shortcutCopyDocumentNumber: true,
      shortcutCopyName: true,
      shortcutServiceOrderTemplate: true,
    })
    shortcutKeysStore.set({
      shortcutCopyDocumentNumber: 'X',
      shortcutCopyName: 'Z',           // default
      shortcutServiceOrderTemplate: 'S',
    })
  })

  it('should extract, copy, and notify success if name is found and copied using default key', async () => {
    const mockName = 'Fulano de Tal'
    mockExtractionServiceInstance.extractCustomerName.mockResolvedValue(mockName)
    mockClipboardServiceInstance.copy.mockResolvedValue(true)

    const event = createKeyboardEvent(NAME_KEY)
    await (shortcutService as any).handleCtrlShiftKeyDown(event)

    expect(mockExtractionServiceInstance.extractCustomerName).toHaveBeenCalledOnce()
    expect(mockClipboardServiceInstance.copy).toHaveBeenCalledWith(mockName, NAME_LABEL)
    expect(mockNotificationServiceInstance.showToast)
      .toHaveBeenCalledWith(`${NAME_LABEL} "${mockName}" copiado!`, 'success')
  })

  it('should use custom configured key for copy name shortcut', async () => {
    // change only the shortcutKeys store
    shortcutKeysStore.update(keys => ({ ...keys, shortcutCopyName: 'N' }))

    const mockName = 'Ciclano Custom'
    mockExtractionServiceInstance.extractCustomerName.mockResolvedValue(mockName)
    mockClipboardServiceInstance.copy.mockResolvedValue(true)

    const event = createKeyboardEvent('N')
    await (shortcutService as any).handleCtrlShiftKeyDown(event)

    expect(mockExtractionServiceInstance.extractCustomerName).toHaveBeenCalledOnce()
    expect(mockClipboardServiceInstance.copy).toHaveBeenCalledWith(mockName, NAME_LABEL)
    expect(mockNotificationServiceInstance.showToast)
      .toHaveBeenCalledWith(`${NAME_LABEL} "${mockName}" copiado!`, 'success')
  })
})

describe('Service Order Template Shortcut (Ctrl+Shift+S)', () => {
  const SO_KEY = 'S'
  const SO_LABEL = 'Template de Ordem de Serviço'

  beforeEach(() => {
    globalExtensionEnabledStore.set(true)
    shortcutsOverallEnabledStore.set(true)
    moduleStatesStore.set({
      shortcutCopyDocumentNumber: true,
      shortcutCopyName: true,
      shortcutServiceOrderTemplate: true,
    })
    shortcutKeysStore.set({
      shortcutCopyDocumentNumber: 'X',
      shortcutCopyName: 'Z',
      shortcutServiceOrderTemplate: 'S', // default
    })
  })

  it('should generate template with extracted phone and protocol, copy, and notify', async () => {
    const mockPhone = '11999998888'
    const mockProtocol = '2025001'
    mockExtractionServiceInstance.extractPhoneNumber.mockResolvedValue(mockPhone)
    mockExtractionServiceInstance.extractProtocolNumber.mockResolvedValue(mockProtocol)
    mockClipboardServiceInstance.copy.mockResolvedValue(true)

    const expectedTemplate = `Situação: [RELATO_DO_CLIENTE] |||
Telefone: ${mockPhone} |||
Protocolo: ${mockProtocol} |||
OBS: [OBSERVAÇÕES]`

    const event = createKeyboardEvent(SO_KEY)
    await (shortcutService as any).handleCtrlShiftKeyDown(event)

    expect(mockExtractionServiceInstance.extractPhoneNumber).toHaveBeenCalledOnce()
    expect(mockExtractionServiceInstance.extractProtocolNumber).toHaveBeenCalledOnce()
    expect(mockClipboardServiceInstance.copy)
      .toHaveBeenCalledWith(expectedTemplate, SO_LABEL)
    expect(mockNotificationServiceInstance.showToast)
      .toHaveBeenCalledWith(`${SO_LABEL} "${expectedTemplate}" copiado!`, 'success')
  })

  it('should generate template with placeholders if phone or protocol not found', async () => {
    mockExtractionServiceInstance.extractPhoneNumber.mockResolvedValue(null)
    mockExtractionServiceInstance.extractProtocolNumber.mockResolvedValue(null)
    mockClipboardServiceInstance.copy.mockResolvedValue(true)

    const expectedTemplateWithPlaceholders = `Situação: [RELATO_DO_CLIENTE] |||
Telefone: [TELEFONE] |||
Protocolo: [PROTOCOLO] |||
OBS: [OBSERVAÇÕES]`

    const event = createKeyboardEvent(SO_KEY)
    await (shortcutService as any).handleCtrlShiftKeyDown(event)

    expect(mockClipboardServiceInstance.copy)
      .toHaveBeenCalledWith(expectedTemplateWithPlaceholders, SO_LABEL)
    expect(mockNotificationServiceInstance.showToast)
      .toHaveBeenCalledWith(`${SO_LABEL} "${expectedTemplateWithPlaceholders}" copiado!`, 'success')
  })

  it('should notify error if template copying fails', async () => {
    mockExtractionServiceInstance.extractPhoneNumber.mockResolvedValue('123')
    mockExtractionServiceInstance.extractProtocolNumber.mockResolvedValue('456')
    mockClipboardServiceInstance.copy.mockResolvedValue(false)

    const event = createKeyboardEvent(SO_KEY)
    await (shortcutService as any).handleCtrlShiftKeyDown(event)

    expect(mockNotificationServiceInstance.showToast)
      .toHaveBeenCalledWith(`Falha ao copiar ${SO_LABEL}.`, 'error')
  })
})

  });
