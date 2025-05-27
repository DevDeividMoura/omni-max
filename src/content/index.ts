/**
 * src/content/index.ts
 * Main entry point for the Omni Max content scripts.
 * This script is injected into pages matching the patterns defined in the manifest.
 * It initializes and configures all necessary services and event listeners
 * for the extension's in-page functionalities.
 */
import { CONFIG } from './config';
import { DomService } from './services/DomService';
import { ClipboardService } from './services/ClipboardService';
import { NotificationService } from './services/NotificationService';
import { ExtractionService } from './services/ExtractionService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandleService';

import packageJson from '../../package.json';

const version = packageJson.version;
const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${version}`;

/**
 * Initializes the Omni Max content script on the current page.
 * Sets up services, attaches event listeners, and applies conditional
 * functionalities based on user settings.
 * Prevents multiple initializations on the same page, which can occur
 * with HMR (Hot Module Replacement) or if the script is injected multiple times.
 */
function initializeOmniMaxContentScript(): void {
  if ((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]) {
    console.log(`Omni Max: Content script v${version} already initialized on this page.`);
    return;
  }
  (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;

  console.log(`Omni Max: Content Script v${version} - Initializing...`);

  // Instantiate core services (Dependency Injection)
  const domService = new DomService();
  const clipboardService = new ClipboardService();
  const notificationService = new NotificationService();
  const extractionService = new ExtractionService(CONFIG, domService);

  // Initialize feature-specific services and attach their listeners
  // These services will internally check their respective module enablement states.
  const shortcutService = new ShortcutService(extractionService, clipboardService, notificationService);
  shortcutService.attachListeners();

  const templateHandlingService = new TemplateHandlingService(CONFIG, domService);
  templateHandlingService.attachListeners();

  // Apply layout correction conditionally based on settings
  // This specific logic remains here as it's a direct DOM manipulation at startup,
  // not tied to a continuous event listener like shortcuts or template handling.
  chrome.storage.sync.get(['omniMaxGlobalEnabled', 'omniMaxModuleStates'], (settings) => {
    const isGlobalEnabled = settings.omniMaxGlobalEnabled !== false; // Default true
    const moduleStates = settings.omniMaxModuleStates || {};
    const isLayoutCorrectionEnabled = moduleStates['layoutCorrection'] !== false; // Default true

    if (isGlobalEnabled && isLayoutCorrectionEnabled && CONFIG.selectors.tabsList) {
      console.log("Omni Max: Applying layout correction.");
      domService.applyStyles(CONFIG.selectors.tabsList, {
        float: 'right',
        maxHeight: '72vh',
        overflowY: 'auto'
      });
    }
  });

  console.log(`Omni Max: Content Script v${version} - Ready!`);
}

// Ensure the script runs after the DOM is fully loaded or interactively ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOmniMaxContentScript);
} else {
  initializeOmniMaxContentScript();
}