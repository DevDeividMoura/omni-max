/**
 * @file src/ai/AIiProvider.ts
 * @description Defines the interface for Artificial Intelligence service providers,
 * outlining the common functionalities required for AI operations like text generation
 * and model listing.
 */

import type { AiCredentials } from '../storage/stores';

/**
 * @interface AIRequestOptions
 * @description Defines common options for making requests to an AI provider.
 * Allows for provider-specific options via index signature.
 */
export interface AIRequestOptions {
  /** @property {string} [model] - The specific AI model to use for the request. */
  model?: string;
  /** @property {string} [apiKey] - API key for the provider, if applicable (e.g., Ollama might not use it directly here). */
  apiKey?: string;
  /** @property {string} [baseUrl] - Base URL for providers like Ollama that are self-hosted or have a custom endpoint. */
  baseUrl?: string;
  // Common options like temperature, maxTokens, etc., could be added here
  // or in more specific interfaces per provider if needed.
  /** @property {any} [key: string] - Allows for other provider-specific options. */
  [key: string]: any;
}

/**
 * @interface AIiProvider
 * @description Defines the contract for an AI service provider.
 * Each provider implementation must adhere to this interface.
 */
export interface AIiProvider {
  /**
   * @property {keyof AiCredentials} credentialKey - The unique key used in `aiCredentialsStore`
   * to retrieve the API key for this provider, if it uses one.
   * @readonly
   */
  readonly credentialKey?: keyof AiCredentials; // Made optional as not all providers use API keys (e.g. Ollama primarily uses baseUrl)

  /**
   * @property {keyof AiCredentials} [urlKey] - The unique key used in `aiCredentialsStore`
   * to retrieve the base URL for this provider, if applicable (e.g., Ollama).
   * @readonly
   */
  readonly urlKey?: keyof AiCredentials;

  /**
   * Generates a summary for a given text using a specific system prompt.
   * @param {string} textToSummarize - The text content to be summarized.
   * @param {string} systemPrompt - The system prompt to guide the AI's summary generation.
   * @param {AIRequestOptions} options - Request options, including the model and any necessary credentials.
   * @returns {Promise<string>} A promise that resolves with the generated summary string.
   */
  generateSummary(
    textToSummarize: string,
    systemPrompt: string,
    options: AIRequestOptions
  ): Promise<string>;

  /**
   * Lists the available language models for this provider.
   * @param {Pick<AIRequestOptions, 'apiKey' | 'baseUrl'>} options - Options that might include
   * an API key or base URL, if required by the provider to list models.
   * @returns {Promise<string[]>} A promise that resolves with an array of model names/IDs.
   */
  listModels(options: Pick<AIRequestOptions, 'apiKey' | 'baseUrl'>): Promise<string[]>;

  // Other methods like generateChatResponse, improveText, etc., could be added here in the future.
}