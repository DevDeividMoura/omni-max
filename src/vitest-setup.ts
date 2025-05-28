// src/vitest-setup.ts
import { vi, beforeEach, afterEach } from 'vitest';
import * as actualVitestChrome from 'vitest-chrome';

// Adiciona o objeto 'chrome' mockado da biblioteca ao escopo global
// Object.assign(global, actualVitestChrome); // Comum em JS puro ou setups mais antigos
// Para ambientes ESM e TypeScript com Vitest, é mais seguro e type-friendly fazer assim:
vi.stubGlobal('chrome', actualVitestChrome.chrome); // Usa apenas o objeto 'chrome' exportado


// Opcional, mas recomendado: Limpar/resetar mocks entre os testes.
// A biblioteca `vitest-chrome` fornece funções já mockadas (vi.fn()).
// `vi.clearAllMocks()`: Limpa o histórico de chamadas (mock.calls, mock.results).
// `vi.resetAllMocks()`: Além de limpar o histórico, remove implementações mockadas,
//                      restaurando para um mock vazio de vi.fn(). Isso é geralmente mais seguro.
beforeEach(() => {
    vi.resetAllMocks(); // Reseta todos os mocks para um estado "limpo" antes de cada teste.
});

// afterEach(() => {
//    // Pode ser útil para alguma limpeza específica, mas resetAllMocks no beforeEach costuma ser suficiente.
// });

console.log('Vitest setup file loaded and vitest-chrome initialized.');