/**
 * @file src/background/services/embedding/IEmbeddingProvider.ts
 * @description Defines the contract (interface) for all embedding providers.
 * This ensures that any provider we add in the future will have a consistent
 * structure and can be used interchangeably by the EmbeddingService.
 */

import type { AiCredentials } from '../../../storage/stores';

/**
 * @interface EmbeddingProviderOptions
 * @description Defines the common options required to make a request to an embedding provider.
 * This object is passed to the createEmbeddings method.
 */
export interface EmbeddingProviderOptions {
  /**
   * @property {string} model - The specific embedding model to use for the request.
   */
  model: string;

  /**
   * @property {string} [apiKey] - The API key for the provider, if required.
   */
  apiKey?: string;

  /**
   * @property {string} [baseUrl] - The base URL for self-hosted providers like Ollama.
   */
  baseUrl?: string;
}

/**
 * @interface IEmbeddingProvider
 * @description The contract that every embedding provider class must implement.
 */
export interface IEmbeddingProvider {
  /**
   * @property {keyof AiCredentials} [credentialKey] - The key used in `aiCredentialsStore`
   * to retrieve the API key for this provider. This allows the service to
   * dynamically fetch the correct credentials.
   * @readonly
   */
  readonly credentialKey?: keyof AiCredentials;

  /**
   * @property {keyof AiCredentials} [urlKey] - The key used in `aiCredentialsStore`
   * to retrieve the base URL for this provider (e.g., for Ollama).
   * @readonly
   */
  readonly urlKey?: keyof AiCredentials;

  /**
   * Takes an array of texts and returns an array of vector embeddings.
   * @param {string[]} texts - An array of string content to be converted into embeddings.
   * @param {EmbeddingProviderOptions} options - The request options, including the model and any necessary credentials.
   * @returns {Promise<number[][]>} A promise that resolves with an array of embeddings, where each
   * embedding is an array of numbers (a vector).
   */
  createEmbeddings(
    texts: string[],
    options: EmbeddingProviderOptions
  ): Promise<number[][]>;
}