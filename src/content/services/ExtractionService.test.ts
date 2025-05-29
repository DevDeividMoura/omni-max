/**
 * @file src/content/services/ExtractionService.test.ts
 * @description Unit tests for the ExtractionService class.
 * These tests involve mocking the DomService to simulate various DOM structures
 * and verify the data extraction logic for document numbers, customer names, etc.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtractionService } from './ExtractionService';
import type { Config } from '../config';
import { DomService } from './DomService';

// Mock the DomService module. The actual instance used in tests will be `mockDomServiceInstance`.
vi.mock('./DomService', () => ({
  DomService: vi.fn(() => mockDomServiceInstance),
}));

/**
 * Mock instance for DomService. Its methods will be spied on and have their
 * implementations customized per test case.
 */
const mockDomServiceInstance = {
  query: vi.fn(),
  queryAll: vi.fn(),
  getTextSafely: vi.fn(),
  // Add other DomService methods here if ExtractionService starts using them.
};

/**
 * Base configuration object used as a template for specific test configurations.
 */
const MOCK_BASE_CONFIG: Config = {
  selectors: {
    conversaContainer: '.conversa-main', // Default, can be overridden
    editableChatbox: '.chatbox-input',
    // The following are more specific and likely overridden per method test suite
    cpfInfoContainer: 'div.cpf-section',
    cpfLabelQueryInContainer: 'label.cpf-text',
    nameInfoContainer: 'div.name-section',
    phoneInfoContainer: 'div.phone-section',
    phoneLabelQueryInContainer: 'label.phone-text',
    protocolInfoContainer: 'div.protocol-section',
    protocolLabelQueryInContainer: 'label.protocol-text',
    tabsList: '#chat-tabs',
  },
  textMarkers: {
    cpfLabel: 'CPF/CNPJ:',
    customerNameIndicator: 'Nome Cliente:',
    customerNameSeparator: ' - ',
    phoneLabel: 'Telefone Contato:',
    protocolLabel: 'Nº Protocolo:',
  }
};

/**
 * Creates a mock HTMLElement with optional text content and a child element.
 * This helper simplifies the creation of DOM structures needed for tests.
 * @param textContent The text content for the created element. If null, returns null.
 * @param childClass CSS class for an optional child span element.
 * @param childTextContent Text content for the optional child span element.
 * @returns {HTMLElement | null} The mock HTMLElement or null.
 */
const createElementMock = (
  textContent: string | null,
  childClass?: string,
  childTextContent?: string
): HTMLElement | null => {
  if (textContent === null) return null;
  // Using 'div' as a generic container; specific tag type rarely matters for these mocks.
  const el = document.createElement('div');
  el.textContent = textContent;

  if (childClass && childTextContent) {
    const childEl = document.createElement('span');
    childEl.className = childClass.startsWith('.') ? childClass.substring(1) : childClass;
    childEl.textContent = childTextContent;
    el.appendChild(childEl);
  }
  return el;
};

/**
 * Test suite for the `ExtractionService`.
 */
describe('ExtractionService', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset all mocks before each test to ensure test isolation.
    vi.resetAllMocks();

    // Provide default implementations for DomService mocks for each test.
    // Tests can override these as needed.
    mockDomServiceInstance.query.mockReturnValue(null); // Default: element not found
    mockDomServiceInstance.queryAll.mockReturnValue([]);   // Default: no elements found
    mockDomServiceInstance.getTextSafely.mockImplementation(el => el?.textContent?.trim() || '');

    // Spy on console methods.
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console spies.
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  // --- Test Suite for `extractDocumentNumber` method ---
  describe('extractDocumentNumber', () => {
    let service: ExtractionService;
    const mockConvoContainer = createElementMock("Conversation Area");
    const config: Config = {
      ...MOCK_BASE_CONFIG,
      selectors: {
        ...MOCK_BASE_CONFIG.selectors,
        conversaContainer: '#convo-test-area',
        cpfInfoContainer: 'div.doc-details', // Example: Parent of the element containing CPF
        cpfLabelQueryInContainer: 'strong.doc-label', // Example: The <strong>CPF/CNPJ:</strong> itself
      },
      textMarkers: {
        ...MOCK_BASE_CONFIG.textMarkers,
        cpfLabel: 'Documento:', // Example label
      },
    };

    beforeEach(() => {
      // Create service instance specific to this describe block
      service = new ExtractionService(config, new DomService());
      // Default mock for conversation container for this suite
      mockDomServiceInstance.query.mockImplementation((selector) =>
        selector === config.selectors.conversaContainer ? mockConvoContainer : null
      );
    });

    /**
     * Tests successful extraction and formatting of a CPF number.
     */
    it('should extract and format a CPF number correctly', () => {
      const cpfValue = '12345678900';
      const parentElementWithCpfText = createElementMock(`Contains CPF label and value`);
      const labelElement = createElementMock(config.textMarkers.cpfLabel);

      mockDomServiceInstance.queryAll.mockReturnValue([parentElementWithCpfText!]);
      mockDomServiceInstance.query.mockImplementation((sel, context) => {
        if (sel === config.selectors.conversaContainer) return mockConvoContainer;
        if (sel === config.selectors.cpfLabelQueryInContainer && context === parentElementWithCpfText) return labelElement;
        return null;
      });
      mockDomServiceInstance.getTextSafely.mockImplementation((el) => {
        if (el === parentElementWithCpfText) return `${config.textMarkers.cpfLabel} ${cpfValue}`;
        if (el === labelElement) return config.textMarkers.cpfLabel;
        return '';
      });

      const documentNumber = service.extractDocumentNumber();
      expect(documentNumber).toBe('123.456.789-00');
      expect(consoleLogSpy).toHaveBeenCalledWith("Omni Max [ExtractionService]: Extracted Document Number:", '123.456.789-00');
    });

    /**
     * Tests successful extraction and formatting of a CNPJ number.
     */
    it('should extract and format a CNPJ number correctly', () => {
      const cnpjValue = '12345678000199';
      const parentElementWithCnpjText = createElementMock("Contains CNPJ");
      const labelElement = createElementMock(config.textMarkers.cpfLabel);

      mockDomServiceInstance.queryAll.mockReturnValue([parentElementWithCnpjText!]);
      mockDomServiceInstance.query.mockImplementation((sel, context) => {
        if (sel === config.selectors.conversaContainer) return mockConvoContainer;
        if (sel === config.selectors.cpfLabelQueryInContainer && context === parentElementWithCnpjText) return labelElement;
        return null;
      });
      mockDomServiceInstance.getTextSafely.mockImplementation((el) => {
        if (el === parentElementWithCnpjText) return `${config.textMarkers.cpfLabel} ${cnpjValue}`;
        if (el === labelElement) return config.textMarkers.cpfLabel;
        return '';
      });

      const documentNumber = service.extractDocumentNumber();
      expect(documentNumber).toBe('12.345.678/0001-99');
    });

    /**
     * Verifies that if an extracted number does not match CPF or CNPJ length,
     * it is returned unformatted (but cleaned of non-digits).
     */
    it('should return unformatted number if its length does not match CPF/CNPJ', () => {
      const shortNumber = '12345';
      const parentElementWithShortNumber = createElementMock("Contains short number");
      const labelElement = createElementMock(config.textMarkers.cpfLabel);

      mockDomServiceInstance.queryAll.mockReturnValue([parentElementWithShortNumber!]);
      mockDomServiceInstance.query.mockImplementation((sel, context) =>
         sel === config.selectors.conversaContainer ? mockConvoContainer :
        (sel === config.selectors.cpfLabelQueryInContainer && context === parentElementWithShortNumber ? labelElement : null)
      );
      mockDomServiceInstance.getTextSafely.mockImplementation(el =>
        el === parentElementWithShortNumber ? `${config.textMarkers.cpfLabel} ${shortNumber}` :
        (el === labelElement ? config.textMarkers.cpfLabel : '')
      );

      const documentNumber = service.extractDocumentNumber();
      expect(documentNumber).toBe(shortNumber);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('does not match CPF or CNPJ length'));
    });

    /**
     * Tests that null is returned and a warning logged if the main conversation container is not found.
     */
    it('should return null and warn if conversation container is not found', () => {
      mockDomServiceInstance.query.mockReturnValue(null); // Simulate conversation container not found
      expect(service.extractDocumentNumber()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Conversation container not found"));
    });

    /**
     * Tests that null is returned and a warning logged if the CPF/CNPJ label or its specific parent element is not found.
     */
    it('should return null and warn if document info container or label is not found', () => {
      mockDomServiceInstance.query.mockReturnValue(mockConvoContainer); // Conversation container found
      mockDomServiceInstance.queryAll.mockReturnValue([]); // ...but no elements matching cpfInfoContainer
      
      expect(service.extractDocumentNumber()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("CPF Label"));
    });

    /**
     * Verifies that null is returned if the document number text is missing after the label.
     */
    it('should return null if document number text is missing after its label', () => {
      const parentElementWithoutDocNo = createElementMock("Contains label only");
      const labelElement = createElementMock(config.textMarkers.cpfLabel);

      mockDomServiceInstance.queryAll.mockReturnValue([parentElementWithoutDocNo!]);
      mockDomServiceInstance.query.mockImplementation((sel, context) =>
         sel === config.selectors.conversaContainer ? mockConvoContainer :
        (sel === config.selectors.cpfLabelQueryInContainer && context === parentElementWithoutDocNo ? labelElement : null)
      );
      mockDomServiceInstance.getTextSafely.mockImplementation(el =>
        el === parentElementWithoutDocNo ? `${config.textMarkers.cpfLabel} ` : // Note the space, but no number
        (el === labelElement ? config.textMarkers.cpfLabel : '')
      );

      expect(service.extractDocumentNumber()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("CPF Label"));
    });
  });

  // --- Test Suite for `extractCustomerName` method ---
  describe('extractCustomerName', () => {
    let service: ExtractionService;
    const mockConvoContainer = createElementMock("Conversation Area");
    const config: Config = {
      ...MOCK_BASE_CONFIG,
      selectors: {
        ...MOCK_BASE_CONFIG.selectors,
        conversaContainer: '#convo-test-area',
        nameInfoContainer: 'div.customer-name-source', // Element containing text with name indicator
      },
      textMarkers: {
        ...MOCK_BASE_CONFIG.textMarkers,
        customerNameIndicator: 'Customer Name:',
        customerNameSeparator: '>>',
      },
    };

    beforeEach(() => {
      service = new ExtractionService(config, new DomService());
      mockDomServiceInstance.query.mockReturnValue(mockConvoContainer); // Default: convo container found
    });
    
    /**
     * Tests successful extraction of a customer name using configured indicators and separators.
     */
    it('should extract customer name correctly using indicator and separator', () => {
      const nameSourceText = `Info ${config.textMarkers.customerNameIndicator} ID123 ${config.textMarkers.customerNameSeparator} Expected Name Here`;
      const nameSourceElement = createElementMock(nameSourceText);
      mockDomServiceInstance.queryAll.mockReturnValue([nameSourceElement!]); // Simulates finding the nameInfoContainer

      const name = service.extractCustomerName();
      expect(name).toBe('Expected Name Here');
      expect(consoleLogSpy).toHaveBeenCalledWith("Omni Max [ExtractionService]: Extracted Customer Name:", 'Expected Name Here');
    });

    /**
     * Verifies that null is returned if the `customerNameSeparator` is missing from the config,
     * as the extraction logic relies on it.
     */
    it('should return null if customerNameSeparator is undefined in config', () => {
      const configNoSeparator: Config = {
        ...config,
        textMarkers: { ...config.textMarkers, customerNameSeparator: undefined },
      };
      const nameSourceElement = createElementMock(`Info ${config.textMarkers.customerNameIndicator} NameWithoutSeparator`);
      mockDomServiceInstance.queryAll.mockReturnValue([nameSourceElement!]);
      
      const specificService = new ExtractionService(configNoSeparator, new DomService());
      expect(specificService.extractCustomerName()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Customer name could not be extracted"));
    });
    
    /**
     * Tests that null is returned if the name part is empty or missing after the separators.
     */
    it('should return null if name part is empty after indicator and separator', () => {
      const nameSourceText = `Info ${config.textMarkers.customerNameIndicator} ID123 ${config.textMarkers.customerNameSeparator} `; // Note trailing space
      const nameSourceElement = createElementMock(nameSourceText);
      mockDomServiceInstance.queryAll.mockReturnValue([nameSourceElement!]);

      expect(service.extractCustomerName()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Customer name could not be extracted"));
    });

    /**
     * Tests that null is returned if the element containing the name indicator is not found.
     */
    it('should return null if nameInfoContainer is not found', () => {
      mockDomServiceInstance.queryAll.mockReturnValue([]); // Simulate nameInfoContainer not found
      expect(service.extractCustomerName()).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Customer name could not be extracted"));
    });
  });

  // --- Test Suite for `extractPhoneNumber` method ---
  describe('extractPhoneNumber', () => {
    let service: ExtractionService;
    const mockConvoContainer = createElementMock("Conversation Area");
    const config: Config = {
      ...MOCK_BASE_CONFIG,
      selectors: {
        ...MOCK_BASE_CONFIG.selectors,
        conversaContainer: '#convo-test-area',
        phoneInfoContainer: 'div.phone-source-container',
        phoneLabelQueryInContainer: 'span.phone-label-text',
      },
      textMarkers: {
        ...MOCK_BASE_CONFIG.textMarkers,
        phoneLabel: 'Fone:',
      },
    };

    beforeEach(() => {
      service = new ExtractionService(config, new DomService());
      mockDomServiceInstance.query.mockImplementation((selector) =>
        selector === config.selectors.conversaContainer ? mockConvoContainer : null
      );
    });

    /**
     * Tests successful extraction and cleaning of a phone number.
     */
    it('should extract and clean a phone number correctly', () => {
      const rawPhoneNumber = '(11) 98765-4321';
      const expectedCleanedNumber = '11987654321';
      const phoneParentElement = createElementMock("Contains phone");
      const phoneLabelElement = createElementMock(config.textMarkers.phoneLabel!);

      mockDomServiceInstance.queryAll.mockReturnValue([phoneParentElement!]);
      mockDomServiceInstance.query.mockImplementation((sel, context) => {
        if (sel === config.selectors.conversaContainer) return mockConvoContainer;
        if (sel === config.selectors.phoneLabelQueryInContainer && context === phoneParentElement) return phoneLabelElement;
        return null;
      });
      mockDomServiceInstance.getTextSafely.mockImplementation((el) => {
        if (el === phoneParentElement) return `${config.textMarkers.phoneLabel} ${rawPhoneNumber}`;
        if (el === phoneLabelElement) return config.textMarkers.phoneLabel!;
        return '';
      });

      const phoneNumber = service.extractPhoneNumber();
      expect(phoneNumber).toBe(expectedCleanedNumber);
      // The log includes the raw extracted text before cleaning, which is " (11) 98765-4321 ext. 123"
      expect(consoleLogSpy).toHaveBeenCalledWith("Omni Max [ExtractionService]: Telefone extraído:", `${rawPhoneNumber}`);
    });
    
    /**
     * Verifies robust handling if a colon immediately follows the phone label.
     */
    it('should correctly extract phone number when a colon follows the label', () => {
      const rawPhoneNumber = '(22) 1234-5678';
      const expectedCleanedNumber = '2212345678';
      const phoneParentElementWithColon = createElementMock("Contains phone with colon");
      const phoneLabelElement = createElementMock(config.textMarkers.phoneLabel!);

      mockDomServiceInstance.queryAll.mockReturnValue([phoneParentElementWithColon!]);
       mockDomServiceInstance.query.mockImplementation((sel, context) => {
        if (sel === config.selectors.conversaContainer) return mockConvoContainer;
        if (sel === config.selectors.phoneLabelQueryInContainer && context === phoneParentElementWithColon) return phoneLabelElement;
        return null;
      });
      mockDomServiceInstance.getTextSafely.mockImplementation(el =>
        el === phoneParentElementWithColon ? `${config.textMarkers.phoneLabel}: ${rawPhoneNumber}` : // Note the colon
        (el === phoneLabelElement ? config.textMarkers.phoneLabel! : '')
      );

      const phoneNumber = service.extractPhoneNumber();
      expect(phoneNumber).toBe(expectedCleanedNumber);
    });
  });

  // --- Test Suite for `extractProtocolNumber` method ---
  describe('extractProtocolNumber', () => {
    let service: ExtractionService;
    const mockConvoContainer = createElementMock("Conversation Area");
    const config: Config = {
      ...MOCK_BASE_CONFIG,
      selectors: {
        ...MOCK_BASE_CONFIG.selectors,
        conversaContainer: '#convo-test-area',
        protocolInfoContainer: 'section.protocol-data',
        protocolLabelQueryInContainer: 'h3.protocol-title',
      },
      textMarkers: {
        ...MOCK_BASE_CONFIG.textMarkers,
        protocolLabel: 'Protocolo Atendimento:',
      },
    };

    beforeEach(() => {
      service = new ExtractionService(config, new DomService());
      // Default mock for conversation container for this suite
       mockDomServiceInstance.query.mockImplementation((selector) => {
        if (selector === config.selectors.conversaContainer) {
            return mockConvoContainer;
        }
        // Allow other query calls within the find logic if they don't specify a context or use document
        return null; 
      });
    });
    
    /**
     * Tests successful extraction and cleaning of a protocol number.
     */
    it('should extract and clean a protocol number correctly', () => {
      const rawProtocolNumber = '202400123';
      const expectedCleanedNumber = '202400123';
      const protocolParentElement = createElementMock("Contains protocol");
      const protocolLabelElement = createElementMock(config.textMarkers.protocolLabel!);

      mockDomServiceInstance.queryAll.mockImplementation((sel, context) =>
        (sel === config.selectors.protocolInfoContainer && context === mockConvoContainer) ? [protocolParentElement!] : []
      );
      // Specific mock for query *within* the find loop of extractProtocolNumber
      const originalQueryMock = mockDomServiceInstance.query.getMockImplementation();
      mockDomServiceInstance.query.mockImplementation((sel, context) => {
          if (sel === config.selectors.conversaContainer && !context) return mockConvoContainer; // Top-level query
          if (sel === config.selectors.protocolLabelQueryInContainer && context === protocolParentElement) return protocolLabelElement;
          if (originalQueryMock) return originalQueryMock(sel,context); // Fallback to default or other specific mocks
          return null;
      });
      mockDomServiceInstance.getTextSafely.mockImplementation((el) => {
        if (el === protocolParentElement) return `${config.textMarkers.protocolLabel} ${rawProtocolNumber}`;
        if (el === protocolLabelElement) return config.textMarkers.protocolLabel!;
        return '';
      });

      const protocolNumber = service.extractProtocolNumber();
      expect(protocolNumber).toBe(expectedCleanedNumber);
      expect(consoleLogSpy).toHaveBeenCalledWith("Omni Max [ExtractionService]: Protocolo extraído:", expectedCleanedNumber);
    });
  });
});