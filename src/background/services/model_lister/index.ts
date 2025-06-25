/**
 * @file src/background/services/model-lister/index.ts
 * @description Main service for listing models. Uses a registry to dispatch requests to the correct provider lister.
 */
import type { IModelLister, ModelType } from './IModelLister';
import type { AiCredentials } from '../../../storage/stores';
import { OpenAILister } from './providers/openaiLister';
import { OllamaLister } from './providers/ollamaLister';
import { GeminiLister } from './providers/geminiLister';

// The Registry maps provider IDs to their specific lister implementation.
const providerRegistry: Record<string, IModelLister> = {
  openai: new OpenAILister(),
  ollama: new OllamaLister(),
  gemini: new GeminiLister(),
};

/**
 * Dynamically lists available models for a given AI provider using a registry.
 * @param providerId The ID of the provider (e.g., 'openai', 'groq').
 * @param credentials The user's stored credentials.
 * @returns A promise that resolves to a sorted list of model names.
 */
export async function listAvailableModels(providerId: string, credentials: AiCredentials, modelType: ModelType): Promise<string[]> {
  const lister = providerRegistry[providerId.toLowerCase()];

  if (!lister) {
    console.warn(`[ModelListerService] No lister registered for provider: ${providerId}`);
    return [];
  }

  try {
    return await lister.listModels(credentials, modelType);
  } catch (error: any) {
    console.error(`[ModelListerService] Error fetching models for ${providerId}:`, error);
    // Re-throw the error so the UI can display it.
    throw error;
  }
}