/**
 * @file src/background/services/model-lister/providers/groqLister.ts
 * @description Model lister implementation for Groq.
 */
import type { IModelLister } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';

// Define types for API response
interface GroqModel {
  id: string;
  [key: string]: any;
}

interface GroqModelsResponse {
  data: GroqModel[];
  object: string;
}

// Default models as a constant to avoid duplication
const DEFAULT_GROQ_MODELS = [
  "llama3-8b-8192",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "gemma-7b-it",
  "gemma2-9b-it"
].sort();

export const groqLister: IModelLister = {
  async listModels(credentials: AiCredentials): Promise<string[]> {
    const apiKey = credentials.groqApiKey;

    if (!apiKey) {
      console.warn("Groq API key needed to fetch models, returning defaults.");
      return DEFAULT_GROQ_MODELS;
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [GroqProvider]: Error listing models:", response.status, errorData);
        throw new Error(`Failed to list Groq models: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json() as GroqModelsResponse;
      
      // Filter out audio models and extract model IDs
      const models = data.data
        .filter((model: GroqModel) => model.id && !model.id.startsWith('whisper'))
        .map((model: GroqModel) => model.id);
      
      return models.sort();
    } catch (error) {
      console.error("Omni Max [GroqProvider]: Exception when listing Groq models:", error);
      return DEFAULT_GROQ_MODELS;
    }
  }
};