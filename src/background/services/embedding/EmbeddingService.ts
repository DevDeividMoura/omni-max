/**
 * @file src/background/services/embedding/EmbeddingService.ts
 * @description The main service for creating text embeddings. It uses a registry
 * to dynamically select the correct provider based on user settings, gathers
 * the necessary credentials, and delegates the embedding creation.
 */

import { get } from 'svelte/store';
import { aiCredentialsStore, aiProviderConfigStore } from '../../../storage/stores';
import type { IEmbeddingProvider, EmbeddingProviderOptions } from './IEmbeddingProvider';

// --- Placeholder Imports (we will create these files next) ---
// import { openaiEmbeddingsProvider } from './providers/openaiEmbeddings';
// import { ollamaEmbeddingsProvider } from './providers/ollamaEmbeddings';

/**
 * @const {Record<string, IEmbeddingProvider>} providerRegistry
 * @description A registry mapping provider IDs to their respective embedding provider instances.
 * This is the "rolodex" of available specialists. We will populate this as we create each provider.
 */
const providerRegistry: Record<string, IEmbeddingProvider> = {
  // 'openai': openaiEmbeddingsProvider, // <-- Will be added in the next step
  // 'ollama': ollamaEmbeddingsProvider, // <-- Will be added later
};

/**
 * @class EmbeddingService
 * @description Central class for managing and creating embeddings using different providers.
 */
export class EmbeddingService {

  /**
   * Creates vector embeddings for an array of texts using the currently configured provider.
   * @public
   * @async
   * @param {string[]} texts - The texts to be converted into embeddings.
   * @returns {Promise<number[][]>} A promise that resolves with an array of vector embeddings.
   * @throws {Error} If the provider is not configured, not found, or if credentials are missing.
   */
  public async createEmbeddings(texts: string[]): Promise<number[][]> {
    const provider = await this.loadProvider();
    const options = await this.buildOptions(provider);

    console.log(`[EmbeddingService] Creating embeddings with provider "${options.provider}" and model "${options.model}".`);
    return provider.createEmbeddings(texts, options);
  }

  /**
   * Loads the currently configured AI provider instance from the registry.
   * @private
   * @async
   * @returns {Promise<IEmbeddingProvider>} A promise that resolves with the loaded provider instance.
   * @throws {Error} If the AI provider is not configured or not found.
   */
  private async loadProvider(): Promise<IEmbeddingProvider> {
    const config = get(aiProviderConfigStore);
    
    // ATTENTION: We might need a separate config for the embedding provider.
    // For now, we'll use the main provider from the settings.
    const providerId = config.provider?.toLowerCase();

    if (!providerId) {
      throw new Error("Embedding provider is not configured.");
    }

    const providerInstance = providerRegistry[providerId];
    if (!providerInstance) {
      throw new Error(`Embedding provider "${config.provider}" not found or not supported.`);
    }
    return providerInstance;
  }

  /**
   * Builds the options object for an embedding provider, including model, API key, and/or base URL.
   * @private
   * @async
   * @param {IEmbeddingProvider} providerInstance - The provider instance for which to build options.
   * @returns {Promise<EmbeddingProviderOptions & { provider: string }>} A promise resolving with the request options.
   * @throws {Error} If necessary credentials for the provider are missing.
   */
  private async buildOptions(providerInstance: IEmbeddingProvider): Promise<EmbeddingProviderOptions & { provider: string }> {
    const credentials = get(aiCredentialsStore);
    const providerConfig = get(aiProviderConfigStore);

    // ATTENTION: We need to decide which model to use for embeddings.
    // It could be a specific model per provider or a user-configurable one.
    // For now, we'll create a placeholder logic.
    const embeddingModel = providerConfig.embeddingModel || 'text-embedding-3-small'; // Placeholder

    const options: EmbeddingProviderOptions & { provider: string } = {
      provider: providerConfig.provider!,
      model: embeddingModel
    };

    const apiKeyName = providerInstance.credentialKey;
    const baseUrlName = providerInstance.urlKey;

    if (baseUrlName && credentials[baseUrlName]) {
      options.baseUrl = credentials[baseUrlName] as string;
    }
    
    // Some providers might need both a URL and a key.
    if (apiKeyName && credentials[apiKeyName]) {
      options.apiKey = credentials[apiKeyName] as string;
    }

    // Validate that at least one required credential is provided if the provider needs one.
    if ((apiKeyName || baseUrlName) && !options.apiKey && !options.baseUrl) {
      throw new Error(`Required credentials (API Key or Base URL) are missing for provider "${providerConfig.provider}".`);
    }

    return options;
  }
}