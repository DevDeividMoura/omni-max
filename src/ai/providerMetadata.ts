/**
 * @file src/ai/providerMetadata.ts
 * @description Defines metadata for various AI providers, including display names,
 * credential requirements, and UI-related settings for configuration.
 */
import type { AiCredentials, AiProviderConfig } from '../storage/stores';

/**
 * @interface ProviderMetadata
 * @description Describes the metadata associated with an AI provider.
 * This information is used for UI display, credential management, and service interaction.
 */
export interface ProviderMetadata {
  /**
   * @property {string} id - Unique identifier for the provider.
   * Must correspond to IDs used in AIServiceManager and stores (e.g., 'openai', 'groq').
   */
  id: AiProviderConfig['provider'];

  /**
   * @property {string} displayName - User-friendly name for display in the UI (e.g., "OpenAI", "Groq").
   * Note: This value might be in Portuguese if it's directly rendered in a PT-BR UI.
   */
  displayName: string;

  /**
   * @property {'apiKey' | 'baseUrl' | 'apiKeyAndBaseUrl' | 'none'} credentialType
   * @description Defines the primary type of credential this provider uses.
   * 'none' is for providers without credentials (rare).
   */
  credentialType: 'apiKey' | 'baseUrl' | 'apiKeyAndBaseUrl' | 'none';

  /**
   * @property {object} [apiKeySettings] - Configuration details if the provider uses an API Key.
   */
  apiKeySettings?: {
    /** @property {keyof AiCredentials} credentialKey - The key in `AiCredentials` store for this API key (e.g., 'openaiApiKey'). */
    credentialKey: keyof AiCredentials;
    /** @property {string} label - UI label for the API key input field (e.g., "OpenAI API Key"). May be Portuguese for PT-BR UI. */
    label: string;
    /** @property {string} placeholder - Placeholder text for the API key input field (e.g., "sk-..."). May be Portuguese for PT-BR UI. */
    placeholder: string;
    /** @property {'password' | 'text'} [inputType='password'] - Input type for the API key field. Defaults to 'password'. */
    inputType?: 'password' | 'text';
  };

  /**
   * @property {object} [baseUrlSettings] - Configuration details if the provider uses a Base URL.
   */
  baseUrlSettings?: {
    /** @property {keyof AiCredentials} credentialKey - The key in `AiCredentials` store for this Base URL (e.g., 'ollamaBaseUrl'). */
    credentialKey: keyof AiCredentials;
    /** @property {string} label - UI label for the Base URL input field (e.g., "Ollama Base URL"). May be Portuguese for PT-BR UI. */
    label: string;
    /** @property {string} placeholder - Placeholder text for the Base URL input field (e.g., "http://localhost:11434"). May be Portuguese for PT-BR UI. */
    placeholder: string;
    /** @property {'text'} [inputType='text'] - Input type for the Base URL field. Defaults to 'text'. */
    inputType?: 'text';
  };

  /**
   * @property {string} [documentationLink] - Optional URL to the provider's documentation on how to obtain credentials.
   */
  documentationLink?: string;
  /**
   * @property {string} [defaultModel] - Optional suggested default model for this provider.
   */
  defaultModel?: string;
}

/**
 * @const {ProviderMetadata[]} PROVIDER_METADATA_LIST
 * @description A list of metadata for all supported AI providers.
 * This list is the single source of truth for provider configurations.
 */
export const PROVIDER_METADATA_LIST: ProviderMetadata[] = [
  {
    id: 'openai',
    displayName: 'OpenAI', // Proper name, typically English
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'openaiApiKey',
      label: 'OpenAI API Key', // UI Label
      placeholder: 'sk-...',     // UI Placeholder
      inputType: 'password',
    },
    documentationLink: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'gemini',
    displayName: 'Google Gemini', // Proper name, typically English
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'geminiApiKey',
      label: 'Google Gemini API Key',     // UI Label
      placeholder: 'Sua Gemini API Key...', // UI Placeholder: PT-BR
      inputType: 'password',
    },
    documentationLink: 'https://ai.google.dev/gemini-api/docs/api-key',
    defaultModel: 'gemini-1.5-flash-latest',
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic', // Proper name, typically English
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'anthropicApiKey',
      label: 'Anthropic API Key',         // UI Label
      placeholder: 'Sua Anthropic API Key...', // UI Placeholder: PT-BR
      inputType: 'password',
    },
    documentationLink: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-3-haiku-20240307',
  },
  {
    id: 'ollama',
    displayName: 'Ollama', // Proper name, typically English
    credentialType: 'baseUrl',
    baseUrlSettings: {
      credentialKey: 'ollamaBaseUrl',
      label: 'Ollama Base URL',              // UI Label
      placeholder: 'Ex: http://localhost:11434', // UI Placeholder: PT-BR (prefix "Ex:")
      inputType: 'text',
    },
    documentationLink: 'https://ollama.com/blog/openai-compatibility',
    // Ollama does not have a fixed default model; it depends on what the user has installed.
    // The OllamaProvider's listModels method handles discovery of available models.
  },
  {
    id: 'groq',
    displayName: 'Groq', // Proper name, typically English
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'groqApiKey',
      label: 'Groq API Key',        // UI Label
      placeholder: 'gsk_...',       // UI Placeholder
      inputType: 'password',
    },
    documentationLink: 'https://console.groq.com/keys',
    defaultModel: 'llama3-8b-8192',
  },
  // Add new providers here following the same structure.
];

/**
 * @const {Map<string, ProviderMetadata>} PROVIDER_METADATA_MAP
 * @description A map for easy lookup of provider metadata by provider ID.
 * Created from `PROVIDER_METADATA_LIST`.
 */
export const PROVIDER_METADATA_MAP: Map<string, ProviderMetadata> = new Map(
  PROVIDER_METADATA_LIST.map(meta => [meta.id, meta])
);