// src/content/index.test.ts
import {
  initializeOmniMaxContentScript,
  OMNI_MAX_CONTENT_LOADED_FLAG, // Importar a flag diretamente
  handleLayoutCorrection, // A função já estava sendo importada como 'handleLayoutCorrection'
} from './index';
import { CONFIG } from './config';
import { DomService } from './services/DomService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { vi, describe, it, beforeEach, afterEach, expect, type Mocked } from 'vitest'; // Adicionado Mocked type

import { get } from 'svelte/store';
import { globalExtensionEnabledStore, moduleStatesStore } from '../storage/stores';

// packageJson não é mais necessário aqui se a flag for importada
// import packageJson from '../../package.json';
// const version = packageJson.version;
// Não defina OMNI_MAX_CONTENT_LOADED_FLAG aqui, use a importada

describe('handleLayoutCorrection', () => {
  // Usar Mocked<DomService> para tipagem correta do mock
  let mockDomService: Mocked<DomService>;
  const originalTabsSelector = CONFIG.selectors.tabsList; // Renomeado para clareza

  beforeEach(() => {
    // Criar um mock completo para DomService para cada teste
    mockDomService = {
      applyStyles: vi.fn(),
      query: vi.fn(), // Adicionar outros métodos se handleLayoutCorrection os usar internamente
      queryAll: vi.fn(),
      getTextSafely: vi.fn(),
      waitNextFrame: vi.fn().mockResolvedValue(undefined),
      getTextNodeAndOffsetAtCharIndex: vi.fn(),
      moveCursorToEnd: vi.fn(),
      createElementWithOptions: vi.fn(),
    } as Mocked<DomService>;

    // Resetar stores para o estado padrão ANTES de cada teste no describe
    globalExtensionEnabledStore.set(true);
    moduleStatesStore.set({ layoutCorrection: true }); // Assegurar que o módulo específico está no estado esperado
  });

  afterEach(() => {
    // Restaurar o seletor original, importante se CONFIG for modificado diretamente
    // Idealmente, CONFIG não deve ser mutável. Se for, esta restauração é crucial.
    if (originalTabsSelector !== undefined) { // Verifica se originalTabsSelector tem um valor antes de atribuir
      CONFIG.selectors.tabsList = originalTabsSelector;
    } else {
      // Se originalTabsSelector for undefined, talvez seja melhor remover a propriedade
      // ou definir como undefined, dependendo da intenção original.
      // Por segurança, se for undefined, pode ser que não devesse ser restaurado ou o teste precisa de ajuste.
      delete CONFIG.selectors.tabsList; // Ou CONFIG.selectors.tabsList = undefined;
    }
    vi.restoreAllMocks(); // Limpa todos os mocks após cada teste
  });

  it('applies styles when global and module enabled and selector defined', async () => {
    const moduleEnabled = get(moduleStatesStore)?.layoutCorrection ?? false;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;

    // Configurar o mock para retornar um elemento quando '#tabs' for consultado
    const mockTabsElement = document.createElement('div'); // Pode ser qualquer HTMLElement mockado
    mockDomService.query.mockImplementation((selector: string) => {
      if (selector === originalTabsSelector) {
        return mockTabsElement;
      }
      return null;
    });

    await handleLayoutCorrection(mockDomService, CONFIG, moduleEnabled, globalEnabled);

    // Verificar se query foi chamado (a função de retry vai chamá-lo)
    expect(mockDomService.query).toHaveBeenCalledWith(originalTabsSelector);

    // Verificar se applyStyles foi chamado com o elemento mockado e os estilos corretos
    expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockTabsElement, {
      float: 'right',
      maxHeight: '72vh',
      overflowY: 'auto',
    });
  });

  it('does NOT apply styles when global disabled', async () => {
    globalExtensionEnabledStore.set(false); // Desabilita globalmente para este teste

    const moduleEnabled = get(moduleStatesStore)?.layoutCorrection ?? true; // Módulo ainda pode estar "true"
    const globalIsEnabled = get(globalExtensionEnabledStore); // Deve ser false

    await handleLayoutCorrection(mockDomService, CONFIG, moduleEnabled, globalIsEnabled);
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
  });

  it('does NOT apply styles when module disabled', async () => {
    moduleStatesStore.set({ layoutCorrection: false }); // Desabilita o módulo específico

    const moduleIsEnabled = get(moduleStatesStore)?.layoutCorrection ?? true; // Deve ser false
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;

    await handleLayoutCorrection(mockDomService, CONFIG, moduleIsEnabled, globalEnabled);
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
  });

  it('does NOT apply styles when selector undefined', async () => {
    CONFIG.selectors.tabsList = undefined;

    const moduleEnabled = get(moduleStatesStore)?.layoutCorrection ?? true;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;

    await handleLayoutCorrection(mockDomService, CONFIG, moduleEnabled, globalEnabled);
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
  });
});

describe('initializeOmniMaxContentScript', () => {
  let attachShortSpy: ReturnType<typeof vi.spyOn>;
  let attachTempSpy: ReturnType<typeof vi.spyOn>;
  // A flag OMNI_MAX_CONTENT_LOADED_FLAG é importada diretamente de './index'

  beforeEach(() => {
    // Spy on attachListeners of both services
    attachShortSpy = vi.spyOn(ShortcutService.prototype, 'attachListeners').mockImplementation(() => { });
    attachTempSpy = vi.spyOn(TemplateHandlingService.prototype, 'attachListeners').mockImplementation(() => { });
    delete (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG];
  });

  afterEach(() => {
    attachShortSpy.mockRestore();
    attachTempSpy.mockRestore();
  });

  it('initializes once and calls attachListeners', () => {
    initializeOmniMaxContentScript();
    expect((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]).toBe(true);
    expect(attachShortSpy).toHaveBeenCalled();
    expect(attachTempSpy).toHaveBeenCalled();
  });

  it('does NOT re-initialize if flag is set', () => {
    // @ts-expect-error Acessando a window global para o teste
    window[OMNI_MAX_CONTENT_LOADED_FLAG] = true;
    initializeOmniMaxContentScript();
    expect(attachShortSpy).not.toHaveBeenCalled();
    expect(attachTempSpy).not.toHaveBeenCalled();
  });
});