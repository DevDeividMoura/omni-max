// src/content/services/MatrixApiService.ts
import type { Atendimento, Mensagem, MensagemApi, ApiResponse } from '../types';

export class MatrixApiService {
  // constructor(private domService: DomService) {} // Descomente se precisar do DomService

  /**
   * Converte uma string de data no formato "YYYY-MM-DD HH:MM:SS" ou "DD/MM/YYYY HH:MM:SS" para um objeto Date.
   * Prefere o formato "YYYY-MM-DD HH:MM:SS" por ser mais robusto.
   * @param dateString A string da data.
   * @returns Um objeto Date.
   */
  private parseDateForSorting(dateString: string | undefined): Date {
    if (!dateString) return new Date(0); // Data mínima para strings vazias ou undefined

    // Tenta formato YYYY-MM-DD HH:MM:SS (mais confiável para new Date())
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(dateString)) {
      return new Date(dateString);
    }

    // Tenta formato DD/MM/YYYY HH:MM:SS
    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
    if (parts) {
      // new Date(year, monthIndex (0-11), day, hours, minutes, seconds)
      return new Date(+parts[3], +parts[2] - 1, +parts[1], +parts[4], +parts[5], +parts[6]);
    }
    
    console.warn(`Omni Max [MatrixApiService]: Formato de data não reconhecido para ordenação: "${dateString}". Usando data mínima.`);
    return new Date(0); // Fallback para data mínima
  }


  /**
   * Fetches and consolidates service sessions (atendimentos) for a given contact ID.
   * Messages from multiple service records under the same protocol number are grouped together
   * and sorted chronologically.
   * @param contatoId The ID of the contact.
   * @returns A Promise that resolves to an array of consolidated Atendimento objects.
   */
  public async getAtendimentosByContato(contatoId: string): Promise<Atendimento[]> {
    const url_base = window.location.origin;
    const page = 1; 
    const rows = 100; // Aumente se necessário para capturar todos os atendimentos relevantes de um contato

    try {
      const response = await fetch(`${url_base}/Painel/atendimento/get-atendimentos/cod_contato/${contatoId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          page: String(page),
          rows: String(rows)
        })
      });

      if (!response.ok) {
        console.error(`Omni Max [MatrixApiService]: HTTP error ${response.status} for contato ${contatoId}`);
        return [];
      }

      const apiResponse: ApiResponse = await response.json();

      if (apiResponse.success === 1 && Array.isArray(apiResponse.data)) {
        console.log(`Omni Max [MatrixApiService]: Raw atendimentos for contact ${contatoId}:`, apiResponse.data);

        const atendimentoItens = apiResponse.data;

        // 1. Extrair todas as mensagens com seus metadados e converter para nosso formato Mensagem
        const allMessagesWithDetails: Array<Mensagem & { protocolo: string, cod_atendimento: string }> = [];
        atendimentoItens.forEach(item => {
          const protocolo = String(item.num_protocolo);
          const cod_atendimento = String(item.cod_atendimento);
          if (Array.isArray(item.msgs)) {
            item.msgs.forEach((msgApi: MensagemApi) => {
              allMessagesWithDetails.push({
                protocolo,
                cod_atendimento,
                role: msgApi.bol_entrante === "0" ? 'atendente' : 'cliente',
                message: msgApi.dsc_msg,
                dat_msg: msgApi.dat_msg, // Manter a data original para exibição
                timestamp: this.parseDateForSorting(msgApi.dat_original || msgApi.dat_msg) // Usar para ordenação
              });
            });
          }
        });

        // 2. Ordenar todas as mensagens globalmente por timestamp
        allMessagesWithDetails.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // 3. Agrupar mensagens por protocolo
        const groupedAtendimentos = new Map<string, Atendimento>();

        for (const msgDetail of allMessagesWithDetails) {
          const { protocolo, cod_atendimento, ...mensagem } = msgDetail;

          if (groupedAtendimentos.has(protocolo)) {
            const existingAtendimento = groupedAtendimentos.get(protocolo)!;
            existingAtendimento.mensagens.push(mensagem);
            // Adiciona cod_atendimento original se ainda não estiver na lista
            if (!existingAtendimento.codAtendimentosOriginais.includes(cod_atendimento)) {
              existingAtendimento.codAtendimentosOriginais.push(cod_atendimento);
            }
            // Atualiza a data da última mensagem
            existingAtendimento.dataUltimaMensagem = mensagem.dat_msg; // Ou use dat_original se preferir
          } else {
            // Encontra o item de atendimento original para pegar outros dados (nome, cpf, tel)
            // Pega o primeiro item que deu origem a este protocolo para dados mestre.
            // Isso pode ser melhorado se diferentes `cod_atendimento` do mesmo protocolo tiverem dados diferentes.
            const sourceApiItem = atendimentoItens.find(item => String(item.num_protocolo) === protocolo);
            
            groupedAtendimentos.set(protocolo, {
              protocolo: protocolo,
              contatoId: String(contatoId),
              mensagens: [mensagem],
              nomeContato: sourceApiItem?.nom_contato,
              cpfOuCnpj: sourceApiItem?.num_cpf, // Pode precisar de tratamento se for CNPJ
              telefoneContato: sourceApiItem?.telefone_contato,
              dataPrimeiraMensagem: mensagem.dat_msg, // Ou use dat_original
              dataUltimaMensagem: mensagem.dat_msg,   // Ou use dat_original
              codAtendimentosOriginais: [cod_atendimento]
            });
          }
        }
        
        const result = Array.from(groupedAtendimentos.values());
        console.log(`Omni Max [MatrixApiService]: Atendimentos consolidados para contato ${contatoId}:`, result);
        return result;

      } else {
        console.error('Omni Max [MatrixApiService]: Error fetching atendimentos or unexpected data structure:', apiResponse);
        return [];
      }
    } catch (error) {
      console.error(`Omni Max [MatrixApiService]: Network or parsing error for contato ${contatoId}:`, error);
      return [];
    }
  }
}