// src/content/index.ts
/**
 * @file src/content/index.ts
 * @description Main entry point for the Omni Max content script.
 * Initializes all services, applies layout corrections, sets up UI elements like the
 * summary button, and observes DOM changes to maintain functionality within the
 * target platform (Matrix Go).
 */
import { CONFIG, type Config } from './config';
import { DomService } from './services/DomService';
import { ClipboardService } from './services/ClipboardService';
import { NotificationService } from './services/NotificationService';
import { ExtractionService } from './services/ExtractionService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';

import { AIServiceManager } from '../ai/AIServiceManager';
import { MatrixApiService } from './services/MatrixApiService';
import { SummaryCacheService } from './services/SummaryCacheService';
import { SummaryUiService, SUMMARY_BUTTON_CLASS } from './services/SummaryUiService';
import { defaultStorageAdapter } from '../storage/IStorageAdapter';
import type { ActiveChatContext } from './types';

import { globalExtensionEnabledStore, moduleStatesStore, aiFeaturesEnabledStore } from '../storage/stores';
import { get } from 'svelte/store';

import packageJson from '../../package.json';

const extensionVersion = packageJson.version;
/** Flag to prevent multiple initializations of this content script version. */
const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${extensionVersion}_summaryFeature`;

/**
 * Applies layout corrections to the target platform's UI based on extension settings.
 * @param {DomService} domService - Instance of DomService for DOM manipulations.
 * @param {Config} config - The application configuration object containing selectors.
 * @public
 */
export async function applyLayoutCorrection(domService: DomService, config: Config): Promise<void> {
  const isGloballyEnabled = get(globalExtensionEnabledStore) !== false;
  const currentModuleStates = get(moduleStatesStore);
  const isLayoutModuleEnabled = currentModuleStates?.layoutCorrection !== false;
  const tabsListSelector = config.selectors?.tabsList;

  if (isGloballyEnabled && isLayoutModuleEnabled && tabsListSelector) {
    domService.applyStyles(tabsListSelector, {
      float: 'right',
      maxHeight: '72vh',
      overflowY: 'auto'
    });
    console.log(`Omni Max [ContentIndex]: Layout correction applied to "${tabsListSelector}".`);
  }
}

/**
 * Identifies the active chat context (protocol number, attendance ID, contact ID, and panel element)
 * by querying the active navigation tab in the Matrix Go UI.
 * @param {DomService} domService - Instance of DomService for DOM querying.
 * @returns {ActiveChatContext | null} The active chat context, or null if not determinable.
 * @private
 */
function getActiveTabChatContext(domService: DomService): ActiveChatContext | null {
  const activeTabLinkElement = domService.query<HTMLAnchorElement>('ul#tabs li.active a');
  if (activeTabLinkElement) {
    // Attribute names like 'data-protocolo' are from the target page's HTML.
    const protocolNumber = activeTabLinkElement.dataset.protocolo;
    const attendanceId = activeTabLinkElement.dataset.atendimento; // HTML uses data-atendimento
    const contactId = activeTabLinkElement.dataset.contato;     // HTML uses data-contato
    
    // Attempt to find the corresponding panel element.
    const panelElement = attendanceId ? domService.query<HTMLElement>(`#aba_${attendanceId}`) : null;

    if (protocolNumber && attendanceId && contactId) {
      return {
        protocolNumber,
        attendanceId,
        contactId,
        panelElement: panelElement || undefined // Ensure panelElement is explicitly undefined if null
      };
    }
  }
  // console.warn("Omni Max [ContentIndex]: Active chat context could not be determined from tabs.");
  return null;
}

/**
 * Initializes the Omni Max content script.
 * Sets up all services, observers, and initial UI modifications.
 * Prevents multiple initializations.
 * @public
 * @async
 */
export async function initializeOmniMaxContentScript(): Promise<void> {
  if ((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]) {
    console.log(`Omni Max: Content script v${extensionVersion} (with summary feature) already initialized.`);
    return;
  }
  (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;

  console.log(`Omni Max: Content Script v${extensionVersion} (with summary feature) - Initializing...`);

  // Instantiate core services
  const domService = new DomService();
  const clipboardService = new ClipboardService();
  const notificationService = new NotificationService(domService); // Assuming NotificationService takes DomService
  const extractionService = new ExtractionService(CONFIG, domService);
  const shortcutService = new ShortcutService(extractionService, clipboardService, notificationService);
  const templateHandlingService = new TemplateHandlingService(CONFIG, domService);
  
  // Instantiate services for the summary functionality
  const aiManager = new AIServiceManager();
  const matrixApiService = new MatrixApiService();
  const summaryCacheService = new SummaryCacheService(defaultStorageAdapter);

  const summaryUiService = new SummaryUiService(
    domService,
    aiManager,
    matrixApiService,
    summaryCacheService,
    () => getActiveTabChatContext(domService) // Pass callback to get active context
  );

  /**
   * Sets up (injects or removes) the summary button for the currently active chat panel
   * based on the extension's global and module-specific enablement states.
   * It attempts to find the correct DOM location for the button using several fallback strategies.
   * @private
   */
  const setupSummaryButtonForActivePanel = (): void => {
    const isGloballyEnabled = get(globalExtensionEnabledStore) !== false;
    const isAiFeaturesOverallEnabled = get(aiFeaturesEnabledStore) !== false;
    const currentModuleStates = get(moduleStatesStore);
    const isChatSummaryModuleEnabled = currentModuleStates?.aiChatSummary !== false;

    if (!isGloballyEnabled || !isAiFeaturesOverallEnabled || !isChatSummaryModuleEnabled) {
      // console.log("Omni Max [ContentIndex]: AI summary feature is disabled in settings. Removing button if present.");
      // If feature is disabled, remove any existing summary buttons.
      const existingButtons = domService.queryAll<HTMLButtonElement>(`.${SUMMARY_BUTTON_CLASS}`);
      existingButtons.forEach(btn => btn.remove());
      return;
    }
    
    const activeChatCtx = getActiveTabChatContext(domService);
    // Ensure a valid context with protocol number and contact ID is found.
    // Attendance ID is also crucial for some DOM targeting logic.
    if (!activeChatCtx || !activeChatCtx.protocolNumber || !activeChatCtx.contactId || !activeChatCtx.attendanceId) {
        // console.warn("Omni Max [ContentIndex]: Insufficient active chat context to set up summary button.");
        return;
    }

    // Attempt to find the `div.hsm_buttons` container for the button.
    let hsmButtonsContainer: HTMLDivElement | null = null;

    // 1. Try finding within the identified active panel element.
    if (activeChatCtx.panelElement) {
      hsmButtonsContainer = domService.query<HTMLDivElement>('div.hsm_buttons', activeChatCtx.panelElement);
    }
    
    // 2. Fallback: Try finding based on data attributes of links within any hsm_buttons div.
    // This is more fragile but can work if panelElement isn't reliably found or structured.
    if (!hsmButtonsContainer) {
      const allHsmButtonDivs = domService.queryAll<HTMLDivElement>('div.hsm_buttons');
      for (const div of allHsmButtonDivs) {
        // Check if this div contains a link matching the active context's IDs
        const matchingLink = domService.query<HTMLAnchorElement>(
            `a[data-atendimento="${activeChatCtx.attendanceId}"][data-contato="${activeChatCtx.contactId}"]`,
            div
        );
        if (matchingLink) {
            hsmButtonsContainer = div;
            break;
        }
      }
    }
    
    // 3. Broader Fallback: Look for hsm_buttons within any 'active' tab pane.
    if (!hsmButtonsContainer) {
      const genericActivePanel = domService.query<HTMLElement>('div.tab-pane.active');
      if (genericActivePanel) {
        hsmButtonsContainer = domService.query<HTMLDivElement>('div.hsm_buttons', genericActivePanel);
      }
    }

    if (hsmButtonsContainer) {
      summaryUiService.injectSummaryButton(
        hsmButtonsContainer,
        activeChatCtx.protocolNumber,
        activeChatCtx.contactId
      );
    } else {
      console.warn(`Omni Max [ContentIndex]: Could not find 'div.hsm_buttons' for active panel (protocol: ${activeChatCtx.protocolNumber}). Summary button not injected.`);
    }
  };

  // --- MutationObserver for Tab Changes and Content Updates ---
  // This observer watches for changes in the active tab (to re-inject button)
  // and for tab removals (to clear associated summaries from cache).
  const tabsUlElement = domService.query('ul#tabs');
  if (tabsUlElement) {
    console.log('Omni Max [ContentIndex]: Setting up MutationObserver for ul#tabs.');
    const tabObserver = new MutationObserver(async (mutationsList) => {
      let needsButtonSetup = false;
      let activeProtocolsChanged = false;

      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class' &&
            mutation.target.nodeName === 'LI' && (mutation.target as HTMLLIElement).classList.contains('active')) {
          // console.log("Omni Max [ContentIndex]: Chat tab became active (observed).");
          needsButtonSetup = true;
          activeProtocolsChanged = true; // Change in active tab usually means protocols list might need re-evaluation for cache cleanup
        }
        if (mutation.type === 'childList') {
          activeProtocolsChanged = true; // Tab added or removed, re-evaluate active protocols
          mutation.removedNodes.forEach(async removedNode => {
            if (removedNode.nodeName === 'LI' && removedNode instanceof HTMLLIElement) {
              const linkElement = domService.query<HTMLAnchorElement>('a', removedNode);
              const protocolNumberToRemove = linkElement?.dataset.protocolo;
              if (protocolNumberToRemove) {
                // console.log(`Omni Max [ContentIndex]: Tab removed for protocol ${protocolNumberToRemove}. Scheduling summary cache removal.`);
                // Delay removal slightly to handle UI flickers or rapid tab closing/opening.
                setTimeout(async () => {
                  const currentActiveTabElements = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
                  const currentActiveProtocolNumbers = currentActiveTabElements
                    .map(tab => tab.dataset.protocolo)
                    .filter(Boolean) as string[];
                  // Only remove from cache if it's truly no longer an active tab.
                  if (!currentActiveProtocolNumbers.includes(protocolNumberToRemove)) {
                    await summaryCacheService.removeSummary(protocolNumberToRemove);
                  }
                }, 7000); // 7-second delay
              }
            }
          });
        }
      }

      if (needsButtonSetup) {
        // Short delay to ensure the tab panel content is likely rendered.
        setTimeout(setupSummaryButtonForActivePanel, 250);
      }
      if (activeProtocolsChanged) {
        const currentActiveTabElements = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
        const currentActiveProtocolNumbers = currentActiveTabElements
          .map(tab => tab.dataset.protocolo)
          .filter(p => !!p) as string[]; // Ensure only defined protocol numbers
        await summaryCacheService.clearInvalidSummaries(currentActiveProtocolNumbers);
      }
    });
    tabObserver.observe(tabsUlElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    
    // Initial setup actions after observer is ready
    setTimeout(setupSummaryButtonForActivePanel, 1500); // Initial delay for page UI to settle
    
    const initialActiveTabElements = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
    const initialActiveProtocolNumbers = initialActiveTabElements
      .map(tab => tab.dataset.protocolo)
      .filter(p => !!p) as string[];
    await summaryCacheService.clearInvalidSummaries(initialActiveProtocolNumbers);

  } else {
    console.error('Omni Max [ContentIndex]: Target ul#tabs for MutationObserver not found.');
  }
  
  // Attach listeners for other services
  shortcutService.attachListeners();
  templateHandlingService.attachListeners();
  
  // Apply layout corrections
  applyLayoutCorrection(domService, CONFIG)
    // .then(() => console.log(`Omni Max [ContentIndex]: Layout correction attempt finished.`)) // Less verbose
    .catch(err => console.error(`Omni Max [ContentIndex]: Layout correction process failed:`, err));
  
  console.log(`Omni Max [ContentIndex]: Content script v${extensionVersion} (with summary feature) is ready.`);
}

// --- Script Auto-Execution ---
// Ensures the script runs after the DOM is sufficiently loaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOmniMaxContentScript);
} else {
  initializeOmniMaxContentScript();
}