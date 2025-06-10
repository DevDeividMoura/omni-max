// src/ai/AIServiceManager.ts

/**
 * @file src/ai/AIServiceManager.ts
 * @description Manages interactions with various AI service providers.
 * It handles loading the appropriate provider based on configuration,
 * building request options with necessary credentials, and delegating
 * AI tasks like summary generation and model listing.
 */
import { get } from 'svelte/store'; // Ensure get is imported
import { aiCredentialsStore, aiProviderConfigStore, promptsStore } from '../storage/stores';
import type { AIiProvider, AIRequestOptions } from './AIiProvider'; // Corrected interface name
import { OpenAiProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { GroqProvider } from './providers/GroqProvider';

/**
 * @const {Record<string, AIiProvider>} providerRegistry
 * @description A registry mapping provider IDs (lowercase) to their respective service instances.
 */
const providerRegistry: Record<string, AIiProvider> = {
  groq: new GroqProvider(),
  openai: new OpenAiProvider(),
  gemini: new GeminiProvider(),
  anthropic: new AnthropicProvider(),
  ollama: new OllamaProvider(),
};

/**
 * @class AIServiceManager
 * @description Central class for managing and interacting with different AI providers.
 */
export class AIServiceManager {

  /**
   * Loads the currently configured AI provider instance from the registry.
   * @private
   * @async
   * @returns {Promise<AIiProvider>} A promise that resolves with the loaded AI provider instance.
   * @throws {Error} If the AI provider is not configured or not found in the registry.
   */
  private async loadProvider(): Promise<AIiProvider> {
    const config = get(aiProviderConfigStore); // `get` is synchronous here
    const providerKey = config.provider?.toLowerCase();

    if (!providerKey) {
      throw new Error("AI provider is not configured.");
    }

    const providerInstance = providerRegistry[providerKey];
    if (!providerInstance) {
      throw new Error(`Provider "${config.provider}" not found or not supported.`);
    }
    return providerInstance;
  }

  /**
   * Builds the request options object for an AI provider, including model, API key, or base URL.
   * @private
   * @async
   * @param {AIiProvider} providerInstance - The AI provider instance for which to build options.
   * @returns {Promise<AIRequestOptions>} A promise that resolves with the AI request options.
   * @throws {Error} If necessary credentials (API key or Base URL) for the provider are missing.
   */
  private async buildOptions(providerInstance: AIiProvider): Promise<AIRequestOptions> {
    const credentials = get(aiCredentialsStore); // `get` is synchronous
    const providerConfig = get(aiProviderConfigStore); // `get` is synchronous

    const options: AIRequestOptions = { model: providerConfig.model };
    const apiKeyName = providerInstance.credentialKey; // e.g., 'openaiApiKey'
    const baseUrlName = providerInstance.urlKey;       // e.g., 'ollamaBaseUrl'

    let credentialTypeForError = "API key"; // Default error message part

    if (baseUrlName && credentials[baseUrlName]) {
      options.baseUrl = credentials[baseUrlName] as string;
    } else if (apiKeyName && credentials[apiKeyName]) {
      options.apiKey = credentials[apiKeyName] as string;
    } else {
      // Determine credential type for a more specific error message
      if (baseUrlName) { // If a baseUrlName was expected (e.g. Ollama)
        credentialTypeForError = "Base URL";
      }
      // This error will be caught by methods like listModels and can be displayed in the UI.
      throw new Error(`Required credentials (${credentialTypeForError}) are missing for provider "${providerConfig.provider}".`);
    }
    return options;
  }

  /**
   * Generates a summary for the given text using the configured AI provider and prompt, ensuring the response language.
   * @public
   * @async
   * @param {string} text - The text to summarize.
   * @param {string} locale - The desired language locale for the summary (e.g., 'en', 'pt-BR').
   * @returns {Promise<string>} A promise that resolves with the generated summary.
   */
  public async generateSummary(text: string, locale: string): Promise<string> {
    const languageMap: Record<string, string> = {
      'pt-BR': 'Brazilian Portuguese',
      'pt-PT': 'Portuguese (from Portugal)',
      'en': 'English',
      'es': 'Spanish',
    };

    const provider = await this.loadProvider();
    const prompts = get(promptsStore); // `get` is synchronous
    const options = await this.buildOptions(provider);
    
    const basePrompt = prompts.summaryPrompt;
    const languageName = languageMap[locale] || 'English'; // Fallback to English
    const finalPrompt = `${basePrompt}\n\n(IMPORTANT): The response must be written exclusively in ${languageName}.`;

    return provider.generateSummary(text, finalPrompt, options);
  }

  /**
   * Lists available models for the currently configured AI provider.
   * Handles potential errors during option building (e.g., missing credentials).
   * @public
   * @async
   * @returns {Promise<string[]>} A promise that resolves with an array of model names.
   * @throws {Error} If options cannot be built (e.g., missing credentials) or provider fails to list models.
   */
  public async listModels(): Promise<string[]> {
    const provider = await this.loadProvider();
    let optionsForListing: Pick<AIRequestOptions, 'apiKey' | 'baseUrl'>;

    try {
      // Attempt to build full options to get potential apiKey or baseUrl
      const fullOptions = await this.buildOptions(provider);
      optionsForListing = {
        apiKey: fullOptions.apiKey,
        baseUrl: fullOptions.baseUrl,
      };
    } catch (error) {
      // If buildOptions throws (e.g., missing credentials needed even for listing models for some providers,
      // or if the provider itself needs certain config to list models),
      // this error should be propagated to be handled by the UI (e.g., in OmniMaxPopup's refreshModelList).
      console.error("[AIServiceManager] Error building options for listModels:", (error as Error).message);
      throw error; // Re-throw the original error to be caught by the caller
    }

    return provider.listModels(optionsForListing);
  }
}