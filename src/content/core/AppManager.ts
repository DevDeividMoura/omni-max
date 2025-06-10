// src/content/core/AppManager.ts
import { get } from 'svelte/store';
import { globalExtensionEnabledStore, moduleStatesStore, aiFeaturesEnabledStore } from '../../storage/stores';
import { getActiveTabChatContext } from '../utils/context';
import { getConfig, type Config } from '../config';
import type { DomService } from '../services/DomService';
import type { ShortcutService } from '../services/ShortcutService';
import type { SummaryCacheService } from '../services/SummaryCacheService';
import type { SummaryUiService } from '../services/SummaryUiService';
import { SUMMARY_BUTTON_CLASS } from '../services/SummaryUiService';
import type { TemplateHandlingService } from '../services/TemplateHandlingService';

const MAX_LAYOUT_RETRIES = 15;
const LAYOUT_RETRY_DELAY = 300;

export class AppManager {
  private config: Config;

  constructor(
    private domService: DomService,
    private shortcutService: ShortcutService,
    private templateHandlingService: TemplateHandlingService,
    private summaryUiService: SummaryUiService,
    private summaryCacheService: SummaryCacheService,
  ) {
    this.config = getConfig();
  }

  /**
   * Starts the application logic, setting up listeners and observers.
   */
  public run(): void {
    this.shortcutService.attachListeners();
    this.templateHandlingService.attachListeners();
    this.setupTabObserver();
    this.subscribeToSettingsChanges();
    console.log("Omni Max [AppManager]: Application started.");
  }

  /**
   * Sets up a MutationObserver to watch for changes in the chat tabs.
   */
  private setupTabObserver(): void {
    const tabsUlElement = this.domService.query('ul#tabs');
    if (!tabsUlElement) {
      console.warn('Omni Max [AppManager]: Target ul#tabs for MutationObserver not found.');
      setTimeout(() => this.setupSummaryButtonForActivePanel(), 1500); // Fallback
      return;
    }

    const tabObserver = new MutationObserver(async (mutationsList) => {
      let needsButtonSetup = false;
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class' && mutation.target.nodeName === 'LI' && (mutation.target as HTMLLIElement).classList.contains('active')) {
          needsButtonSetup = true;
        }
        if (mutation.type === 'childList') {
          this.handleTabClose(mutation);
        }
      }
      if (needsButtonSetup) {
        setTimeout(() => this.setupSummaryButtonForActivePanel(), 250);
      }
    });

    tabObserver.observe(tabsUlElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    // Initial setup
    this.setupSummaryButtonForActivePanel();
    this.clearAllInvalidSummaries();
  }

  /**
   * Subscribes to changes in the extension's settings stores to keep the UI in sync.
   */
  private subscribeToSettingsChanges(): void {
    const updateAll = () => {
      this.handleLayoutCorrection();
      this.setupSummaryButtonForActivePanel();
    };

    globalExtensionEnabledStore.subscribe(updateAll);
    moduleStatesStore.subscribe(updateAll);
    aiFeaturesEnabledStore.subscribe(updateAll);
  }

  /**
   * Injects or removes the summary button based on current settings and context.
   */
  private setupSummaryButtonForActivePanel = (): void => {
    const isGloballyEnabled = get(globalExtensionEnabledStore);
    const isAiFeaturesEnabled = get(aiFeaturesEnabledStore);
    const moduleStates = get(moduleStatesStore);
    const isChatSummaryEnabled = moduleStates?.aiChatSummary;

    if (!isGloballyEnabled || !isAiFeaturesEnabled || !isChatSummaryEnabled) {
      this.domService.queryAll<HTMLButtonElement>(`.${SUMMARY_BUTTON_CLASS}`).forEach(btn => btn.remove());
      return;
    }

    const activeChatCtx = getActiveTabChatContext(this.domService);
    if (!activeChatCtx) return;

    const hsmButtonsContainer = this.findHsmButtonsContainer(activeChatCtx.attendanceId, activeChatCtx.contactId, activeChatCtx.panelElement);

    if (hsmButtonsContainer) {
      this.summaryUiService.injectSummaryButton(hsmButtonsContainer, activeChatCtx.protocolNumber, activeChatCtx.contactId);
    }
  };
  
  /**
   * Encapsulates the logic to find the correct `div.hsm_buttons`.
   */
  private findHsmButtonsContainer(attendanceId: string, contactId: string, panelElement?: HTMLElement): HTMLDivElement | null {
      if (panelElement) {
        const container = this.domService.query<HTMLDivElement>('div.hsm_buttons', panelElement);
        if (container) return container;
      }
      // Fallback strategies
      const allHsmButtonDivs = this.domService.queryAll<HTMLDivElement>('div.hsm_buttons');
      for (const div of allHsmButtonDivs) {
          const matchingLink = this.domService.query<HTMLAnchorElement>(`a[data-atendimento="${attendanceId}"][data-contato="${contactId}"]`, div);
          if (matchingLink) return div;
      }
      const genericActivePanel = this.domService.query<HTMLElement>('div.tab-pane.active');
      return genericActivePanel ? this.domService.query<HTMLDivElement>('div.hsm_buttons', genericActivePanel) : null;
  }

  /**
   * Applies or removes layout correction styles based on settings.
   */
  private async handleLayoutCorrection(): Promise<void> {
    const isGloballyEnabled = get(globalExtensionEnabledStore);
    const isModuleEnabled = get(moduleStatesStore)?.layoutCorrection;
    const tabsListSelector = this.config.selectors?.tabsList;
    if (!tabsListSelector) return;

    const stylesToApply = (isGloballyEnabled && isModuleEnabled)
      ? { float: 'right', maxHeight: '72vh', overflowY: 'auto' }
      : { float: '', maxHeight: '', overflowY: '' };

    await this.applyStylesWithRetry(tabsListSelector, stylesToApply);
  }
  
  /**
   * Helper function to apply styles with a retry mechanism.
   */
  private async applyStylesWithRetry(selector: string, styles: Partial<CSSStyleDeclaration>, retries = MAX_LAYOUT_RETRIES): Promise<boolean> {
      const element = this.domService.query(selector);
      if (element) {
          this.domService.applyStyles(element, styles);
          return true;
      }
      if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, LAYOUT_RETRY_DELAY));
          return this.applyStylesWithRetry(selector, styles, retries - 1);
      }
      console.error(`Omni Max [AppManager]: Element "${selector}" not found after retries.`);
      return false;
  }

  /**
   * Handles cache cleaning when a tab is closed.
   */
  private handleTabClose(mutation: MutationRecord): void {
      mutation.removedNodes.forEach(removedNode => {
          if (removedNode.nodeName === 'LI' && removedNode instanceof HTMLLIElement) {
              const linkElement = this.domService.query<HTMLAnchorElement>('a', removedNode);
              const protocolNumberToRemove = linkElement?.dataset.protocolo;
              if (protocolNumberToRemove) {
                  // Delay to ensure the tab is fully gone before checking
                  setTimeout(() => this.clearAllInvalidSummaries(), 7000);
              }
          }
      });
  }

  /**
   * Clears all summaries from cache that do not correspond to an open tab.
   */
  private async clearAllInvalidSummaries(): Promise<void> {
      const currentActiveTabElements = this.domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
      const currentActiveProtocolNumbers = currentActiveTabElements
          .map(tab => tab.dataset.protocolo)
          .filter(p => !!p) as string[];
      await this.summaryCacheService.clearInvalidSummaries(currentActiveProtocolNumbers);
  }
}