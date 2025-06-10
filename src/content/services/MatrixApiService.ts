
/**
 * @file src/content/services/MatrixApiService.ts
 * @description Service class for interacting with the Matrix platform's API
 * to fetch and process customer service session data.
 */
import type {
  CustomerServiceSession,
  Message,
  RawMessageFromApi,
  RawServiceItemFromApi,
  ApiResponse
} from '../types';

/**
 * @class MatrixApiService
 * @description Handles API calls to the Matrix platform and transforms the data
 * into a structured format for customer service sessions and messages.
 */
export class MatrixApiService {

  /**
   * Parses a date string into a Date object for sorting purposes.
   * Handles 'YYYY-MM-DD HH:MM:SS' and 'DD/MM/YYYY HH:MM:SS' formats.
   * Logs a warning and returns a minimum date (epoch) for unrecognized formats or invalid input.
   * @private
   * @param {string | undefined} dateString - The date string to parse.
   * @returns {Date} The parsed Date object, or new Date(0) if parsing fails.
   */
  private parseDateForSorting(dateString: string | undefined): Date {
    if (!dateString) return new Date(0); // Epoch for invalid/missing dates

    // Try 'YYYY-MM-DD HH:MM:SS' format
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(dateString)) {
      return new Date(dateString);
    }

    // Try 'DD/MM/YYYY HH:MM:SS' format
    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      // new Date(year, monthIndex (0-11), day, hours, minutes, seconds)
      return new Date(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5], +parts[6]);
    }

    // Unrecognized format, warn and return epoch
    console.warn(`Omni Max [MatrixApiService]: Unrecognized date format for sorting: "${dateString}". Using minimum date.`);
    return new Date(0);
  }

  /**
   * Fetches service attendance records for a given contact ID from the Matrix API,
   * processes them into structured customer service sessions, and sorts them.
   * Sessions are grouped by protocol number, messages are sorted chronologically within each session,
   * and sessions themselves are sorted by the timestamp of their last message (most recent first).
   *
   * @public
   * @param {string} contactId - The ID of the contact whose service sessions are to be fetched.
   * @returns {Promise<CustomerServiceSession[]>} A promise that resolves to an array of processed
   * customer service sessions, or an empty array in case of errors or no data.
   */
  public async getAtendimentosByContato(contactId: string): Promise<CustomerServiceSession[]> {
    const baseUrl = window.location.origin;
    const page = 1; // Assuming pagination parameters, fetching first page
    const rowsToFetch = 10; // Assuming a limit on rows to fetch

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
        // console.log(`Omni Max [MatrixApiService]: Raw service items for contact ${contactId}:`, apiResponse.data); // Kept for debugging if needed

        const rawServiceItems: RawServiceItemFromApi[] = apiResponse.data;
        const groupedSessions = new Map<string, CustomerServiceSession>();
        // Temporary array to hold all messages with context for global sorting
        const allMessagesWithContext: Array<Message & { protocolNumber: string }> = [];

        // Step 1: Prepare all messages and initialize base session structures
        rawServiceItems.forEach(item => {
          const protocolNumber = String(item.num_protocolo);
          const currentAttendanceId = String(item.cod_atendimento);
          const customerName = item.nom_contato || "Cliente"; // Fallback to "Cliente" if name is missing
          const agentName = item.nom_agente || "Atendente"; // Fallback to "Atendente" if name is missing

          // Ensure the base session object exists in the map
          if (!groupedSessions.has(protocolNumber)) {
            groupedSessions.set(protocolNumber, {
              protocolNumber: protocolNumber,
              contactId: String(contactId),
              messages: [],
              contactName: customerName,
              documentNumber: item.num_cpf,
              contactPhone: item.telefone_contato,
              firstMessageTimestamp: undefined, // Will be populated from sorted messages
              lastMessageTimestamp: undefined,  // Will be populated from sorted messages
              originalAttendanceIds: []
            });
          }
          // Add the current attendance ID to the session's list if not already present
          const session = groupedSessions.get(protocolNumber)!; // Non-null assertion, as we just ensured it exists
          if (!session.originalAttendanceIds.includes(currentAttendanceId)) {
            session.originalAttendanceIds.push(currentAttendanceId);
          }

          // Collect messages from this service item
          if (Array.isArray(item.msgs)) {
            item.msgs.forEach((rawMsg: RawMessageFromApi) => {
              let role: Message['role'];
              let senderName: string;

              if (rawMsg.bol_entrante === "1") { // Incoming message from customer
                role = 'customer';
                senderName = customerName;
              } else { // Outgoing message from agent or system
                if (rawMsg.bol_automatica === "1") { // Automated system message
                  role = 'system';
                  senderName = "Chatbot";
                } else { // Message from human agent
                  role = 'agent';
                  senderName = agentName;
                }
              }
              allMessagesWithContext.push({
                protocolNumber, // Context for later grouping
                role,
                senderName,
                content: rawMsg.dsc_msg,
                displayTimestamp: rawMsg.dat_msg, // Original display timestamp string
                timestamp: this.parseDateForSorting(rawMsg.dat_original || rawMsg.dat_msg), // Parsed Date for sorting
                originalAttendanceId: currentAttendanceId
              });
            });
          }
        });

        // Step 2: Sort all collected messages globally by their parsed timestamp
        allMessagesWithContext.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Step 3: Add sorted messages to their respective sessions and define session timestamps
        allMessagesWithContext.forEach(messageDetail => {
          const { protocolNumber, ...messageData } = messageDetail;
          const session = groupedSessions.get(protocolNumber);
          if (session) {
            session.messages.push(messageData);
            // Set firstMessageTimestamp only once from the actual first message
            if (!session.firstMessageTimestamp) {
              session.firstMessageTimestamp = messageData.displayTimestamp;
            }
            // Always update lastMessageTimestamp to reflect the latest message
            session.lastMessageTimestamp = messageData.displayTimestamp;
          }
        });

        const result: CustomerServiceSession[] = Array.from(groupedSessions.values());
        // Sort sessions: most recent last message first.
        // Sessions without messages or parsable last timestamps are sorted towards the end.
        result.sort((a, b) => {
          const dateA = a.lastMessageTimestamp ? this.parseDateForSorting(a.lastMessageTimestamp) : (a.messages.length > 0 ? new Date(0) : new Date(Date.now()));
          const dateB = b.lastMessageTimestamp ? this.parseDateForSorting(b.lastMessageTimestamp) : (b.messages.length > 0 ? new Date(0) : new Date(Date.now()));
          return dateB.getTime() - dateA.getTime(); // Sort descending (most recent first)
        });

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