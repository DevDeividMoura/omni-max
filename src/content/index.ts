/**
 * src/content/index.ts
 * Main entry point for the Omni Max content scripts.
 * This script is injected into pages matching the patterns defined in the manifest.
 * It initializes and configures all necessary services and event listeners
 * for the extension's in-page functionalities.
 */
import { CONFIG, type Config } from './config';
import { DomService } from './services/DomService';
import { ClipboardService } from './services/ClipboardService';
import { NotificationService } from './services/NotificationService';
import { ExtractionService } from './services/ExtractionService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { AIServiceManager } from '../ai/AIServiceManager';

import { get } from 'svelte/store';
import { defaultStorageAdapter } from '../storage/IStorageAdapter';
import { globalExtensionEnabledStore, moduleStatesStore } from '../storage/stores';

import packageJson from '../../package.json';

const version = packageJson.version;
const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${version}`;

export async function applyLayoutCorrection(domService: DomService, config: Config) {
  // 1) Leia do storage o valor efetivamente salvo (pode ser undefined)
  const savedGlobal = await defaultStorageAdapter.get<boolean>('omniMaxGlobalEnabled');
  const savedModules = await defaultStorageAdapter.get<Record<string, boolean>>('omniMaxModuleStates');

  // 2) Use esses valores, com fallback ao store em memória
  const isGlobal = savedGlobal !== undefined
    ? savedGlobal
    : get(globalExtensionEnabledStore);

  const moduleStates = savedModules !== undefined
    ? savedModules
    : get(moduleStatesStore);

  const isLayoutEnabled = moduleStates.layoutCorrection !== false;
  const tabsSel = config.selectors?.tabsList;

  if (isGlobal && isLayoutEnabled && tabsSel) {
    domService.applyStyles(tabsSel, {
      float: 'right',
      maxHeight: '72vh',
      overflowY: 'auto'
    });
  }
}


/**
 * Initializes the Omni Max content script on the current page.
 * Sets up services, attaches event listeners, and applies conditional
 * functionalities based on user settings.
 * Prevents multiple initializations on the same page, which can occur
 * with HMR (Hot Module Replacement) or if the script is injected multiple times.
 */
export function initializeOmniMaxContentScript(): void {
  if ((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]) {
    console.log(`Omni Max: Content script v${version} already initialized on this page.`);
    return;
  }
  (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;

  console.log(`Omni Max: Content Script v${version} - Initializing...`);

  const domService = new DomService();
  const clipboardService = new ClipboardService();
  const notificationService = new NotificationService(domService);
  const extractionService = new ExtractionService(CONFIG, domService);

  // Expose aiManager on window for debugging/testing
  (window as any).omniMaxAiManager = AIServiceManager;

  const shortcutService = new ShortcutService(extractionService, clipboardService, notificationService);
  shortcutService.attachListeners();

  const templateHandlingService = new TemplateHandlingService(CONFIG, domService);
  templateHandlingService.attachListeners();

   // Apply layout correction as part of initialization
  applyLayoutCorrection(domService, CONFIG)
    .then(() => console.log(`Omni Max: Layout correction applied.`))
    .catch(err => console.error(`Omni Max: Layout correction error:`, err));

  console.log(`Omni Max: Content Script v${version} - Ready!`);
}

// auto-run based on readyState
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOmniMaxContentScript);
} else {
  initializeOmniMaxContentScript();
}
