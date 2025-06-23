/**
 * @file src/background/services/model-lister/providers/geminiLister.ts
 * @description Model lister implementation for Google Gemini.
 */
import type { IModelLister } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';

// Define types for API response
interface GeminiModel {
  name: string;
  version: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods: string[];
  [key: string]: any;
}

interface GeminiModelsResponse {
  models: GeminiModel[];
}

// Default models as a constant to avoid duplication
const DEFAULT_GEMINI_MODELS = [
  "gemini-2.0-flash", 
  "gemini-2.0-flash-lite", 
  "gemini-2.0-flash-lite-preview", 
  "gemini-2.0-pro-exp"
].sort();

export const geminiLister: IModelLister = {
  async listModels(credentials: AiCredentials): Promise<string[]> {
    const apiKey = credentials.geminiApiKey;

    if (!apiKey) {
      console.warn("Google Gemini API key needed to fetch models, returning defaults.");
      return DEFAULT_GEMINI_MODELS;
    }

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?' + 
        new URLSearchParams({ key: apiKey }).toString()
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [GeminiProvider]: Error listing models:", response.status, errorData);
        throw new Error(`Failed to list Gemini models: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json() as GeminiModelsResponse;
      
      return data.models
        .filter((model: GeminiModel) => 
          model.name.includes('gemini') && 
          model.supportedGenerationMethods.includes('generateContent'))
        .map((model: GeminiModel) => {
          // Extract model ID from the full name (remove "models/" prefix)
          return model.name.replace('models/', '');
        })
        .sort();
    } catch (error) {
      console.error("Omni Max [GeminiProvider]: Exception when listing Gemini models:", error);
      return DEFAULT_GEMINI_MODELS;
    }
  }
};