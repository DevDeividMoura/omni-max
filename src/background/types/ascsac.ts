/**
 * @file src/types/ascsac.ts
 * @description Type definitions for the ASC SAC platform.
 * It separates the raw API data contract from the application's internal models.
 */

// --- RAW API CONTRACT ---
// These interfaces are a 1:1 mirror of the JSON response from the API.
// Property names MUST match the API keys exactly.

export interface RawMessage {
  bol_entrante: "0" | "1";
  bol_automatica?: "0" | "1";
  dsc_msg: string;
  dat_msg: string;
  dat_original: string;
}

export interface RawSession {
  num_protocolo: string | number;
  cod_atendimento: string | number;
  dat_atendimento: string;
  msgs?: RawMessage[];
  nom_contato?: string;
  nom_agente?: string;
  num_cpf?: string;
  telefone_contato?: string;
}

export interface ApiResponse {
  success: 0 | 1;
  data: RawSession[];
}

export interface ApiResponseMessages {
  success: 0 | 1;
  data: {
    msgs: RawMessage[];
  };
}


// --- INTERNAL APPLICATION MODEL ---
// A processed, standardized message object used within our application logic.

export interface ProcessedMessage {
  role: string | 'agent' | 'customer' | 'system';
  senderName: string;
  content: string;
  timestamp: Date;
}