// src/content/index.test.ts
import {
  initializeOmniMaxContentScript,
  OMNI_MAX_CONTENT_LOADED_FLAG,
  handleLayoutCorrection,
} from './index'; // O caminho './index' já importa de src/content/index.ts
import { CONFIG, type Config } from './config'; // Importar Config explicitamente
import { DomService } from './services/DomService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { vi, describe, it, beforeEach, afterEach, expect, type Mocked } from 'vitest';

import { get } from 'svelte/store';
import { globalExtensionEnabledStore, moduleStatesStore } from '../storage/stores';

// Constante para o número de retries, para manter os testes sincronizados com a implementação
// Idealmente, esta constante viria da própria implementação ou seria mockável.
// Para este exemplo, vamos usar o valor conhecido (15 retries + 1 chamada inicial = 16)
const MAX_EXPECTED_QUERY_CALLS_ON_FAILURE = 16;


describe('handleLayoutCorrection', () => {
  let mockDomService: Mocked<DomService>;
  // Salva o valor original do seletor para restaurá-lo,
  // garantindo isolamento entre testes que modificam CONFIG.
  let originalTabsListSelectorValue: string | undefined;

  beforeEach(() => {
    vi.useFakeTimers(); // <<< Ponto crucial: Habilita fake timers

    // Salva e restaura o valor original de CONFIG.selectors.tabsList
    // Isso é feito aqui para garantir que cada teste comece com o valor original da CONFIG,
    // antes que qualquer teste (como '...when selector undefined') o modifique.
    if (originalTabsListSelectorValue === undefined && 'tabsList' in CONFIG.selectors) {
        originalTabsListSelectorValue = CONFIG.selectors.tabsList;
    }
    // Restaura para o valor salvo, ou o valor atual de CONFIG se for a primeira vez.
    CONFIG.selectors.tabsList = originalTabsListSelectorValue || CONFIG.selectors.tabsList;


    mockDomService = {
      applyStyles: vi.fn(),
      query: vi.fn(),
      queryAll: vi.fn(),
      getTextSafely: vi.fn(),
      waitNextFrame: vi.fn().mockResolvedValue(undefined),
      getTextNodeAndOffsetAtCharIndex: vi.fn(),
      moveCursorToEnd: vi.fn(),
      createElementWithOptions: vi.fn(),
    } as Mocked<DomService>;

    // Resetar stores para um estado padrão conhecido
    globalExtensionEnabledStore.set(true);
    // Definir um estado padrão para todos os módulos relevantes.
    // Se outros módulos forem verificados por handleLayoutCorrection ou suas dependências, adicione-os.
    moduleStatesStore.set({ layoutCorrection: true /*, otherModuleDefaultState: true */ });
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Limpa spies e mocks.
    vi.useRealTimers();   // <<< Ponto crucial: Restaura timers reais
    
    // Restaura o valor original do seletor se ele foi salvo
    // Isso garante que CONFIG não permaneça alterado para outros describe blocks.
    if (originalTabsListSelectorValue !== undefined) {
        CONFIG.selectors.tabsList = originalTabsListSelectorValue;
    }
  });

  it('applies styles when global and module enabled and selector defined and element IS found', async () => {
    const moduleEnabled = get(moduleStatesStore)?.layoutCorrection ?? false;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;
    const currentTabsSelector = CONFIG.selectors.tabsList;

    expect(currentTabsSelector).toBeDefined(); // Guarda para a intenção do teste

    const mockTabsElement = document.createElement('div');
    mockDomService.query.mockReturnValue(mockTabsElement); // Elemento encontrado de primeira

    await handleLayoutCorrection(mockDomService, CONFIG, moduleEnabled, globalEnabled);
    // Não é necessário vi.runAllTimersAsync() porque o elemento é encontrado na primeira tentativa (sem retries com setTimeout)

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockTabsElement, {
      float: 'right',
      maxHeight: '72vh',
      overflowY: 'auto',
    });
  });

  it('resets styles when global disabled and element IS found', async () => {
    globalExtensionEnabledStore.set(false); // Global desabilitado

    const moduleEnabled = true; // Módulo pode ainda estar "habilitado" nas stores
    const globalIsEnabled = get(globalExtensionEnabledStore); // false
    const currentTabsSelector = CONFIG.selectors.tabsList;
    expect(currentTabsSelector).toBeDefined();

    const mockTabsElement = document.createElement('div');
    mockDomService.query.mockReturnValue(mockTabsElement); // Elemento encontrado

    await handleLayoutCorrection(mockDomService, CONFIG, moduleEnabled, globalIsEnabled);

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockTabsElement, { // Espera-se que aplique estilos "vazios"
      float: '',
      maxHeight: '',
      overflowY: '',
    });
  });

  it('does NOT call applyStyles when global disabled and element is NOT found (after retries)', async () => {
    globalExtensionEnabledStore.set(false);

    const moduleEnabled = true;
    const globalIsEnabled = get(globalExtensionEnabledStore); // false
    const currentTabsSelector = CONFIG.selectors.tabsList;
    expect(currentTabsSelector).toBeDefined();

    mockDomService.query.mockReturnValue(null); // Elemento NUNCA é encontrado
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = handleLayoutCorrection(mockDomService, CONFIG, moduleEnabled, globalIsEnabled);
    await vi.runAllTimersAsync(); // Processa TODOS os setTimeouts das retentativas
    await promise;

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    // A função query será chamada (MAX_LAYOUT_RETRIES (15) + 1) vezes
    expect(mockDomService.query).toHaveBeenCalledTimes(MAX_EXPECTED_QUERY_CALLS_ON_FAILURE);
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Element "${currentTabsSelector}" not found after ${15} retries.`)
    );
    consoleErrorSpy.mockRestore();
  });


  it('resets styles when module disabled and element IS found', async () => {
    moduleStatesStore.set({ layoutCorrection: false }); // Módulo desabilitado

    const moduleIsEnabled = get(moduleStatesStore)?.layoutCorrection ?? true; // false
    const globalEnabled = get(globalExtensionEnabledStore) ?? true; // true
    const currentTabsSelector = CONFIG.selectors.tabsList;
    expect(currentTabsSelector).toBeDefined();

    const mockTabsElement = document.createElement('div');
    mockDomService.query.mockReturnValue(mockTabsElement); // Elemento encontrado

    await handleLayoutCorrection(mockDomService, CONFIG, moduleIsEnabled, globalEnabled);

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockTabsElement, {
      float: '',
      maxHeight: '',
      overflowY: '',
    });
  });
  
  it('does NOT call applyStyles when module disabled and element is NOT found (after retries)', async () => {
    moduleStatesStore.set({ layoutCorrection: false }); // Módulo desabilitado

    const moduleIsEnabled = get(moduleStatesStore)?.layoutCorrection ?? true; // false
    const globalEnabled = get(globalExtensionEnabledStore) ?? true; // true
    const currentTabsSelector = CONFIG.selectors.tabsList;
    expect(currentTabsSelector).toBeDefined();

    mockDomService.query.mockReturnValue(null); // Elemento NUNCA é encontrado
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = handleLayoutCorrection(mockDomService, CONFIG, moduleIsEnabled, globalEnabled);
    await vi.runAllTimersAsync(); // Processa TODOS os setTimeouts das retentativas
    await promise;

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.query).toHaveBeenCalledTimes(MAX_EXPECTED_QUERY_CALLS_ON_FAILURE);
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Element "${currentTabsSelector}" not found after ${15} retries.`)
    );
    consoleErrorSpy.mockRestore();
  });


  it('does NOT call query or applyStyles and warns when selector undefined', async () => {
    CONFIG.selectors.tabsList = undefined; // Força o seletor a ser undefined

    const moduleEnabled = get(moduleStatesStore)?.layoutCorrection ?? true;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await handleLayoutCorrection(mockDomService, CONFIG, moduleEnabled, globalEnabled);

    expect(consoleWarnSpy).toHaveBeenCalledWith("Omni Max [ContentIndex]: tabsList selector is not defined in config. Cannot handle layout correction.");
    expect(mockDomService.query).not.toHaveBeenCalled();
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});

describe('initializeOmniMaxContentScript', () => {
  let attachShortSpy: ReturnType<typeof vi.spyOn>;
  let attachTempSpy: ReturnType<typeof vi.spyOn>;
  // OMNI_MAX_CONTENT_LOADED_FLAG é importada diretamente

  beforeEach(() => {
    attachShortSpy = vi.spyOn(ShortcutService.prototype, 'attachListeners').mockImplementation(() => {});
    attachTempSpy = vi.spyOn(TemplateHandlingService.prototype, 'attachListeners').mockImplementation(() => {});
    
    // Limpa a flag na window antes de cada teste neste describe
    delete (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG];
    
    // Adicionar mock para querySelector para evitar o warning do MutationObserver se ul#tabs não existir
    // Isso é mais relevante se initializeOmniMaxContentScript for complexo e interagir muito com o DOM.
    // Para os testes atuais, pode não ser estritamente necessário, mas é uma boa prática preventiva.
    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === 'ul#tabs') {
        return document.createElement('ul'); // Retorna um mock de ul#tabs
      }
      // Para outros seletores, você pode querer retornar null ou outros elementos mockados.
      return null;
    });
    vi.spyOn(document, 'querySelectorAll').mockReturnValue([] as any); // Mock querySelectorAll

     // Mockar stores se initializeOmniMaxContentScript depender delas diretamente na inicialização
     // Por exemplo, para handleLayoutCorrection e refreshSummaryButtonLogic que são chamadas.
    globalExtensionEnabledStore.set(true);
    moduleStatesStore.set({ layoutCorrection: true, aiChatSummary: true }); // Configuração default
    // aiFeaturesEnabledStore.set(true); // Se relevante
  });

  afterEach(() => {
    attachShortSpy.mockRestore();
    attachTempSpy.mockRestore();
    vi.restoreAllMocks(); // Isso restaurará o document.querySelector também.
  });

  it('initializes once and calls attachListeners', async () => { // Tornar async se houver promessas internas
    await initializeOmniMaxContentScript(); // Se houver async ops, aguarde-as
    expect((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]).toBe(true);
    expect(attachShortSpy).toHaveBeenCalled();
    expect(attachTempSpy).toHaveBeenCalled();
  });

  it('does NOT re-initialize if flag is set', async () => { // Tornar async
    (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;
    await initializeOmniMaxContentScript();
    expect(attachShortSpy).not.toHaveBeenCalled();
    expect(attachTempSpy).not.toHaveBeenCalled();
  });
});