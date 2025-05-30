/**
 * @file src/content/services/TemplateHandlingService.test.ts
 * @description Unit tests for the TemplateHandlingService class.
 * Mocks dependencies like DomService, Config, and chrome.storage to test template
 * transformation, variable selection, and event handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  globalExtensionEnabledStore,
  moduleStatesStore,
} from '../../storage/stores'
import { TemplateHandlingService } from './TemplateHandlingService'
import type { DomService } from './DomService'
import type { Config } from '../config'


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
  let service: TemplateHandlingService
  let container: HTMLElement

  const createKeyboardEvent = (key: string, target: HTMLElement) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'target', { value: target, writable: false })
    vi.spyOn(ev, 'preventDefault')
    vi.spyOn(ev, 'stopPropagation')
    return ev
  }

  beforeEach(() => {
    vi.resetAllMocks()

    // reset stores
    globalExtensionEnabledStore.set(true)
    moduleStatesStore.set({ templateProcessor: true })

    // replace selection APIs
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection)
    vi.spyOn(document, 'createRange').mockReturnValue(mockRange)

    // instantiate service
    service = new TemplateHandlingService(MOCK_CONFIG, mockDomServiceInstance as unknown as DomService)

    // prepare a fake editable div
    container = document.createElement('div')
    container.className = MOCK_CONFIG.selectors.editableChatbox.slice(1)
    container.setAttribute('contenteditable', 'true')
    document.body.appendChild(container)

    vi.spyOn(document, 'addEventListener')
    vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })


  describe('Listeners', () => {
    it('attachListeners should add keydown listener', () => {
      service.attachListeners()
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    })

    it('detachListeners should remove keydown listener', () => {
      service.attachListeners()
      service.detachListeners()
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true)
    })
  })

  describe('onKeyDown()', () => {
    it('does nothing if global disabled', async () => {
      globalExtensionEnabledStore.set(false)
      const ev = createKeyboardEvent('Tab', container)
      await (service as any).onKeyDown(ev)
      expect(ev.preventDefault).not.toHaveBeenCalled()
      expect(mockDomServiceInstance.getTextSafely).not.toHaveBeenCalled()
    })

    it('does nothing if module disabled', async () => {
      moduleStatesStore.set({ templateProcessor: false })
      const ev = createKeyboardEvent('Tab', container)
      await (service as any).onKeyDown(ev)
      expect(ev.preventDefault).not.toHaveBeenCalled()
      expect(mockDomServiceInstance.getTextSafely).not.toHaveBeenCalled()
    })

    it('does nothing if key is not Tab', async () => {
      const ev = createKeyboardEvent('Enter', container)
      await (service as any).onKeyDown(ev)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })

    it('does nothing if target does not match selector', async () => {
      const other = document.createElement('div')
      const ev = createKeyboardEvent('Tab', other)
      await (service as any).onKeyDown(ev)
      expect(ev.preventDefault).not.toHaveBeenCalled()
    })

    it('prevents default and calls handleTabPressLogic on valid Tab', async () => {
      const spyLogic = vi.spyOn(service as any, 'handleTabPressLogic')
      const ev = createKeyboardEvent('Tab', container)
      await (service as any).onKeyDown(ev)
      expect(ev.preventDefault).toHaveBeenCalled()
      expect(ev.stopPropagation).toHaveBeenCalled()
      expect(spyLogic).toHaveBeenCalledWith(container)
    })
  })

  describe('handleTabPressLogic()', () => {
    it('transforms {FULL NAME} and moves cursor end if no variables', async () => {
      container.textContent = 'Hello {ANA MARIA SOUZA}!'
      mockDomServiceInstance.getTextSafely.mockReturnValue(container.textContent!)
      await (service as any).handleTabPressLogic(container)
      expect(container.textContent).toBe('Hello Ana!')
      expect(mockDomServiceInstance.waitNextFrame).toHaveBeenCalled()
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container)
    })

    it('selects first [VAR] placeholder', async () => {
      const txt = 'Check [ABC123] now'
      container.textContent = txt
      mockDomServiceInstance.getTextSafely.mockReturnValue(txt)
      const node = { nodeValue: txt } as Text
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node, offset: 6 })
        .mockReturnValueOnce({ node, offset: 13 })
      await (service as any).handleTabPressLogic(container)
      expect(mockRange.setStart).toHaveBeenCalledWith(node, 6)
      expect(mockRange.setEnd).toHaveBeenCalledWith(node, 13)
      expect(mockSelection.removeAllRanges).toHaveBeenCalled()
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange)
    })

    it('transforms then selects variable', async () => {
      const raw = 'Hi {CARLOS} [X1]'
      const transformed = 'Hi Carlos [X1]'
      container.textContent = raw
      mockDomServiceInstance.getTextSafely
        .mockReturnValueOnce(raw)
      // after transform, container.textContent is set, safe read not re-called
      const node = { nodeValue: transformed } as Text
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node, offset: 9 })
        .mockReturnValueOnce({ node, offset: 13 })
      await (service as any).handleTabPressLogic(container)
      expect(container.textContent).toBe(transformed)
      expect(mockDomServiceInstance.waitNextFrame).toHaveBeenCalled()
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange)
    })

    it('moves cursor end if no placeholders', async () => {
      container.textContent = 'Just text'
      mockDomServiceInstance.getTextSafely.mockReturnValue('Just text')
      await (service as any).handleTabPressLogic(container)
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container)
    })

    it('warns and moves cursor end if start node missing', async () => {
      const txt = '[X]'
      container.textContent = txt
      mockDomServiceInstance.getTextSafely.mockReturnValue(txt)
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({ node: {} as Text, offset: 2 })
      await (service as any).handleTabPressLogic(container)
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container)
    })

    it('catches range errors and moves cursor end', async () => {
      const txt = '[Y]'
      container.textContent = txt
      mockDomServiceInstance.getTextSafely.mockReturnValue(txt)
      const node = { nodeValue: txt } as Text
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node, offset: 0 })
        .mockReturnValueOnce({ node, offset: 3 })
      const error = new Error('fail')
      vi.mocked(mockRange.setStart).mockImplementation(() => { throw error })
      await (service as any).handleTabPressLogic(container)
      expect(mockDomServiceInstance.moveCursorToEnd).toHaveBeenCalledWith(container)
    })
    it('should select only the first variable if multiple [VARIABLES] exist', async () => {
      const textWithMultipleVars = "First [VAR_A] then [VAR_B]."
      container.textContent = textWithMultipleVars
      mockDomServiceInstance.getTextSafely.mockReturnValue(textWithMultipleVars)

      const mockNode = { nodeValue: textWithMultipleVars } as Text
      mockDomServiceInstance.getTextNodeAndOffsetAtCharIndex
        .mockReturnValueOnce({ node: mockNode, offset: 6 })   // [VAR_A]
        .mockReturnValueOnce({ node: mockNode, offset: 13 })  // end of VAR_A +1

      await service['handleTabPressLogic'](container)

      expect(mockRange.setStart).toHaveBeenCalledWith(mockNode, 6)
      expect(mockRange.setEnd).toHaveBeenCalledWith(mockNode, 13)
      expect(mockSelection.addRange).toHaveBeenCalledOnce()    // only first selected
    })

    describe('transformTemplateText (multiline support)', () => {
      it('preserves blank lines when replacing the name placeholder', () => {
        const raw = `{NOME DO CLIENTE} entrou no sistema.

Por favor, verifique o status.`
        const result = (service as any).transformTemplateText(raw)
        expect(result).toBe(`Nome entrou no sistema.

Por favor, verifique o status.`)
      })
    })

    it('keeps blank lines after name transform when using textContent', async () => {
      const tpl = `{NOME DO CLIENTE} testando.

Linha seguinte após duas quebras.`
      container.textContent = tpl
      mockDomServiceInstance.getTextSafely.mockReturnValueOnce(tpl)

      await service['handleTabPressLogic'](container)

      expect(container.textContent).toContain('\n\n')
    })
  })
});