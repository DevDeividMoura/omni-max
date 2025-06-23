/**
 * @file src/background/services/embedding/IEmbeddingProvider.ts
 * @description Defines the contract for all embedding providers, aligned with LangChain's common methods.
 */

import type { AiCredentials } from '../../../storage/stores';

/**
 * @interface EmbeddingProviderOptions
 * @description Defines the common options required to instantiate or call an embedding provider.
 */
export interface EmbeddingProviderOptions {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  // LangChain's OpenAIEmbeddings supports specifying dimensions
  dimensions?: number; 
}

/**
 * @interface IEmbeddingProvider
 * @description The contract that every embedding provider class must implement.
 */
export interface IEmbeddingProvider {
  readonly credentialKey?: keyof AiCredentials;
  readonly urlKey?: keyof AiCredentials;

  /**
   * Takes an array of documents (texts) and returns an array of vector embeddings.
   * @param {string[]} documents - An array of string content to be converted into embeddings.
   * @param {EmbeddingProviderOptions} options - The request options, primarily the model name.
   * @returns {Promise<number[][]>} A promise that resolves with an array of embeddings.
   */
  embedDocuments( // <-- RENOMEADO de createEmbeddings para embedDocuments
    documents: string[],
    options: EmbeddingProviderOptions
  ): Promise<number[][]>;
}