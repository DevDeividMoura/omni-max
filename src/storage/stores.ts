/**
 * @file src/storage/stores.ts
 * @description Defines Svelte stores for managing extension state with persistence.
 * It includes default values, type interfaces, and instances of persistent stores
 * for various application settings.
 */
import { persistentStore } from './persistentStore';
import { getInitialModuleStates } from '../modules';
import { PROVIDER_METADATA_LIST } from '../shared/providerMetadata';

// --- Default Values ---

/**
 * @const {boolean} GlobalExtensionEnabledDefault
 * @description Default state for whether the entire extension is globally enabled.
 */
export const GlobalExtensionEnabledDefault = true;

/**
 * @const {Record<string, boolean>} ModuleStatesDefault
 * @description Default states for individual feature modules, derived from `getInitialModuleStates`.
 */
export const ModuleStatesDefault = getInitialModuleStates();

/**
 * @const {boolean} ShortcutsOverallEnabledDefault
 * @description Default state for whether keyboard shortcuts are globally enabled.
 */
export const ShortcutsOverallEnabledDefault = true;

/**
 * @const {boolean} AiFeaturesEnabledDefault
 * @description Default state for whether AI-powered features are globally enabled.
 */
export const AiFeaturesEnabledDefault = false;

/**
 * @interface AiCredentials
 * @description Defines the structure for storing API keys for various AI providers.
 */
export interface AiCredentials {
  /** @property {string} [groqApiKey] - API key for Groq. */
  groqApiKey?: string;
  /** @property {string} [openaiApiKey] - API key for OpenAI. */
  openaiApiKey?: string;
  /** @property {string} [geminiApiKey] - API key for Google Gemini. */
  geminiApiKey?: string;
  /** @property {string} [anthropicApiKey] - API key for Anthropic Claude. */
  anthropicApiKey?: string;
  /** @property {string} [ollamaBaseUrl] - Base URL for a local Ollama instance. */
  ollamaBaseUrl?: string;
}
/**
 * @const {AiCredentials} AiCredentialsDefaults
 * @description Default values for AI provider credentials.
 * API keys are typically empty by default, and Ollama URL points to a common local default.
 */
export const AiCredentialsDefaults: AiCredentials = {
  groqApiKey: '',
  openaiApiKey: '',
  geminiApiKey: '',
  anthropicApiKey: '',
  ollamaBaseUrl: 'http://localhost:11434',
};

/**
 * @interface AiProviderConfig
 * @description Defines the structure for the selected AI provider and model.
 */
export interface AiProviderConfig {
  /** @property {string} provider - The ID of the selected AI provider. */
  provider: string;
  /** @property {string} model - The specific model selected for the chosen provider. */
  model: string;
}
/**
 * @const {AiProviderConfig} AiProviderConfigDefaults
 * @description Default AI provider and model configuration.
 * It attempts to use the first provider and its default model from `PROVIDER_METADATA_LIST`,
 * falling back to predefined values if the list is empty.
 */
export const AiProviderConfigDefaults: AiProviderConfig = {
  // Uses the ID of the first provider in the metadata list as default, or a fallback.
  provider: PROVIDER_METADATA_LIST.length > 0 ? PROVIDER_METADATA_LIST[0].id : 'openai',
  model: PROVIDER_METADATA_LIST.length > 0 ? (PROVIDER_METADATA_LIST[0].defaultModel || '') : '',
};

export interface Persona {
  id: string;
  name: string;
  description: string;
  prompt: string;
  /**
   * A list of tool names (IDs) that this persona is allowed to use.
   * Corresponds to the IDs in toolMetadata.ts and keys in masterToolRegistry.
   */
  tool_names: string[]; // <-- NOSSO NOVO CAMPO
}

// Também devemos atualizar o valor padrão
export const PersonasDefaults: Persona[] = [
  {
    id: '1718544000000-support',
    name: 'Suporte Padrão',
    description: 'Assistente geral para resolução de problemas comuns.',
    prompt: '...',
    tool_names: ['get_entire_protocol_history', 'get_latest_messages_from_session'], // <-- Exemplo preenchido
  },
  {
    id: '1718544000001-sales',
    name: 'Vendas Consultivas',
    description: 'Assistente focado em identificar oportunidades e apresentar produtos.',
    prompt: '...',
    tool_names: ['get_latest_messages_from_session'], // <-- Vendas talvez só precise das msgs recentes
  }
];

/**
 * @interface CollapsibleSectionsState
 * @description Defines the structure for the open/closed state of collapsible sections in the UI.
 */
export interface CollapsibleSectionsState {
  /** @property {boolean} modules - State for the feature modules section. True if open, false if closed. */
  modules: boolean;
  /** @property {boolean} shortcuts - State for the keyboard shortcuts section. True if open, false if closed. */
  shortcuts: boolean;
  /** @property {boolean} ai - State for the AI configuration section. True if open, false if closed. */
  ai: boolean;
  /** @property {boolean} personas - State for the agent personas configuration section. True if open, false if closed. */
  personas: boolean;

}
/**
 * @const {CollapsibleSectionsState} CollapsibleSectionsStateDefaults
 * @description Default states for collapsible UI sections, all initially closed.
 */
export const CollapsibleSectionsStateDefaults: CollapsibleSectionsState = {
  modules: false,
  shortcuts: false,
  personas: false,
  ai: false,
};

/**
 * @interface ShortcutKeysConfig
 * @description Defines the structure for mapping module IDs to their assigned shortcut keys.
 * The value is typically the character of the key (e.g., "Z", "X").
 */
export interface ShortcutKeysConfig { [moduleId: string]: string }
/**
 * @const {ShortcutKeysConfig} ShortcutKeysConfigDefaults
 * @description Default keyboard shortcut key assignments for specific features.
 */
export const ShortcutKeysConfigDefaults: ShortcutKeysConfig = {
  shortcutCopyName: 'Z',
  shortcutCopyDocumentNumber: 'X',
  shortcutServiceOrderTemplate: 'S',
};

// --- Svelte Stores ---

/**
 * @const {Writable<boolean>} globalExtensionEnabledStore
 * @description Persistent Svelte store for the global enabled/disabled state of the extension.
 */
export const globalExtensionEnabledStore =
  persistentStore<boolean>('omniMaxGlobalEnabled', GlobalExtensionEnabledDefault);

/**
 * @const {Writable<Record<string, boolean>>} moduleStatesStore
 * @description Persistent Svelte store for the enabled/disabled states of individual feature modules.
 */
export const moduleStatesStore =
  persistentStore<Record<string, boolean>>('omniMaxModuleStates', ModuleStatesDefault);

/**
 * @const {Writable<boolean>} shortcutsOverallEnabledStore
 * @description Persistent Svelte store for the global enabled/disabled state of keyboard shortcuts.
 */
export const shortcutsOverallEnabledStore =
  persistentStore<boolean>('omniMaxShortcutsOverallEnabled', ShortcutsOverallEnabledDefault);

/**
 * @const {Writable<boolean>} aiFeaturesEnabledStore
 * @description Persistent Svelte store for the global enabled/disabled state of AI features.
 */
export const aiFeaturesEnabledStore =
  persistentStore<boolean>('omniMaxAiFeaturesEnabled', AiFeaturesEnabledDefault);

/**
 * @const {Writable<AiCredentials>} aiCredentialsStore
 * @description Persistent Svelte store for AI provider API keys and configurations.
 */
export const aiCredentialsStore =
  persistentStore<AiCredentials>('omniMaxAiCredentials', AiCredentialsDefaults);

/**
 * @const {Writable<AiProviderConfig>} aiProviderConfigStore
 * @description Persistent Svelte store for the selected AI provider and model.
 */
export const aiProviderConfigStore =
  persistentStore<AiProviderConfig>('omniMaxAiProviderConfig', AiProviderConfigDefaults);

/**
 * @const {Writable<CollapsibleSectionsState>} collapsibleSectionsStateStore
 * @description Persistent Svelte store for the open/closed state of UI collapsible sections.
 */
export const collapsibleSectionsStateStore =
  persistentStore<CollapsibleSectionsState>('omniMaxCollapsibleSectionsState', CollapsibleSectionsStateDefaults);

/**
 * @const {Writable<ShortcutKeysConfig>} shortcutKeysStore
 * @description Persistent Svelte store for keyboard shortcut key configurations.
 */
export const shortcutKeysStore =
  persistentStore<ShortcutKeysConfig>('omniMaxShortcutKeys', ShortcutKeysConfigDefaults);

/**
 * @const {Writable<string>} selectedLocaleStore
 * @description Persistent Svelte store for the selected locale of the application.
 * Defaults to 'pt-BR' (Brazilian Portuguese).
 */
export const selectedLocaleStore = 
  persistentStore<string>('omniMaxSelectedLocale', '');

/**
 * @const {Writable<Persona[]>} personasStore
 * @description Persistent Svelte store for managing the list of user-defined agent personas.
 */
export const personasStore = persistentStore<Persona[]>('omniMaxPersonas', PersonasDefaults);