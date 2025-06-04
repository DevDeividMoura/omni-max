// src/storage/stores.ts

import { persistentStore } from './persistentStore'
import { getInitialModuleStates } from '../modules'  // sua função existente

// — toggles gerais
export const globalExtensionEnabledStore =
  persistentStore<boolean>('omniMaxGlobalEnabled', true)

export const moduleStatesStore =
  persistentStore<Record<string, boolean>>('omniMaxModuleStates', getInitialModuleStates())

// — UI shortcuts
export const shortcutsOverallEnabledStore =
  persistentStore<boolean>('omniMaxShortcutsOverallEnabled', true)

// — IA features
export const aiFeaturesEnabledStore =
  persistentStore<boolean>('omniMaxAiFeaturesEnabled', true)

export interface AiCredentials {
  openaiApiKey?: string
  geminiApiKey?: string
  anthropicApiKey?: string
  ollamaBaseUrl?: string;
}
export const aiCredentialsStore =
  persistentStore<AiCredentials>(
    'omniMaxAiCredentials', 
    { 
      openaiApiKey: '', 
      ollamaBaseUrl: 'http://localhost:11434' 
    }
  )

export interface AiProviderConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | 'ollama' | string;
  model: string
}
export const aiProviderConfigStore =
  persistentStore<AiProviderConfig>('omniMaxAiProviderConfig', { provider: 'openai', model: 'gpt-4o-mini' })

export interface PromptsConfig {
  summaryPrompt: string
  improvementPrompt: string
}

export const PromptsConfigDefaults: PromptsConfig = {
    summaryPrompt: 'Resuma esta conversa de atendimento ao cliente de forma concisa, destacando o problema principal e a resolução.',
    improvementPrompt: 'Revise a seguinte resposta para um cliente, tornando-a mais clara, empática e profissional, mantendo o significado original:',
  };

export const promptsStore =
  persistentStore<PromptsConfig>('omniMaxPrompts', PromptsConfigDefaults)

// — estados de seções colapsáveis
export interface CollapsibleSectionsState {
  modules: boolean
  shortcuts: boolean
  ai: boolean
  prompts: boolean
}
export const collapsibleSectionsStateStore =
  persistentStore<CollapsibleSectionsState>('omniMaxCollapsibleSectionsState', {
    modules: false,
    shortcuts: false,
    ai: true,
    prompts: false,
  })

// — atalho de teclas
export interface ShortcutKeysConfig { [moduleId: string]: string }
export const shortcutKeysStore =
  persistentStore<ShortcutKeysConfig>('omniMaxShortcutKeys', {
    shortcutCopyName: 'Z',
    shortcutCopyDocumentNumber: 'X',
    shortcutServiceOrderTemplate: 'S',
  })
