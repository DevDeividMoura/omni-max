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
    const rowsToFetch = 10; // Number of records to fetch per request. Adjust if more are typically needed.

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

        const agentNameByAttendanceId: Record<string, string | undefined> = {};
            rawServiceItems.forEach(item => {
                agentNameByAttendanceId[String(item.cod_atendimento)] = item.nom_agente;
            });

            const allMessagesWithContext: Array<Message & { // Usando a interface Message atualizada
                protocolNumber: string;
                // attendanceId já está em originalAttendanceId dentro de Message
            }> = [];

       rawServiceItems.forEach(item => {
                const protocolNumber = String(item.num_protocolo);
                const currentAttendanceId = String(item.cod_atendimento);
                const customerName = item.nom_contato || "Cliente"; // Nome do cliente para este RawServiceItem
                const agentName = item.nom_agente || "Atendente";     // Nome do agente para este RawServiceItem

                if (Array.isArray(item.msgs)) {
                    item.msgs.forEach((rawMsg: RawMessageFromApi) => {
                        let role: Message['role'];
                        let senderName: string;

                        if (rawMsg.bol_entrante === "1") { // Mensagem do cliente
                            role = 'customer';
                            senderName = customerName; // Usar o nome do contato do item de atendimento
                        } else { // Mensagem do sistema/agente (bol_entrante === "0")
                            if (rawMsg.bol_automatica === "1") {
                                role = 'system';
                                senderName = "Chatbot"; // Ou um nome mais específico se a API fornecer
                            } else {
                                role = 'agent';
                                // Idealmente, a API da mensagem teria o nome do agente.
                                // Na ausência, usamos o nome do agente do RawServiceItem atual.
                                senderName = agentName;
                            }
                        }

                        allMessagesWithContext.push({
                            protocolNumber,
                            role,
                            senderName,
                            content: rawMsg.dsc_msg, // Conteúdo original com HTML e entidades
                            displayTimestamp: rawMsg.dat_msg,
                            timestamp: this.parseDateForSorting(rawMsg.dat_original || rawMsg.dat_msg),
                            originalAttendanceId: currentAttendanceId
                        });
                    });
                }
            });

            allMessagesWithContext.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            const groupedSessions = new Map<string, CustomerServiceSession>();

            for (const messageDetail of allMessagesWithContext) {
                const { protocolNumber, ...messageData } = messageDetail;
                // messageData é agora um objeto Message completo

                if (groupedSessions.has(protocolNumber)) {
                    const existingSession = groupedSessions.get(protocolNumber)!;
                    existingSession.messages.push(messageData);
                    if (messageData.originalAttendanceId && !existingSession.originalAttendanceIds.includes(messageData.originalAttendanceId)) {
                        existingSession.originalAttendanceIds.push(messageData.originalAttendanceId);
                    }
                    // Atualizar lastMessageTimestamp (o último da lista ordenada de mensagens)
                    existingSession.lastMessageTimestamp = messageData.displayTimestamp;
                } else {
                    // Primeira mensagem para este protocolo
                    const sourceApiItemForSession = rawServiceItems.find(item => String(item.num_protocolo) === protocolNumber);
                    groupedSessions.set(protocolNumber, {
                        protocolNumber: protocolNumber,
                        contactId: String(contactId),
                        messages: [messageData],
                        contactName: sourceApiItemForSession?.nom_contato || "Cliente Desconhecido",
                        documentNumber: sourceApiItemForSession?.num_cpf,
                        contactPhone: sourceApiItemForSession?.telefone_contato,
                        firstMessageTimestamp: messageData.displayTimestamp,
                        lastMessageTimestamp: messageData.displayTimestamp,
                        originalAttendanceIds: messageData.originalAttendanceId ? [messageData.originalAttendanceId] : []
                    });
                }
            }
            
            const result: CustomerServiceSession[] = Array.from(groupedSessions.values());
            // Ordenar as sessões agrupadas pela última mensagem, se necessário
            result.sort((a, b) => {
                const dateA = a.lastMessageTimestamp ? this.parseDateForSorting(a.lastMessageTimestamp) : new Date(0);
                const dateB = b.lastMessageTimestamp ? this.parseDateForSorting(b.lastMessageTimestamp) : new Date(0);
                return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
            });

            // console.log(`Omni Max [MatrixApiService]: Consolidated service sessions for contact ${contactId}:`, result);
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