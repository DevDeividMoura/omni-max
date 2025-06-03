// src/content/services/MatrixApiService.ts
import type {
  CustomerServiceSession, // Renamed from Atendimento
  Message,                // Renamed from Mensagem
  RawMessageFromApi,      // Renamed from MensagemApi
  RawServiceItemFromApi,  // Renamed from AtendimentoApiItem
  ApiResponse
} from '../types';

/**
 * @class MatrixApiService
 * @description Service responsible for fetching and processing service session data
 * from the Matrix platform's API. It consolidates raw API data into a more structured
 * format (`CustomerServiceSession`) used by the application.
 */
export class MatrixApiService {
  // private domService: DomService; // Uncomment if DomService is needed in the future

  /**
   * Constructs an instance of MatrixApiService.
   * // @param {DomService} domService - (Currently unused) Service for DOM interactions.
   */
  // constructor(private domService: DomService) {}

  /**
   * Parses a date string into a Date object.
   * It attempts to parse "YYYY-MM-DD HH:MM:SS" first, then "DD/MM/YYYY HH:MM:SS".
   * Returns a minimum Date (epoch 0) if parsing fails or input is invalid.
   * @param {string | undefined} dateString - The date string to parse.
   * @returns {Date} The parsed Date object, or a minimum Date on failure.
   * @private
   */
  private parseDateForSorting(dateString: string | undefined): Date {
    if (!dateString) return new Date(0); // Minimum date for empty or undefined strings

    // Try "YYYY-MM-DD HH:MM:SS" format (more reliable for `new Date()`)
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(dateString)) {
      return new Date(dateString);
    }

    // Try "DD/MM/YYYY HH:MM:SS" format
    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      // new Date(year, monthIndex (0-11), day, hours, minutes, seconds)
      return new Date(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5], +parts[6]);
    }
    
    console.warn(`Omni Max [MatrixApiService]: Unrecognized date format for sorting: "${dateString}". Using minimum date.`);
    return new Date(0); // Fallback to minimum date
  }

  /**
   * Fetches and consolidates customer service sessions for a given contact ID from the Matrix API.
   * It groups messages by protocol number, sorts them chronologically, and transforms
   * the raw API data into an array of `CustomerServiceSession` objects.
   *
   * @param {string} contactId - The ID of the contact whose service sessions are to be fetched.
   * @returns {Promise<CustomerServiceSession[]>} A Promise that resolves to an array of consolidated
   * `CustomerServiceSession` objects, or an empty array if an error occurs or no data is found.
   */
  public async getAtendimentosByContato(contactId: string): Promise<CustomerServiceSession[]> {
    const baseUrl = window.location.origin;
    const page = 1; 
    const rowsToFetch = 100; // Number of records to fetch per request. Adjust if more are typically needed.

    try {
      const response = await fetch(`${baseUrl}/Painel/atendimento/get-atendimentos/cod_contato/${contactId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          page: String(page),
          rows: String(rowsToFetch)
        })
      });

      if (!response.ok) {
        console.error(`Omni Max [MatrixApiService]: HTTP error ${response.status} for contact ${contactId}`);
        return [];
      }

      const apiResponse: ApiResponse = await response.json();

      if (apiResponse.success === 1 && Array.isArray(apiResponse.data)) {
        console.log(`Omni Max [MatrixApiService]: Raw service items for contact ${contactId}:`, apiResponse.data);

        const rawServiceItems: RawServiceItemFromApi[] = apiResponse.data;

        // 1. Extract all messages, associate them with their protocol and attendance ID, and convert to `Message` format.
        const allMessagesWithDetails: Array<Message & { protocolNumber: string, attendanceId: string }> = [];
        rawServiceItems.forEach(item => {
          const protocolNumber = String(item.num_protocolo);
          const attendanceId = String(item.cod_atendimento);
          if (Array.isArray(item.msgs)) {
            item.msgs.forEach((rawMsg: RawMessageFromApi) => {
              allMessagesWithDetails.push({
                protocolNumber,
                attendanceId,
                role: rawMsg.bol_entrante === "0" ? 'agent' : 'customer', // "0" for agent (outgoing), "1" for customer (incoming)
                content: rawMsg.dsc_msg,
                displayTimestamp: rawMsg.dat_msg, // For display
                timestamp: this.parseDateForSorting(rawMsg.dat_original || rawMsg.dat_msg) // For sorting
              });
            });
          }
        });

        // 2. Sort all extracted messages globally by their processed timestamp.
        allMessagesWithDetails.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // 3. Group messages by protocol number into `CustomerServiceSession` objects.
        const groupedSessions = new Map<string, CustomerServiceSession>();

        for (const messageDetail of allMessagesWithDetails) {
          const { protocolNumber, attendanceId, ...messageData } = messageDetail; // `messageData` is now a `Message` object

          if (groupedSessions.has(protocolNumber)) {
            const existingSession = groupedSessions.get(protocolNumber)!;
            existingSession.messages.push(messageData);
            // Add original attendance ID if not already present for this protocol.
            if (!existingSession.originalAttendanceIds.includes(attendanceId)) {
              existingSession.originalAttendanceIds.push(attendanceId);
            }
            // Update the last message timestamp for the session.
            // Using `dat_original` (via `messageData.timestamp`) would be more robust for chronological accuracy
            // if `displayTimestamp` (dat_msg) isn't guaranteed to be sortable or consistent.
            // For simplicity, if displayTimestamp is what's shown, it can be used for lastMessageTimestamp.
            // Let's assume dat_original from the message is preferred for these boundary timestamps.
            existingSession.lastMessageTimestamp = allMessagesWithDetails
                .filter(m => m.protocolNumber === protocolNumber)
                .sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
                .displayTimestamp; // Or use rawMsg.dat_original for consistency with firstMessageTimestamp's potential source
          } else {
            // This is the first message encountered for this protocol number. Create a new session.
            // Find the original API item that sourced this protocol to get master data like contact name, CPF.
            // This assumes the first API item encountered for a protocol has the representative contact details.
            const sourceApiItem = rawServiceItems.find(item => String(item.num_protocolo) === protocolNumber);
            
            groupedSessions.set(protocolNumber, {
              protocolNumber: protocolNumber,
              contactId: String(contactId), // The contact ID for which this fetch was made
              messages: [messageData],
              contactName: sourceApiItem?.nom_contato,
              documentNumber: sourceApiItem?.num_cpf, // API might send CPF or CNPJ here
              contactPhone: sourceApiItem?.telefone_contato,
              // Use the current message's timestamp as both first and last initially.
              // Prefer `dat_original` for these if available and reliable.
              firstMessageTimestamp: messageData.displayTimestamp, // Or sourceApiItem.msgs[0].dat_original etc.
              lastMessageTimestamp: messageData.displayTimestamp,
              originalAttendanceIds: [attendanceId]
            });
          }
        }
        
        const result: CustomerServiceSession[] = Array.from(groupedSessions.values());
        // Optionally, re-sort sessions themselves if needed, e.g., by last message date.
        result.sort((a,b) => {
            const dateA = a.lastMessageTimestamp ? this.parseDateForSorting(a.lastMessageTimestamp) : new Date(0);
            const dateB = b.lastMessageTimestamp ? this.parseDateForSorting(b.lastMessageTimestamp) : new Date(0);
            return dateB.getTime() - dateA.getTime(); // Sort descending by last message
        });

        console.log(`Omni Max [MatrixApiService]: Consolidated service sessions for contact ${contactId}:`, result);
        return result;

      } else {
        console.error('Omni Max [MatrixApiService]: Error fetching service sessions or unexpected data structure:', apiResponse);
        return [];
      }
    } catch (error) {
      console.error(`Omni Max [MatrixApiService]: Network or parsing error for contact ${contactId}:`, error);
      return [];
    }
  }
}