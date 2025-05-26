import { writable, type Updater, type Writable } from "svelte/store";
import { getInitialModuleStates } from './modules'; // Importamos a função que criamos em modules.ts

/**
 * Creates a persistent Svelte store backed by Chrome's sync storage.
 * Note that each item is limited to 8KB in chrome.storage.sync.
 * Use chrome.storage.local for larger amounts if necessary.
 * https://developer.chrome.com/docs/extensions/reference/api/storage#storage_areas
 *
 * @template T The type of the store's value
 * @param key The key to use in Chrome's storage
 * @param initialValue The initial value of the store
 * @returns A writable Svelte store
 */
export function persistentStore<T>(key: string, initialValue: T): Writable<T> {
  const store = writable<T>(initialValue);

  // Verifica se a API de storage do Chrome está disponível antes de usá-la.
  // Isso é útil para evitar erros se, por exemplo, este código fosse usado em um contexto não-extensão (testes).
  const isChromeStorageAvailable = chrome && chrome.storage && chrome.storage.sync;

  if (isChromeStorageAvailable) {
    // Carrega o valor inicial do chrome.storage.sync quando o store é criado
    chrome.storage.sync.get(key).then((result) => {
      if (Object.hasOwn(result, key)) {
        store.set(result[key]);
      }
    });

    // Observa mudanças no chrome.storage.sync para manter o store Svelte atualizado
    chrome.storage.sync.onChanged.addListener((changes) => {
      if (Object.hasOwn(changes, key)) {
        // Verifica se o novo valor é diferente do valor atual do store para evitar loops desnecessários
        // (Embora o Svelte possa já lidar com isso, é uma boa prática)
        let currentValue: T | undefined;
        const unsubscribe = store.subscribe(value => currentValue = value);
        unsubscribe(); // Desinscreve imediatamente após pegar o valor

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

/**
 * Store persistente para os estados (habilitado/desabilitado) dos módulos individuais do Omni Max.
 * A chave no chrome.storage.sync será 'omniMaxModuleStates'.
 * O valor inicial é um objeto onde cada chave é o ID de um módulo e o valor é seu estado booleano padrão.
 * Ex: { layoutCorrection: true, shortcutCopyName: true, ... }
 */
export const moduleStatesStore = persistentStore<Record<string, boolean>>(
  'omniMaxModuleStates',      // Nome da chave no chrome.storage.sync
  getInitialModuleStates()    // Função de src/modules.ts que retorna os estados iniciais
);

/**
 * Store persistente para o estado global (ligado/desligado) da extensão Omni Max.
 * A chave no chrome.storage.sync será 'omniMaxGlobalEnabled'.
 * Por padrão, a extensão começa habilitada (true).
 */
export const globalExtensionEnabledStore = persistentStore<boolean>(
  'omniMaxGlobalEnabled',     // Nome da chave no chrome.storage.sync
  true                        // Valor inicial: extensão globalmente habilitada
);

// Se você ainda tiver o store 'count' do boilerplate, pode removê-lo ou comentá-lo:
// export const count = persistentStore("count", 10);