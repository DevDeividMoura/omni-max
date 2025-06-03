// src/content/types.ts
export interface MensagemApi {
  bol_entrante: "0" | "1"; // "0" para atendente (saída), "1" para cliente (entrada)
  dsc_msg: string;
  dat_msg: string;       // Ex: "01/10/2024 22:00:16" (formato display)
  dat_original: string;  // Ex: "2024-10-01 22:00:16" (formato ISO-like, melhor para ordenação)
  // ... outros campos da mensagem se necessários ...
}

export interface AtendimentoApiItem {
  num_protocolo: string | number;
  cod_atendimento: string | number;
  dat_atendimento: string; // Ex: "02/10/2024 08:09:45"
  // Adicione outros campos do item de atendimento que você queira usar
  // Ex: nom_contato, num_cpf, telefone_contato, etc.
  msgs?: MensagemApi[];
  // ... outros campos ...
  nom_contato?: string;
  num_cpf?: string;
  telefone_contato?: string;
}

export interface ApiResponse {
  success: 0 | 1;
  data: AtendimentoApiItem[];
  // ... outros campos da resposta da API ...
}
/**
 * Represents a single message within a conversation.
 */
export interface Mensagem {
  role: 'atendente' | 'cliente'; // Role of the message sender
  message: string;                // Content of the message
  dat_msg: string;                // Timestamp of the message
  timestamp: Date; // Objeto Date para ordenação interna

}

/**
 * Represents a customer service session (atendimento).
 */
export interface Atendimento {
  protocolo: string;
  contatoId: string;
  mensagens: Mensagem[];
  // Outros dados que podem ser úteis do primeiro ou último atendimento do protocolo
  nomeContato?: string;
  cpfOuCnpj?: string; // Pode ser um ou outro
  telefoneContato?: string;
  dataPrimeiraMensagem?: string; // dat_original da primeira msg do protocolo
  dataUltimaMensagem?: string;  // dat_original da última msg do protocolo
  codAtendimentosOriginais: string[]; // Lista de todos os cod_atendimento agrupados
}

/**
 * Structure for storing summaries in chrome.storage.
 * Maps protocol numbers to their generated summaries.
 */
export interface SummaryCache {
  [protocolo: string]: string;
}

/**
 * Represents the context of an active chat tab or panel.
 */
export interface ActiveChatContext {
  protocolo: string;
  atendimentoId: string;
  contatoId: string;
  // Might also include the specific DOM element for the chat panel if needed
  panelElement?: HTMLElement;
}