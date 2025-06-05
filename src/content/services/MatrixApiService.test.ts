/**
 * @file src/content/services/MatrixApiService.test.ts
 * @description Unit tests for the MatrixApiService class.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MatrixApiService } from './MatrixApiService';
import type { ApiResponse, CustomerServiceSession, RawMessageFromApi, RawServiceItemFromApi } from '../types';

/**
 * Helper function to create a mock Response object for fetch calls.
 * @param {boolean} ok - Whether the response status is OK (e.g., 200-299).
 * @param {any} data - The data to be returned by response.json().
 * @param {number} [status=200] - The HTTP status code of the response.
 * @returns {object} A mock Response object.
 */
const createFetchResponse = (ok: boolean, data: any, status = 200) => ({
  ok,
  status,
  json: async () => data, // Simulates the .json() method of a Response
});

/**
 * @describe MatrixApiService
 * @description Test suite for the MatrixApiService.
 */
describe('MatrixApiService', () => {
  let service: MatrixApiService;
  let mockFetch: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  // Store the original window.location to restore it after tests
  const originalWindowLocation = window.location;

  beforeEach(() => {
    service = new MatrixApiService();
    mockFetch = vi.fn();
    global.fetch = mockFetch; // Mock global fetch

    // Spy on console methods
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock window.location robustly for tests
    Object.defineProperty(window, 'location', {
      configurable: true, // Essential for restoring in afterEach
      writable: true,     // Allows the value to be changed (though not changed here within tests)
      value: {
        origin: 'http://mockorigin.com',
        // Add other Location properties if your service or tested code uses them.
        // If only 'origin' is used, this is sufficient.
        // For a more complete Location mock, you'd add href, pathname, etc.
        // Minimal example to satisfy the Location interface if needed:
        href: 'http://mockorigin.com/',
        pathname: '/',
        search: '',
        hash: '',
        hostname: 'mockorigin.com',
        port: '',
        protocol: 'http:',
        assign: vi.fn(),
        reload: vi.fn(),
        replace: vi.fn(),
        toString: () => 'http://mockorigin.com/',
        ancestorOrigins: {} as DOMStringList, // Cast to the correct type
        host: 'mockorigin.com',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore all spied/mocked functions
    // Restore the original window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: originalWindowLocation.constructor.prototype.hasOwnProperty('writable') ? (originalWindowLocation as any).writable : true, // Attempt to restore original writability
      value: originalWindowLocation,
    });
  });

  /**
   * @describe parseDateForSorting
   * @description Tests for the private date parsing utility method.
   * Note: Accessing private methods for testing is done via `(service as any)`.
   */
  describe('parseDateForSorting', () => {
    it('should parse "YYYY-MM-DD HH:MM:SS" format correctly', () => {
      const dateStr = '2023-10-26 15:30:00';
      const expectedDate = new Date(2023, 9, 26, 15, 30, 0); // Month is 0-indexed
      expect((service as any).parseDateForSorting(dateStr)).toEqual(expectedDate);
    });

    it('should parse "DD/MM/YYYY HH:MM:SS" format correctly', () => {
      const dateStr = '26/10/2023 15:30:00';
      const expectedDate = new Date(2023, 9, 26, 15, 30, 0);
      expect((service as any).parseDateForSorting(dateStr)).toEqual(expectedDate);
    });

    it('should return minimum date (epoch) and warn for unrecognized format', () => {
      const dateStr = '26-10-2023 15:30'; // Unrecognized format
      expect((service as any).parseDateForSorting(dateStr)).toEqual(new Date(0));
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `Omni Max [MatrixApiService]: Unrecognized date format for sorting: "${dateStr}". Using minimum date.`
      );
    });

    it('should return minimum date (epoch) for undefined input', () => {
      expect((service as any).parseDateForSorting(undefined)).toEqual(new Date(0));
    });

    it('should return minimum date (epoch) for empty string input', () => {
      expect((service as any).parseDateForSorting('')).toEqual(new Date(0));
    });
  });

  /**
   * @describe getAtendimentosByContato
   * @description Tests for the main public method to fetch and process service sessions.
   */
  describe('getAtendimentosByContato', () => {
    const contactId = 'contact123';
    const defaultApiUrl = `http://mockorigin.com/Painel/atendimento/get-atendimentos/cod_contato/${contactId}`;

    it('should fetch, process, and return consolidated service sessions on API success', async () => {
      const rawMsg1: RawMessageFromApi = { bol_entrante: '1', dsc_msg: 'Hello', dat_msg: '01/01/2023 10:00:00', dat_original: '2023-01-01 10:00:00' };
      const rawMsg2: RawMessageFromApi = { bol_entrante: '0', dsc_msg: 'Hi there', dat_msg: '01/01/2023 10:01:00', dat_original: '2023-01-01 10:01:00', bol_automatica: '0' };
      const rawMsg3: RawMessageFromApi = { bol_entrante: '1', dsc_msg: 'Need help', dat_msg: '02/01/2023 11:00:00', dat_original: '2023-01-02 11:00:00' };
      const rawMsg4System: RawMessageFromApi = { bol_entrante: '0', dsc_msg: 'System message', dat_msg: '01/01/2023 09:59:00', dat_original: '2023-01-01 09:59:00', bol_automatica: '1' };

      const rawServiceItem1: RawServiceItemFromApi = {
        num_protocolo: 'P001', cod_atendimento: 'A001', dat_atendimento: '01/01/2023 10:00:00',
        nom_contato: 'John Doe', nom_agente: 'Agent Smith', num_cpf: '11122233344', telefone_contato: '5511999998888',
        msgs: [rawMsg1, rawMsg2, rawMsg4System],
      };
      const rawServiceItem2: RawServiceItemFromApi = { // Same protocol, different attendance ID
        num_protocolo: 'P001', cod_atendimento: 'A002', dat_atendimento: '02/01/2023 11:00:00',
        nom_contato: 'John Doe', nom_agente: 'Agent Neo', // Potentially different agent for continuation
        msgs: [rawMsg3],
      };
      const rawServiceItem3: RawServiceItemFromApi = { // Different protocol
        num_protocolo: 'P002', cod_atendimento: 'A003', dat_atendimento: '03/01/2023 12:00:00',
        nom_contato: 'John Doe', nom_agente: 'Agent Trinity',
        msgs: [{ bol_entrante: '1', dsc_msg: 'Another issue', dat_msg: '03/01/2023 12:00:00', dat_original: '2023-01-03 12:00:00' }],
      };

      const mockApiResponse: ApiResponse = { success: 1, data: [rawServiceItem1, rawServiceItem2, rawServiceItem3] };
      mockFetch.mockResolvedValue(createFetchResponse(true, mockApiResponse));

      const result = await service.getAtendimentosByContato(contactId);

      expect(mockFetch).toHaveBeenCalledWith(defaultApiUrl, expect.objectContaining({ method: 'POST' }));
      expect(result.length).toBe(2); // Expected 2 unique protocol sessions: P001 and P002

      // Sessions should be sorted by the last message's timestamp, most recent first (P002 then P001)
      expect(result[0].protocolNumber).toBe('P002');
      expect(result[1].protocolNumber).toBe('P001');

      const sessionP001 = result.find(s => s.protocolNumber === 'P001');
      expect(sessionP001).toBeDefined();
      if (!sessionP001) return; // Type guard

      expect(sessionP001.contactId).toBe(contactId);
      expect(sessionP001.contactName).toBe('John Doe');
      expect(sessionP001.documentNumber).toBe('11122233344'); // From first item of P001
      expect(sessionP001.contactPhone).toBe('5511999998888'); // From first item of P001
      expect(sessionP001.messages.length).toBe(4); // msg4System, msg1, msg2, msg3 (sorted globally)
      expect(sessionP001.originalAttendanceIds).toEqual(expect.arrayContaining(['A001', 'A002']));
      expect(sessionP001.originalAttendanceIds.length).toBe(2);


      // Verify message order and content for session P001 (sorted: System, Hello, Hi there, Need help)
      expect(sessionP001.messages[0].role).toBe('system');
      expect(sessionP001.messages[0].senderName).toBe('Chatbot');
      expect(sessionP001.messages[0].content).toBe('System message');
      expect(sessionP001.messages[0].originalAttendanceId).toBe('A001');

      expect(sessionP001.messages[1].role).toBe('customer');
      expect(sessionP001.messages[1].senderName).toBe('John Doe');
      expect(sessionP001.messages[1].content).toBe('Hello');
      expect(sessionP001.messages[1].originalAttendanceId).toBe('A001');

      expect(sessionP001.messages[2].role).toBe('agent');
      expect(sessionP001.messages[2].senderName).toBe('Agent Smith'); // From item A001
      expect(sessionP001.messages[2].content).toBe('Hi there');
      expect(sessionP001.messages[2].originalAttendanceId).toBe('A001');

      expect(sessionP001.messages[3].role).toBe('customer');
      expect(sessionP001.messages[3].senderName).toBe('John Doe'); // Name is consistent per protocol
      expect(sessionP001.messages[3].content).toBe('Need help');
      expect(sessionP001.messages[3].originalAttendanceId).toBe('A002');

      expect(sessionP001.firstMessageTimestamp).toBe('01/01/2023 09:59:00'); // From msg4System
      expect(sessionP001.lastMessageTimestamp).toBe('02/01/2023 11:00:00');  // From msg3

      const sessionP002 = result.find(s => s.protocolNumber === 'P002');
      expect(sessionP002).toBeDefined();
      if (!sessionP002) return; // Type guard
      expect(sessionP002.messages.length).toBe(1);
      expect(sessionP002.messages[0].content).toBe('Another issue');
    });

    it('should return an empty array if fetch fails (e.g., HTTP error 500)', async () => {
      mockFetch.mockResolvedValue(createFetchResponse(false, {}, 500));
      const result = await service.getAtendimentosByContato(contactId);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Omni Max [MatrixApiService]: HTTP error 500 for contact ${contactId}`
      );
    });

    it('should return an empty array if API response indicates failure (success: 0)', async () => {
      const mockApiResponse: ApiResponse = { success: 0, data: [] }; // API reports failure
      mockFetch.mockResolvedValue(createFetchResponse(true, mockApiResponse));
      const result = await service.getAtendimentosByContato(contactId);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Omni Max [MatrixApiService]: Error fetching service sessions or unexpected data structure:',
        mockApiResponse
      );
    });

    it('should return an empty array if API response data is not an array', async () => {
      const mockApiResponse = { success: 1, data: {} }; // Data is an object, not an array
      mockFetch.mockResolvedValue(createFetchResponse(true, mockApiResponse));
      const result = await service.getAtendimentosByContato(contactId);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Omni Max [MatrixApiService]: Error fetching service sessions or unexpected data structure:',
        mockApiResponse
      );
    });

    it('should return an empty array on network error or JSON parsing error during fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure')); // Simulate fetch throwing an error
      const result = await service.getAtendimentosByContato(contactId);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Omni Max [MatrixApiService]: Network or parsing error for contact ${contactId}:`,
        expect.any(Error) // Check that an Error object was logged
      );
    });

    it('should handle service items with no messages (empty or undefined msgs array) gracefully', async () => {
      const rawServiceItemNoMsgs: RawServiceItemFromApi = {
        num_protocolo: 'P003', cod_atendimento: 'A004', dat_atendimento: '04/01/2023 10:00:00',
        nom_contato: 'No Msgs User',
        // msgs property is undefined, simulating no messages
      };
      const rawServiceItemEmptyMsgs: RawServiceItemFromApi = {
        num_protocolo: 'P005', cod_atendimento: 'A005', dat_atendimento: '05/01/2023 10:00:00',
        nom_contato: 'Empty Msgs User',
        msgs: [] // msgs property is an empty array
      };
      const mockApiResponse: ApiResponse = { success: 1, data: [rawServiceItemNoMsgs, rawServiceItemEmptyMsgs] };
      mockFetch.mockResolvedValue(createFetchResponse(true, mockApiResponse));

      const result = await service.getAtendimentosByContato(contactId);
      expect(result.length).toBe(2);

      const sessionP003 = result.find(s => s.protocolNumber === 'P003');
      expect(sessionP003).toBeDefined();
      expect(sessionP003?.messages.length).toBe(0);

      const sessionP005 = result.find(s => s.protocolNumber === 'P005');
      expect(sessionP005).toBeDefined();
      expect(sessionP005?.messages.length).toBe(0);
    });

    it('should use default names ("Cliente", "Atendente") if nom_contato or nom_agente are missing/undefined', async () => {
      const rawMsgCustomer: RawMessageFromApi = { bol_entrante: '1', dsc_msg: 'Customer text', dat_msg: '01/01/2023 10:00:00', dat_original: '2023-01-01 10:00:00'};
      const rawMsgAgent: RawMessageFromApi = { bol_entrante: '0', dsc_msg: 'Agent text', dat_msg: '01/01/2023 10:01:00', dat_original: '2023-01-01 10:01:00' };
      const rawServiceItemMissingNames: RawServiceItemFromApi = {
        num_protocolo: 'P004', cod_atendimento: 'A005', dat_atendimento: '05/01/2023 10:00:00',
        // nom_contato and nom_agente are intentionally undefined here
        msgs: [rawMsgCustomer, rawMsgAgent]
      };
      const mockApiResponse: ApiResponse = { success: 1, data: [rawServiceItemMissingNames] };
      mockFetch.mockResolvedValue(createFetchResponse(true, mockApiResponse));

      const result = await service.getAtendimentosByContato(contactId);
      expect(result.length).toBe(1);
      const sessionP004 = result[0];
      expect(sessionP004.contactName).toBe('Cliente'); // Should use default contact name
      expect(sessionP004.messages.length).toBe(2);
      expect(sessionP004.messages[0].senderName).toBe('Cliente'); // Message from customer should use the (defaulted) contactName
      expect(sessionP004.messages[1].senderName).toBe('Atendente'); // Message from agent should use the (defaulted) agentName
    });
  });
});