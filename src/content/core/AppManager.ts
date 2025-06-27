import { get } from 'svelte/store';
import { globalExtensionEnabledStore, moduleStatesStore, aiFeaturesEnabledStore } from '../../storage/stores';
import { getActiveTabChatContext } from '../utils/context';
import { getConfig, type Config } from '../config';
import type { DomService } from '../services/DomService';
import type { ShortcutService } from '../services/ShortcutService';
import type { TemplateHandlingService } from '../services/TemplateHandlingService';
import type { AssistantUiService } from '../services/AssistantUiService';
import { ASSISTANT_BUTTON_CLASS } from '../services/AssistantUiService';

const MAX_LAYOUT_RETRIES = 15;
const LAYOUT_RETRY_DELAY = 300;

export class AppManager {
  private config: Config;

  constructor(
    private domService: DomService,
    private shortcutService: ShortcutService,
    private templateHandlingService: TemplateHandlingService,
    // ATUALIZADO: Apenas o serviço do assistente é necessário agora.
    private assistantUiService: AssistantUiService,
  ) {
    this.config = getConfig();
  }

  public run(): void {
    this.shortcutService.attachListeners();
    this.templateHandlingService.attachListeners();
    this.setupTabObserver();
    this.subscribeToSettingsChanges();
    console.log("Omni Max [AppManager]: Application started.");
  }

  private setupTabObserver(): void {
    const tabsUlElement = this.domService.query('ul#tabs');
    if (!tabsUlElement) {
        console.warn('Omni Max [AppManager]: Target ul#tabs for MutationObserver not found.');
        setTimeout(() => this.setupUiForActivePanel(), 1500); // Fallback
        return;
    }

    const tabObserver = new MutationObserver(async (mutationsList) => {
        for (const mutation of mutationsList) {
            // Se uma nova aba se tornou ativa, reavalie a UI.
            if (mutation.type === 'attributes' && mutation.attributeName === 'class' && (mutation.target as HTMLLIElement).classList.contains('active')) {
                setTimeout(() => this.setupUiForActivePanel(), 250);
                break; 
            }
        }
    });

    tabObserver.observe(tabsUlElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    // REMOVIDO: A lógica de limpar cache de resumo não é mais necessária.
    this.setupUiForActivePanel();
  }

  private subscribeToSettingsChanges(): void {
    const updateAll = () => {
      this.handleLayoutCorrection();
      this.setupUiForActivePanel();
    };

    globalExtensionEnabledStore.subscribe(updateAll);
    moduleStatesStore.subscribe(updateAll);
    aiFeaturesEnabledStore.subscribe(updateAll);
  }

  /**
   * Sets up UI elements for the active panel based on settings.
   */
  private setupUiForActivePanel = (): void => {
    const isGloballyEnabled = get(globalExtensionEnabledStore);
    const moduleStates = get(moduleStatesStore);
    const isAiFeaturesEnabled = get(aiFeaturesEnabledStore);
    const isAssistantEnabled = moduleStates?.aiAssistant;

    // Se a feature estiver desativada, remove o botão do assistente.
    if (!isGloballyEnabled || !isAiFeaturesEnabled || !isAssistantEnabled) {
      this.domService.queryAll<HTMLButtonElement>(`.${ASSISTANT_BUTTON_CLASS}`).forEach(btn => btn.remove());
      return;
    }

    const activeChatCtx = getActiveTabChatContext(this.domService);
    if (!activeChatCtx) return;

    const hsmButtonsContainer = this.findHsmButtonsContainer(activeChatCtx.attendanceId, activeChatCtx.contactId, activeChatCtx.panelElement);

    if (hsmButtonsContainer) {
      // A única lógica de UI de IA agora é injetar o botão do assistente.
      this.assistantUiService.injectAssistantButton(hsmButtonsContainer, activeChatCtx);
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
}