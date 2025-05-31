/**
 * src/ai/IAiProvider.ts
 * Define a interface para provedores de serviços de Inteligência Artificial.
 */

import type { AiCredentials } from '../storage/stores';

export interface AIRequestOptions {
  model?: string;
  apiKey?: string; // Opcional, pois Ollama não usa
  baseUrl?: string; // Para provedores como Ollama
  // Outras opções comuns: temperature, maxTokens, etc.
  // Podem ser adicionadas aqui ou em interfaces mais específicas por provedor, se necessário.
  [key: string]: any; // Permite outras opções específicas do provedor
}

export interface AIiProvider {
  /** Chave única usada no aiCredentialsStore para este provedor */
  readonly credentialKey: keyof AiCredentials;

  /** Se aplicável, URL base em vez de API key */
  readonly urlKey?: keyof AiCredentials;

  /**
   * Gera um resumo para um dado texto usando um prompt específico.
   */
  generateSummary(
    textToSummarize: string,
    systemPrompt: string,
    options: AIRequestOptions
  ): Promise<string>;

  /**
   * Lista os modelos de linguagem disponíveis para este provedor.
   * @param options Opções que podem incluir API key ou baseUrl, se necessário para listar modelos.
   * @returns Uma Promise que resolve com um array de strings (nomes/IDs dos modelos).
   */
  listModels(options: Pick<AIRequestOptions, 'apiKey' | 'baseUrl'>): Promise<string[]>;

  // Outros métodos como improveText, generateChatResponse podem ser adicionados aqui
}