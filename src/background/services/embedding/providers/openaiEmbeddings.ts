/**
 * @file src/background/services/embedding/providers/openaiEmbeddings.ts
 * @description Wrapper implementation for LangChain's OpenAIEmbeddings class,
 * conforming to our IEmbeddingProvider interface.
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import type { IEmbeddingProvider, EmbeddingProviderOptions } from '../IEmbeddingProvider';
import type { AiCredentials } from '../../../../storage/stores';

/**
 * @class OpenAIEmbeddingsProvider
 * @implements {IEmbeddingProvider}
 * @description A wrapper class that uses LangChain's OpenAIEmbeddings to generate embeddings.
 */
class OpenAIEmbeddingsProvider implements IEmbeddingProvider {
  public readonly credentialKey: keyof AiCredentials = 'openaiApiKey';

  /**
   * Creates embeddings by instantiating and calling LangChain's OpenAIEmbeddings class.
   * @param {string[]} documents - The array of texts to embed.
   * @param {EmbeddingProviderOptions} options - Contains the model name, apiKey, and other potential configs.
   * @returns {Promise<number[][]>} A promise that resolves to an array of vectors.
   */
  public async embedDocuments(documents: string[], options: EmbeddingProviderOptions): Promise<number[][]> {
    if (!options.apiKey) {
      throw new Error('OpenAI API key is required for OpenAIEmbeddingsProvider.');
    }

    try {
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: options.apiKey,
        modelName: options.model,
        dimensions: options.dimensions, // Pass dimensions if available
      });

      return await embeddings.embedDocuments(documents);

    } catch (error: any) {
      console.error('[OpenAIEmbeddingsProvider] Failed to create embeddings via LangChain:', error);
      throw error;
    }
  }
}

// Export a singleton instance of the provider to be used in the registry.
export const openaiEmbeddingsProvider = new OpenAIEmbeddingsProvider();