// src/content/index.test.ts
import {
  initializeOmniMaxContentScript,
  OMNI_MAX_CONTENT_LOADED_FLAG
} from './index';
// A importação de 'handleLayoutCorrection' foi removida.
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

import { globalExtensionEnabledStore, moduleStatesStore } from '../storage/stores';

// O describe block para 'handleLayoutCorrection' foi totalmente removido.

describe('initializeOmniMaxContentScript', () => {
  let attachShortSpy: ReturnType<typeof vi.spyOn>;
  let attachTempSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    attachShortSpy = vi.spyOn(ShortcutService.prototype, 'attachListeners').mockImplementation(() => { });
    attachTempSpy = vi.spyOn(TemplateHandlingService.prototype, 'attachListeners').mockImplementation(() => { });

    delete (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG];

    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === 'ul#tabs') {
        return document.createElement('ul');
      }
      return null;
    });
    vi.spyOn(document, 'querySelectorAll').mockReturnValue([] as any);

    globalExtensionEnabledStore.set(true);
    moduleStatesStore.set({ layoutCorrection: true, aiChatSummary: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes once and calls attachListeners', async () => {
    await initializeOmniMaxContentScript();
    expect((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]).toBe(true);
    // Estes testes garantem que o AppManager está rodando e chamando os listeners,
    // que é o comportamento esperado do script de inicialização.
    expect(attachShortSpy).toHaveBeenCalled();
    expect(attachTempSpy).toHaveBeenCalled();
  });

  it('does NOT re-initialize if flag is set', async () => {
    (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;
    await initializeOmniMaxContentScript();
    expect(attachShortSpy).not.toHaveBeenCalled();
    expect(attachTempSpy).not.toHaveBeenCalled();
  });
});