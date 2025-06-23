/**
 * @file src/background/services/model-lister/providers/ollamaLister.ts
 * @description Model lister implementation for Ollama.
 */
import type { IModelLister } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';

// Define types for API response
interface OllamaModel {
  name: string;
  [key: string]: any;
}

interface OllamaModelsResponse {
  models: OllamaModel[];
}

// Default models if API fails
const DEFAULT_OLLAMA_MODELS: string[] = [];

export const ollamaLister: IModelLister = {
  async listModels(credentials: AiCredentials): Promise<string[]> {
    const baseUrl = credentials.ollamaBaseUrl;

    if (!baseUrl) {
      console.warn("Ollama base URL is missing. Cannot fetch models.");
      return DEFAULT_OLLAMA_MODELS;
    }
    
    try {
      // The endpoint for listing Ollama models is /api/tags
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [OllamaProvider]: Error listing models:", response.status, errorData);
        throw new Error(`Failed to list Ollama models: ${response.statusText}`);
      }
      
      const data = await response.json() as OllamaModelsResponse;
      
      // Response format is { models: [ { name: "mistral:latest", ... }, ... ] }
      return data.models.map((model: OllamaModel) => model.name).sort() || [];
    } catch (error) {
      console.error("Omni Max [OllamaProvider]: Exception when listing Ollama models:", error);
      return DEFAULT_OLLAMA_MODELS;
    }
  }
};