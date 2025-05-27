import { writable, type Updater, type Writable } from "svelte/store";
import { getInitialModuleStates } from './modules'; // availableModules and Module type are not directly used here

/**
 * Creates a Svelte writable store that persists its value to `chrome.storage.sync`.
 * It initializes from `chrome.storage.sync` if a value exists for the given key;
 * otherwise, it uses the provided `initialValue`.
 * Changes to the store are automatically saved to `chrome.storage.sync`.
 * The store also listens for external changes to the same key in `chrome.storage.sync`
 * (e.g., from other extension pages or content scripts) and updates its state accordingly.
 *
 * @template T The type of the value held by the store.
 * @param {string} key The key under which the value is stored in `chrome.storage.sync`.
 * @param {T} initialValue The initial value to use if no value is found in storage or if storage is unavailable.
 * @returns {Writable<T>} A Svelte writable store with persistence capabilities.
 */
export function persistentStore<T>(key: string, initialValue: T): Writable<T> {
  const store = writable<T>(initialValue);
  const isChromeStorageAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;

  if (isChromeStorageAvailable) {
    chrome.storage.sync.get(key).then((result) => {
      if (Object.hasOwn(result, key) && result[key] !== undefined) {
        store.set(result[key]);
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && Object.hasOwn(changes, key)) {
        let currentValue: T | undefined;
        const unsubscribe = store.subscribe(value => currentValue = value);
        unsubscribe(); // Immediately unsubscribe after getting the current value

        // Check if the new value from storage is actually different before setting
        if (JSON.stringify(changes[key].newValue) !== JSON.stringify(currentValue)) {
          store.set(changes[key].newValue);
        }
      }
    });
  } else {
    console.warn(
      `Omni Max [PersistentStore]: Chrome storage.sync API not available for key "${key}". Store will operate in-memory only for this session.`
    );
  }

  return {
    set(this: void, value: T): void {
      store.set(value);
      if (isChromeStorageAvailable) {
        chrome.storage.sync.set({ [key]: value });
      }
    },
    update(this: void, updater: Updater<T>): void {
      store.update((currentValue: T): T => {
        const newValue = updater(currentValue);
        if (isChromeStorageAvailable) {
          chrome.storage.sync.set({ [key]: newValue });
        }
        return newValue;
      });
    },
    subscribe: store.subscribe,
  };
}

// --- Omni Max Configuration Stores ---

/** Global enable/disable state for the entire Omni Max extension. */
export const globalExtensionEnabledStore = persistentStore<boolean>(
  'omniMaxGlobalEnabled',
  true
);

/** Stores the enabled/disabled state for each individual module. */
export const moduleStatesStore = persistentStore<Record<string, boolean>>(
  'omniMaxModuleStates',
  getInitialModuleStates()
);

// --- Stores for Enhanced UI Features ---

/** General toggle for the "Keyboard Shortcuts" section in the popup. */
export const shortcutsOverallEnabledStore = persistentStore<boolean>(
  'omniMaxShortcutsOverallEnabled',
  true
);

/** General toggle for the "AI Settings" section in the popup. */
export const aiFeaturesEnabledStore = persistentStore<boolean>(
  'omniMaxAiFeaturesEnabled',
  false
);

/**
 * Defines the structure for storing API credentials for various AI providers.
 */
export interface AiCredentials {
  /** API key for OpenAI services. */
  openaiApiKey?: string;
  /** API key for Google Gemini services. (Future use) */
  geminiApiKey?: string;
  /** API key for Anthropic Claude services. (Future use) */
  anthropicApiKey?: string;
}
/** Stores API keys for AI provider integrations. */
export const aiCredentialsStore = persistentStore<AiCredentials>(
  'omniMaxAiCredentials',
  { openaiApiKey: '' }
);

/**
 * Defines the structure for AI provider and model configuration.
 */
export interface AiProviderConfig {
  /** Identifier for the selected AI provider (e.g., 'openai', 'gemini'). */
  provider: string;
  /** Identifier for the specific AI model to be used (e.g., 'gpt-4o-mini'). */
  model: string;
}
/** Stores the selected AI provider and model configuration. */
export const aiProviderConfigStore = persistentStore<AiProviderConfig>(
  'omniMaxAiProviderConfig',
  { provider: 'openai', model: 'gpt-4o-mini' }
);

/**
 * Defines the structure for customizable AI prompts.
 */
export interface PromptsConfig {
  /** Custom prompt to be used for generating chat summaries. */
  summaryPrompt: string;
  /** Custom prompt for AI-assisted response improvement. */
  improvementPrompt: string;
}
/** Stores user-customizable prompts for AI features. */
export const promptsStore = persistentStore<PromptsConfig>(
  'omniMaxPrompts',
  {
    summaryPrompt: 'Resuma esta conversa de atendimento ao cliente de forma concisa, destacando o problema principal e a resolução.',
    improvementPrompt: 'Revise a seguinte resposta para um cliente, tornando-a mais clara, empática e profissional, mantendo o significado original:',
  }
);

/**
 * Defines the open/closed state of collapsible sections in the extension's popup UI.
 */
export interface CollapsibleSectionsState {
  /** State for the 'Modules' section. True if open, false if closed. */
  modules: boolean;
  /** State for the 'Shortcuts' section. */
  shortcuts: boolean;
  /** State for the 'AI Configuration' section. */
  ai: boolean;
  /** State for the 'Prompts Configuration' section. */
  prompts: boolean;
}
/** Persists the open/closed state of collapsible UI sections. */
export const collapsibleSectionsStateStore = persistentStore<CollapsibleSectionsState>(
  'omniMaxCollapsibleSectionsState',
  {
    modules: false,
    shortcuts: false,
    ai: false,
    prompts: false,
  }
);

/**
 * Interface for configuring keyboard shortcuts.
 * Maps a shortcut module's ID (e.g., 'shortcutCopyName') to its assigned key (e.g., 'X').
 */
export interface ShortcutKeysConfig {
  [moduleId: string]: string;
}
/** Stores user-configured keybindings for available shortcuts. */
export const shortcutKeysStore = persistentStore<ShortcutKeysConfig>(
  'omniMaxShortcutKeys',
  {
    shortcutCopyName: 'Z',
    shortcutCopyDocumentNumber: 'X',
  }
);