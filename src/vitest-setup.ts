// src/vitest-setup.ts
import { vi, beforeEach, afterEach } from 'vitest';

// Mock global da API chrome.*
const mockChrome = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
            hasListener: vi.fn(),
        },
        getURL: vi.fn((path) => `chrome-extension://your-extension-id/${path}`),
        lastError: undefined as chrome.runtime.LastError | undefined,
        // Adicione onInstalled, etc., conforme necessário para seus testes futuros
        onInstalled: {
            addListener: vi.fn()
        }
    },
    tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        onUpdated: {
            addListener: vi.fn(),
        },
        // Adicione outros métodos de 'tabs' que você usa
    },
    action: { // Para chrome.action (Manifest V3)
        onClicked: {
            addListener: vi.fn(),
        },
        setIcon: vi.fn(),
        setBadgeText: vi.fn(),
        // Adicione outros métodos de 'action'
    },
    storage: { // Mock para chrome.storage
        local: {
            get: vi.fn((keys, callback) => {
                // Comportamento padrão: chave não encontrada
                const result: { [key: string]: any } = {};
                const keyArray = Array.isArray(keys) ? keys : [keys];
                keyArray.forEach(key => result[key] = undefined);
                if (callback) callback(result);
                return Promise.resolve(result); // Para chamadas async/await
            }),
            set: vi.fn((items, callback) => {
                if (callback) callback();
                return Promise.resolve(); // Para chamadas async/await
            }),
            remove: vi.fn((keys, callback) => {
                if (callback) callback();
                return Promise.resolve();
            }),
            clear: vi.fn((callback) => {
                if (callback) callback();
                return Promise.resolve();
            }),
        },
        sync: { // Adicione mocks para sync se você usar
            get: vi.fn((keys, callback) => {
                const result: { [key: string]: any } = {};
                const keyArray = Array.isArray(keys) ? keys : [keys];
                keyArray.forEach(key => result[key] = undefined);
                if (callback) callback(result);
                return Promise.resolve(result);
            }),
            set: vi.fn((items, callback) => {
                if (callback) callback();
                return Promise.resolve();
            }),
            // ... remove, clear para sync
        },
        onChanged: {
            addListener: vi.fn(),
        },
    },
    // Adicione outros namespaces da API Chrome que sua extensão usa (e.g., commands, scripting, notifications)
    commands: {
        onCommand: {
            addListener: vi.fn()
        }
    },
    scripting: {
        executeScript: vi.fn()
    }
};

vi.stubGlobal('chrome', mockChrome);

// Limpar mocks antes de cada arquivo de teste para garantir isolamento,
// mas mocks de `chrome.storage.local.get/set` podem precisar ser resetados
// mais granularmente dentro dos `beforeEach` dos testes específicos de storage.
beforeEach(() => {
    // Resetar todos os mocks para um estado limpo antes de cada teste.
    // Isso é importante para que o estado de um mock de um teste não afete outro.
    mockChrome.runtime.sendMessage.mockClear();
    mockChrome.runtime.onMessage.addListener.mockClear();
    mockChrome.storage.local.get.mockReset().mockImplementation((keys, callback) => {
        const result: { [key: string]: any } = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(key => result[key] = undefined);
        if (callback) callback(result);
        return Promise.resolve(result);
    });
    mockChrome.storage.local.set.mockReset().mockImplementation((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
    });
    // Faça mockClear() ou mockReset() para outros mocks conforme necessário
});

// Opcional: Limpeza global após cada teste, se necessário
// afterEach(() => {
//    vi.clearAllMocks(); // Cuidado: isso limpa o ESTADO dos mocks (chamadas, etc.), não a implementação.
                       // vi.resetAllMocks(); // Limpa mocks para suas implementações originais ou stubs vazios.
// });

console.log('Vitest setup file loaded and chrome API mocked.');