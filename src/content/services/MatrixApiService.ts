// src/content/services/MatrixApiService.ts
import type {
  CustomerServiceSession,
  Message,
  RawMessageFromApi,
  RawServiceItemFromApi,
  ApiResponse
} from '../types';

export class MatrixApiService {

  private parseDateForSorting(dateString: string | undefined): Date {
    if (!dateString) return new Date(0);

    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(dateString)) {
      return new Date(dateString);
    }

    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      return new Date(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5], +parts[6]);
    }

    console.warn(`Omni Max [MatrixApiService]: Unrecognized date format for sorting: "${dateString}". Using minimum date.`);
    return new Date(0);
  }

  public async getAtendimentosByContato(contactId: string): Promise<CustomerServiceSession[]> {
    const baseUrl = window.location.origin;
    const page = 1;
    const rowsToFetch = 10;

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
        const groupedSessions = new Map<string, CustomerServiceSession>();
        const allMessagesWithContext: Array<Message & { protocolNumber: string }> = [];

        // Etapa 1: Preparar todas as mensagens e inicializar sessões base
        rawServiceItems.forEach(item => {
          const protocolNumber = String(item.num_protocolo);
          const currentAttendanceId = String(item.cod_atendimento);
          const customerName = item.nom_contato || "Cliente"; // CORRIGIDO: Fallback para "Cliente"
          const agentName = item.nom_agente || "Atendente";

          // Garantir que a sessão base exista
          if (!groupedSessions.has(protocolNumber)) {
            groupedSessions.set(protocolNumber, {
              protocolNumber: protocolNumber,
              contactId: String(contactId),
              messages: [],
              contactName: customerName, // Usa o customerName definido acima
              documentNumber: item.num_cpf,
              contactPhone: item.telefone_contato,
              firstMessageTimestamp: undefined, // Será preenchido pelas mensagens
              lastMessageTimestamp: undefined,  // Será preenchido pelas mensagens
              originalAttendanceIds: []
            });
          }
          // Adicionar cod_atendimento à lista de IDs da sessão, se ainda não existir
          const session = groupedSessions.get(protocolNumber)!;
          if (!session.originalAttendanceIds.includes(currentAttendanceId)) {
            session.originalAttendanceIds.push(currentAttendanceId);
          }

          // Coletar mensagens deste item
          if (Array.isArray(item.msgs)) {
            item.msgs.forEach((rawMsg: RawMessageFromApi) => {
              let role: Message['role'];
              let senderName: string;

              if (rawMsg.bol_entrante === "1") {
                role = 'customer';
                senderName = customerName;
              } else {
                if (rawMsg.bol_automatica === "1") {
                  role = 'system';
                  senderName = "Chatbot";
                } else {
                  role = 'agent';
                  senderName = agentName;
                }
              }
              allMessagesWithContext.push({
                protocolNumber,
                role,
                senderName,
                content: rawMsg.dsc_msg,
                displayTimestamp: rawMsg.dat_msg,
                timestamp: this.parseDateForSorting(rawMsg.dat_original || rawMsg.dat_msg),
                originalAttendanceId: currentAttendanceId
              });
            });
          }
        });

        // Etapa 2: Ordenar todas as mensagens coletadas globalmente por timestamp
        allMessagesWithContext.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Etapa 3: Adicionar mensagens ordenadas às suas respectivas sessões e definir timestamps
        allMessagesWithContext.forEach(messageDetail => {
          const { protocolNumber, ...messageData } = messageDetail;
          const session = groupedSessions.get(protocolNumber);
          if (session) {
            session.messages.push(messageData);
            if (!session.firstMessageTimestamp) { // Define apenas uma vez para a primeira mensagem
              session.firstMessageTimestamp = messageData.displayTimestamp;
            }
            session.lastMessageTimestamp = messageData.displayTimestamp; // Sempre atualiza para a última
          }
        });

        const result: CustomerServiceSession[] = Array.from(groupedSessions.values());
        result.sort((a, b) => {
          const dateA = a.lastMessageTimestamp ? this.parseDateForSorting(a.lastMessageTimestamp) : (a.messages.length > 0 ? new Date(0) : new Date(Date.now())); // Sessões sem msg por último
          const dateB = b.lastMessageTimestamp ? this.parseDateForSorting(b.lastMessageTimestamp) : (b.messages.length > 0 ? new Date(0) : new Date(Date.now()));
          return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
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