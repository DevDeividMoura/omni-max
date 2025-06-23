/**
 * @file src/background/services/model-lister/providers/openaiLister.ts
 * @description Model lister implementation for OpenAI.
 */
import type { IModelLister } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';

// Define types for API response
interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  [key: string]: any;
}

interface OpenAIModelsResponse {
  data: OpenAIModel[];
  object: string;
}

// Default models as a constant to avoid duplication
const DEFAULT_OPENAI_MODELS = [
  "gpt-4o", 
  "gpt-4o-mini", 
  "gpt-4-turbo", 
  "gpt-3.5-turbo"
].sort();

export const openaiLister: IModelLister = {
  async listModels(credentials: AiCredentials): Promise<string[]> {
    const apiKey = credentials.openaiApiKey;

    if (!apiKey) {
      console.warn("OpenAI API key needed to fetch models, returning defaults.");
      return DEFAULT_OPENAI_MODELS;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [OpenAiProvider]: Error listing OpenAI models:", response.status, errorData);
        throw new Error(`Failed to list OpenAI models: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json() as OpenAIModelsResponse;
      
      // Filter to include only models typically used for chat/generation (e.g., gpt-*)
      // The models API returns many models, including embeddings, etc.
      return data.data
        .filter((model: OpenAIModel) => 
          model.id.startsWith('gpt-') && 
          !model.id.includes('instruct') && 
          !model.id.includes('vision'))
        .map((model: OpenAIModel) => model.id)
        .sort();
    } catch (error) {
      console.error("Omni Max [OpenAiProvider]: Exception when listing OpenAI models:", error);
      // Fallback to a default list in case of error
      return DEFAULT_OPENAI_MODELS;
    }
  }
};