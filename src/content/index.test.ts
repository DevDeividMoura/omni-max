// src/content/index.test.ts
import {
  initializeOmniMaxContentScript,
  OMNI_MAX_CONTENT_LOADED_FLAG,
  handleLayoutCorrection,
} from './index';
import { getConfig, type Config } from './config'; // Changed import
import { DomService } from './services/DomService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { vi, describe, it, beforeEach, afterEach, expect, type Mocked } from 'vitest';

import { get } from 'svelte/store';
import { globalExtensionEnabledStore, moduleStatesStore } from '../storage/stores';

const MAX_EXPECTED_QUERY_CALLS_ON_FAILURE = 16;

describe('handleLayoutCorrection', () => {
  let mockDomService: Mocked<DomService>;
  let config: Config; // Declare config here
  let originalTabsListSelectorValue: string | undefined;

  beforeEach(() => {
    vi.useFakeTimers();

    config = getConfig(); // Get config for each test

    if (originalTabsListSelectorValue === undefined && 'tabsList' in config.selectors) {
        originalTabsListSelectorValue = config.selectors.tabsList;
    }
    config.selectors.tabsList = originalTabsListSelectorValue || config.selectors.tabsList;


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

    globalExtensionEnabledStore.set(true);
    moduleStatesStore.set({ layoutCorrection: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    
    if (originalTabsListSelectorValue !== undefined) {
        config.selectors.tabsList = originalTabsListSelectorValue;
    }
  });

  it('applies styles when global and module enabled and selector defined and element IS found', async () => {
    const moduleEnabled = get(moduleStatesStore)?.layoutCorrection ?? false;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;
    const currentTabsSelector = config.selectors.tabsList;

    expect(currentTabsSelector).toBeDefined();

    const mockTabsElement = document.createElement('div');
    mockDomService.query.mockReturnValue(mockTabsElement);

    await handleLayoutCorrection(mockDomService, config, moduleEnabled, globalEnabled);

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockTabsElement, {
      float: 'right',
      maxHeight: '72vh',
      overflowY: 'auto',
    });
  });

  it('resets styles when global disabled and element IS found', async () => {
    globalExtensionEnabledStore.set(false);

    const moduleEnabled = true;
    const globalIsEnabled = get(globalExtensionEnabledStore);
    const currentTabsSelector = config.selectors.tabsList;
    expect(currentTabsSelector).toBeDefined();

    const mockTabsElement = document.createElement('div');
    mockDomService.query.mockReturnValue(mockTabsElement);

    await handleLayoutCorrection(mockDomService, config, moduleEnabled, globalIsEnabled);

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockTabsElement, {
      float: '',
      maxHeight: '',
      overflowY: '',
    });
  });

  it('does NOT call applyStyles when global disabled and element is NOT found (after retries)', async () => {
    globalExtensionEnabledStore.set(false);

    const moduleEnabled = true;
    const globalIsEnabled = get(globalExtensionEnabledStore);
    const currentTabsSelector = config.selectors.tabsList!;
    expect(currentTabsSelector).toBeDefined();

    mockDomService.query.mockReturnValue(null);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = handleLayoutCorrection(mockDomService, config, moduleEnabled, globalIsEnabled);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.query).toHaveBeenCalledTimes(MAX_EXPECTED_QUERY_CALLS_ON_FAILURE);
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Element "${currentTabsSelector}" not found after 15 retries.`)
    );
    consoleErrorSpy.mockRestore();
  });


  it('resets styles when module disabled and element IS found', async () => {
    moduleStatesStore.set({ layoutCorrection: false });

    const moduleIsEnabled = get(moduleStatesStore)?.layoutCorrection ?? true;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;
    const currentTabsSelector = config.selectors.tabsList;
    expect(currentTabsSelector).toBeDefined();

    const mockTabsElement = document.createElement('div');
    mockDomService.query.mockReturnValue(mockTabsElement);

    await handleLayoutCorrection(mockDomService, config, moduleIsEnabled, globalEnabled);

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.applyStyles).toHaveBeenCalledWith(mockTabsElement, {
      float: '',
      maxHeight: '',
      overflowY: '',
    });
  });
  
  it('does NOT call applyStyles when module disabled and element is NOT found (after retries)', async () => {
    moduleStatesStore.set({ layoutCorrection: false });

    const moduleIsEnabled = get(moduleStatesStore)?.layoutCorrection ?? true;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;
    const currentTabsSelector = config.selectors.tabsList!;
    expect(currentTabsSelector).toBeDefined();

    mockDomService.query.mockReturnValue(null);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const promise = handleLayoutCorrection(mockDomService, config, moduleIsEnabled, globalEnabled);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockDomService.query).toHaveBeenCalledWith(currentTabsSelector);
    expect(mockDomService.query).toHaveBeenCalledTimes(MAX_EXPECTED_QUERY_CALLS_ON_FAILURE);
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Element "${currentTabsSelector}" not found after 15 retries.`)
    );
    consoleErrorSpy.mockRestore();
  });


  it('does NOT call query or applyStyles and warns when selector undefined', async () => {
    config.selectors.tabsList = undefined; // Force selector to be undefined

    const moduleEnabled = get(moduleStatesStore)?.layoutCorrection ?? true;
    const globalEnabled = get(globalExtensionEnabledStore) ?? true;
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await handleLayoutCorrection(mockDomService, config, moduleEnabled, globalEnabled);

    expect(consoleWarnSpy).toHaveBeenCalledWith("Omni Max [ContentIndex]: tabsList selector is not defined in config. Cannot handle layout correction.");
    expect(mockDomService.query).not.toHaveBeenCalled();
    expect(mockDomService.applyStyles).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});

describe('initializeOmniMaxContentScript', () => {
  let attachShortSpy: ReturnType<typeof vi.spyOn>;
  let attachTempSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    attachShortSpy = vi.spyOn(ShortcutService.prototype, 'attachListeners').mockImplementation(() => {});
    attachTempSpy = vi.spyOn(TemplateHandlingService.prototype, 'attachListeners').mockImplementation(() => {});
    
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