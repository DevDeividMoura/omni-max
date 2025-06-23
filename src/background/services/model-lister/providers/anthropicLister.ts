/**
 * @file src/background/services/model-lister/providers/anthropicLister.ts
 * @description Model lister implementation for Anthropic.
 */
import type { IModelLister } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';

// Define types for API response
interface AnthropicModel {
  id: string;
  name?: string;
  [key: string]: any;
}

interface AnthropicModelsResponse {
  data: AnthropicModel[];
  has_more: boolean;
  first_id?: string;
  last_id?: string;
}

// Default models as a constant to avoid duplication
const DEFAULT_ANTHROPIC_MODELS = [
  "claude-opus-4-20250514",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-sonnet-20240229"
].sort();

export const anthropicLister: IModelLister = {
  async listModels(credentials: AiCredentials): Promise<string[]> {
    const apiKey = credentials.anthropicApiKey;

    if (!apiKey) {
      console.warn("Anthropic API key needed to fetch models, returning defaults.");
      return DEFAULT_ANTHROPIC_MODELS;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [AnthropicProvider]: Error listing models:", response.status, errorData);
        throw new Error(`Failed to list Anthropic models: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json() as AnthropicModelsResponse;
      
      // Extract model IDs from the response
      const models = data.data.map((model: AnthropicModel) => model.id);
      
      // TODO: Handle pagination if needed (data.has_more, data.first_id, data.last_id)
      if (data.has_more) {
        console.warn("Omni Max [AnthropicProvider]: More models available but pagination not implemented");
      }
      
      return models.sort();
    } catch (error) {
      console.error("Omni Max [AnthropicProvider]: Exception when listing models:", error);
      // Fallback to a default list in case of error
      return DEFAULT_ANTHROPIC_MODELS;
    }
  }
};