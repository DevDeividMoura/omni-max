// src/content/index.test.ts
import { applyLayoutCorrection, initializeOmniMaxContentScript } from './index';
import { CONFIG } from './config';
import { DomService } from './services/DomService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

import { get } from 'svelte/store';
import { globalExtensionEnabledStore, moduleStatesStore } from '../storage/stores';

import packageJson from '../../package.json';

const version = packageJson.version;
const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${version}`;

describe('applyLayoutCorrection', () => {
  let mockDom: DomService;
  const originalTabs = CONFIG.selectors.tabsList;

  beforeEach(() => {
    mockDom = { applyStyles: vi.fn() } as any;
    // reset stores
    globalExtensionEnabledStore.set(true)
    moduleStatesStore.set({ layoutCorrection: true })
    
  });

  afterEach(() => {
    CONFIG.selectors.tabsList = originalTabs;
  });

  it('applies styles when global and module enabled and selector defined', async () => {
    await applyLayoutCorrection(mockDom, CONFIG);
    expect(mockDom.applyStyles).toHaveBeenCalledWith(originalTabs!, {
      float: 'right',
      maxHeight: '72vh',
      overflowY: 'auto',
    });
  });

  it('does NOT apply when global disabled', async () => {
    globalExtensionEnabledStore.set(false)

    await applyLayoutCorrection(mockDom, CONFIG);
    expect(mockDom.applyStyles).not.toHaveBeenCalled();
  });

  it('does NOT apply when module disabled', async () => {
    moduleStatesStore.set({ layoutCorrection: false })
    await applyLayoutCorrection(mockDom, CONFIG);
    expect(mockDom.applyStyles).not.toHaveBeenCalled();
  });

  it('does NOT apply when selector undefined', async () => {
    CONFIG.selectors.tabsList = undefined!;
    await applyLayoutCorrection(mockDom, CONFIG);
    expect(mockDom.applyStyles).not.toHaveBeenCalled();
  });
});

describe('initializeOmniMaxContentScript', () => {
  let attachShortSpy: ReturnType<typeof vi.spyOn>;
  let attachTempSpy: ReturnType<typeof vi.spyOn>;
  const flag = OMNI_MAX_CONTENT_LOADED_FLAG;

  beforeEach(() => {
    // Spy on attachListeners of both services
    attachShortSpy = vi.spyOn(ShortcutService.prototype, 'attachListeners').mockImplementation(() => {});
    attachTempSpy = vi.spyOn(TemplateHandlingService.prototype, 'attachListeners').mockImplementation(() => {});
    delete (window as any)[flag];
  });

  afterEach(() => {
    attachShortSpy.mockRestore();
    attachTempSpy.mockRestore();
  });

  it('initializes once and calls attachListeners', () => {
    initializeOmniMaxContentScript();
    expect((window as any)[flag]).toBe(true);
    expect(attachShortSpy).toHaveBeenCalled();
    expect(attachTempSpy).toHaveBeenCalled();
  });

  it('does NOT re-initialize if flag is set', () => {
    (window as any)[flag] = true;
    initializeOmniMaxContentScript();
    expect(attachShortSpy).not.toHaveBeenCalled();
    expect(attachTempSpy).not.toHaveBeenCalled();
  });
});
