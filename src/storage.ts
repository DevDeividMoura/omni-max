import { writable, type Updater, type Writable } from "svelte/store";
import { getInitialModuleStates, availableModules, type Module } from './modules';


export function persistentStore<T>(key: string, initialValue: T): Writable<T> {
  const store = writable<T>(initialValue);
  const isChromeStorageAvailable = chrome && chrome.storage && chrome.storage.sync;

  if (isChromeStorageAvailable) {
    chrome.storage.sync.get(key).then((result) => {
      if (Object.hasOwn(result, key)) {
        store.set(result[key]);
      }
    });
    chrome.storage.sync.onChanged.addListener((changes) => {
      if (Object.hasOwn(changes, key)) {
        let currentValue: T | undefined;
        const unsubscribe = store.subscribe(value => currentValue = value);
        unsubscribe();
        if (JSON.stringify(changes[key].newValue) !== JSON.stringify(currentValue)) {
          store.set(changes[key].newValue);
        }
      }
    });
  } else {
    console.warn(
      `Chrome storage sync API not available for key "${key}". Persistent store will operate in memory only for this session.`
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


// --- ARMAZENAMENTO PARA AS CONFIGURAÇÕES DO OMNI MAX ---

// Stores já definidos (ou que estávamos planejando)
export const globalExtensionEnabledStore = persistentStore<boolean>(
  'omniMaxGlobalEnabled',
  true
);

export const moduleStatesStore = persistentStore<Record<string, boolean>>(
  'omniMaxModuleStates',
  getInitialModuleStates()
);

// --- NOVOS STORES PARA A UI APRIMORADA ---

// Para o toggle geral da seção "Atalhos de Teclado"
export const shortcutsOverallEnabledStore = persistentStore<boolean>(
  'omniMaxShortcutsOverallEnabled',
  true
);

// Para o toggle geral da seção "Configurações de IA"
export const aiFeaturesEnabledStore = persistentStore<boolean>(
  'omniMaxAiFeaturesEnabled',
  false
);

// Para armazenar as credenciais de IA
// Inicialmente, focaremos na chave da OpenAI.
export interface AiCredentials {
  openaiApiKey?: string;
  geminiApiKey?: string; // Placeholder para o futuro
  anthropicApiKey?: string; // Placeholder para o futuro
}
export const aiCredentialsStore = persistentStore<AiCredentials>(
  'omniMaxAiCredentials',
  { openaiApiKey: '' } // Valor inicial
);

// Para armazenar a configuração do provedor e modelo de IA
export interface AiProviderConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | string;
  model: string; // O ID/nome do modelo específico
}
export const aiProviderConfigStore = persistentStore<AiProviderConfig>(
  'omniMaxAiProviderConfig',
  { provider: 'openai', model: 'gpt-4o-mini' } // Valores iniciais padrão
);

// Para armazenar os prompts customizáveis
export interface PromptsConfig {
  summaryPrompt: string;
  improvementPrompt: string;
}
export const promptsStore = persistentStore<PromptsConfig>(
  'omniMaxPrompts',
  {
    summaryPrompt: 'Resuma esta conversa de atendimento ao cliente de forma concisa, destacando o problema principal e a resolução.',
    improvementPrompt: 'Revise a seguinte resposta para um cliente, tornando-a mais clara, empática e profissional, mantendo o significado original:',
  } 
);

// Store para o estado de abertura das seções colapsáveis (opcional, pode ser estado local do componente)
// Se quisermos persistir quais seções o usuário deixou abertas/fechadas:
export interface CollapsibleSectionsState {
  modules: boolean;
  shortcuts: boolean;
  ai: boolean;
  prompts: boolean;
}
export const collapsibleSectionsStateStore = persistentStore<CollapsibleSectionsState>(
  'omniMaxCollapsibleSectionsState',
  { // Padrão de quais seções começam abertas
    modules: false,
    shortcuts: false,
    ai: false,
    prompts: false,
  }
);