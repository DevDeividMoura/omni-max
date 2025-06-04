// src/storage/stores.ts
import { persistentStore } from './persistentStore';
import { getInitialModuleStates } from '../modules';

// --- Defaults ---
export const GlobalExtensionEnabledDefault = true;
export const ModuleStatesDefault = getInitialModuleStates();
export const ShortcutsOverallEnabledDefault = true;
export const AiFeaturesEnabledDefault = false;

export interface AiCredentials {
  openaiApiKey?: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  ollamaBaseUrl?: string;
}
export const AiCredentialsDefaults: AiCredentials = {
  openaiApiKey: '',
  geminiApiKey: '',
  anthropicApiKey: '',
  ollamaBaseUrl: 'http://localhost:11434',
};

export interface AiProviderConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | 'ollama' | string;
  model: string;
}
export const AiProviderConfigDefaults: AiProviderConfig = {
  provider: 'openai',
  model: '',
};

export interface PromptsConfig {
  summaryPrompt: string;
  improvementPrompt: string;
}
export const PromptsConfigDefaults: PromptsConfig = {
  summaryPrompt: 'Resuma esta conversa de atendimento ao cliente de forma concisa, destacando o problema principal a principal causa e a resolução.',
  improvementPrompt: 'Revise a seguinte resposta para um cliente, tornando-a mais clara, empática e profissional, mantendo o significado original:',
};

export interface CollapsibleSectionsState {
  modules: boolean;
  shortcuts: boolean;
  ai: boolean;
  prompts: boolean;
}
export const CollapsibleSectionsStateDefaults: CollapsibleSectionsState = {
  modules: false,
  shortcuts: false,
  ai: false,
  prompts: false,
};

export interface ShortcutKeysConfig { [moduleId: string]: string }
export const ShortcutKeysConfigDefaults: ShortcutKeysConfig = {
  shortcutCopyName: 'Z',
  shortcutCopyDocumentNumber: 'X',
  shortcutServiceOrderTemplate: 'S',
};

// --- Stores ---
export const globalExtensionEnabledStore =
  persistentStore<boolean>('omniMaxGlobalEnabled', GlobalExtensionEnabledDefault);

export const moduleStatesStore =
  persistentStore<Record<string, boolean>>('omniMaxModuleStates', ModuleStatesDefault);

export const shortcutsOverallEnabledStore =
  persistentStore<boolean>('omniMaxShortcutsOverallEnabled', ShortcutsOverallEnabledDefault);

export const aiFeaturesEnabledStore =
  persistentStore<boolean>('omniMaxAiFeaturesEnabled', AiFeaturesEnabledDefault);

export const aiCredentialsStore =
  persistentStore<AiCredentials>('omniMaxAiCredentials', AiCredentialsDefaults);

export const aiProviderConfigStore =
  persistentStore<AiProviderConfig>('omniMaxAiProviderConfig', AiProviderConfigDefaults);

export const promptsStore =
  persistentStore<PromptsConfig>('omniMaxPrompts', PromptsConfigDefaults);

export const collapsibleSectionsStateStore =
  persistentStore<CollapsibleSectionsState>('omniMaxCollapsibleSectionsState', CollapsibleSectionsStateDefaults);

export const shortcutKeysStore =
  persistentStore<ShortcutKeysConfig>('omniMaxShortcutKeys', ShortcutKeysConfigDefaults);