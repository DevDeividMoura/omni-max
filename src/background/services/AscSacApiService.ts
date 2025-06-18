/**
 * @file src/background/services/AscSacApiService.ts
 * @description Service class for interacting with the ASC SAC platform's API.
 */
import type {
  RawSession,
  RawMessage,
  ApiResponse,
  ListMessagesApiResponse,
} from '../types/ascsac';

export class AscSacApiService {

  /**
   * Fetches all service sessions for a given contact ID.
   * @param {string} contactId The ID of the contact.
   * @param {string} baseUrl The base origin of the platform (e.g., "https://vipmax.matrixdobrasil.ai").
   * @returns {Promise<RawSession[]>} A promise resolving to an array of raw session data.
   */
  public async getSessionsByContact(contactId: string, baseUrl: string): Promise<RawSession[]> {
    const apiUrl = `${baseUrl}/Painel/atendimento/get-atendimentos/cod_contato/${contactId}`;
    try {
      console.log(`AscSacApiService: Fetching sessions for contact ${contactId} from ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ page: '1', rows: '20' })
      });
      if (!response.ok) {
        console.error(`AscSacApiService: HTTP error ${response.status} for contact ${contactId}`);
        return [];
      }
      const apiResponse: ApiResponse = await response.json();
      return (apiResponse.success === 1 && Array.isArray(apiResponse.data)) ? apiResponse.data : [];
    } catch (error) {
      console.error(`AscSacApiService: Network error for contact ${contactId}:`, error);
      return [];
    }
  }

   /**
   * Fetches all messages for a specific service session ID.
   * @param {string} sessionId The ID of the service session (cod_atendimento).
   * @param {string} baseUrl The base origin of the platform.
   * @returns {Promise<RawMessage[]>} A promise resolving to an array of raw messages.
   */
  public async getMessagesBySessionId(sessionId: string, baseUrl: string): Promise<RawMessage[]> {
    const apiUrl = `${baseUrl}/Painel/atendimento/listar-mensagens-por-atendimento`;
    try {
      console.log(`AscSacApiService: Fetching messages for session ${sessionId} from ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // O log mostra "rows=25", podemos aumentar para garantir que pegamos tudo em uma página
        body: new URLSearchParams({ cod_atendimento: sessionId, page: '1', rows: '100' }) 
      });

      if (!response.ok) {
        console.error(`AscSacApiService: HTTP error ${response.status} for session ${sessionId}`);
        return [];
      }

      // CORREÇÃO: Ler como texto e fazer o parse manual devido ao Content-Type "text/html"
      const responseText = await response.text();
      const apiResponse: ListMessagesApiResponse = JSON.parse(responseText);

      // CORREÇÃO: Acessar a chave `lstMsgs` e verificar se é um array
      if (apiResponse && Array.isArray(apiResponse.lstMsgs)) {
        return apiResponse.lstMsgs;
      } else {
        console.warn(`AscSacApiService: No 'lstMsgs' array found in the response for session ${sessionId}. Response:`, responseText);
        return [];
      }

    } catch (error) {
      console.error(`AscSacApiService: Network error or JSON parse error for session ${sessionId}:`, error);
      return [];
    }
  }
}