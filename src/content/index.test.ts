// src/content/index.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from 'svelte';
import { AppManager } from './core/AppManager';
import { initializeOmniMaxContentScript, OMNI_MAX_CONTENT_LOADED_FLAG } from './index';

// Mocks
vi.mock('svelte', () => ({
  mount: vi.fn(),
}));

vi.mock('./core/AppManager', () => {
  const AppManager = vi.fn();
  AppManager.prototype.run = vi.fn();
  return { AppManager };
});

vi.mock('../utils/language', () => ({
  getLocaleFromAgent: () => 'pt-BR',
}));

describe('initializeOmniMaxContentScript', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG];
    document.body.innerHTML = '';
  });

  it('should initialize services, mount UIs, and run AppManager', async () => {
    await initializeOmniMaxContentScript();

    // CORREÇÃO: Espera-se que `mount` seja chamado 2 vezes.
    // Uma para NotificationContainer e outra para SummaryPopup (via SummaryUiService).
    expect(mount).toHaveBeenCalledTimes(2); 

    const notificationHost = document.getElementById('omni-max-notification-host');
    expect(notificationHost).not.toBeNull();
    
    // Verifica se uma das chamadas foi para o container de notificação
    expect(mount).toHaveBeenCalledWith(expect.anything(), { target: notificationHost });
    
    expect(AppManager).toHaveBeenCalledOnce();
    const appManagerInstance = vi.mocked(AppManager).mock.instances[0];
    expect(appManagerInstance.run).toHaveBeenCalledOnce();

    expect((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]).toBe(true);
  });

  it('should NOT run initialization if the script has already been loaded', async () => {
    (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;
    await initializeOmniMaxContentScript();
    expect(mount).not.toHaveBeenCalled();
    expect(AppManager).not.toHaveBeenCalled();
  });
});