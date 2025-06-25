/**
 * @file src/background/services/model-lister/IModelLister.ts
 * @description Defines the contract for a module that lists models for a specific AI provider.
 */
import type { AiCredentials } from '../../../storage/stores';

export type ModelType = 'chat' | 'embedding'; // <-- NOVO TIPO

export interface IModelLister {
  /**
   * Fetches and returns a list of available model names for the provider.
   * @param credentials The user's stored credentials.
   * @param modelType The type of models to list ('chat' or 'embedding'). // <-- NOVO PARÂMETRO
   * @returns A promise that resolves to a sorted array of model name strings.
   */
  listModels(credentials: AiCredentials, modelType: ModelType): Promise<string[]>;
}