/**
 * @file src/background/services/model-lister/IModelLister.ts
 * @description Defines the contract for a module that lists models for a specific AI provider.
 */
import type { AiCredentials } from '../../../storage/stores';

export interface IModelLister {
  /**
   * Fetches and returns a list of available model names for the provider.
   * @param credentials The user's stored credentials, containing necessary API keys or base URLs.
   * @returns A promise that resolves to a sorted array of model name strings.
   * @throws An error if fetching fails or credentials are insufficient.
   */
  listModels(credentials: AiCredentials): Promise<string[]>;
}