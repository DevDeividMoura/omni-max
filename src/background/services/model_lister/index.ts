/**
 * @file src/background/services/model-lister/index.ts
 * @description Main service for listing models. Uses a registry to dispatch requests to the correct provider lister.
 */
import type { IModelLister } from './IModelLister';
import type { AiCredentials } from '../../../storage/stores';
import { openaiLister } from './providers/openaiLister';
import { groqLister } from './providers/groqLister';
import { ollamaLister } from './providers/ollamaLister';
import { geminiLister } from './providers/geminiLister';
import { anthropicLister } from './providers/anthropicLister';

// The Registry maps provider IDs to their specific lister implementation.
const providerRegistry: Record<string, IModelLister> = {
  openai: openaiLister,
  groq: groqLister,
  ollama: ollamaLister,
  gemini: geminiLister,
  anthropic: anthropicLister,
};

/**
 * Dynamically lists available models for a given AI provider using a registry.
 * @param providerId The ID of the provider (e.g., 'openai', 'groq').
 * @param credentials The user's stored credentials.
 * @returns A promise that resolves to a sorted list of model names.
 */
export async function listAvailableModels(providerId: string, credentials: AiCredentials): Promise<string[]> {
  const lister = providerRegistry[providerId.toLowerCase()];

  if (!lister) {
    console.warn(`[ModelListerService] No lister registered for provider: ${providerId}`);
    return [];
  }

  try {
    return await lister.listModels(credentials);
  } catch (error: any) {
    console.error(`[ModelListerService] Error fetching models for ${providerId}:`, error);
    // Re-throw the error so the UI can display it.
    throw error;
  }
}