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

import { globalExtensionEnabledStore, moduleStatesStore, aiFeaturesEnabledStore, selectedLocaleStore } from '../storage/stores';
import { get } from 'svelte/store';

import packageJson from '../../package.json';

const extensionVersion = packageJson.version;
export const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${extensionVersion}_layoutFix`;

const MAX_LAYOUT_RETRIES = 15; // Aumentado para mais chances em páginas lentas
const LAYOUT_RETRY_DELAY = 300; // ms entre tentativas

/**
 * @function getLocaleFromAgent
 * @description Detects language from `window.langAgent` if available.
 * @returns {string | null} The detected locale code or null.
 */
function getLocaleFromAgent(): string {
    const defaultLocale = 'pt-BR'; // Fallback default locale
    const raw = typeof window !== 'undefined' ? (window as any).langAgent : defaultLocale;
    if (typeof raw !== 'string') return defaultLocale;

    const lang = raw.toLowerCase();

    const mappings: [string, string][] = [
        ['pt-br', 'pt-BR'],
        ['pt-pt', 'pt-PT'],
        ['es', 'es'],
        ['en', 'en'],
    ];

    const detectedMapping = mappings.find(([prefix]) => lang.startsWith(prefix));

    return detectedMapping ? detectedMapping[1] : defaultLocale;
}

function detectAndStorePageLanguage(): void { // Note que o tipo de retorno agora é 'void'
    const detectedLocale = getLocaleFromAgent(); // Chama a função que só tem uma responsabilidade

    console.log(`Omni Max [ContentScript]: Page language detected as "${detectedLocale}". Storing setting.`);
    selectedLocaleStore.set(detectedLocale);
}

/**
 * Applies styles to a selector with retries if the element is not immediately found.
 * @param domService Instance of DomService.
 * @param selector The CSS selector for the target element.
 * @param styles The styles to apply.
 * @param retries Number of retries remaining.
 * @returns Promise<boolean> True if styles were applied, false otherwise.
 */
async function applyLayoutStylesWithRetry(
    domService: DomService,
    selector: string,
    styles: Partial<CSSStyleDeclaration>,
    retries = MAX_LAYOUT_RETRIES
): Promise<boolean> {
    const targetElement = domService.query(selector);
    if (targetElement) {
        domService.applyStyles(targetElement, styles);
        // console.log(`Omni Max [ContentIndex]: Styles successfully applied to "${selector}".`);
        return true;
    } else if (retries > 0) {
        // console.warn(`Omni Max [ContentIndex]: Element "${selector}" not found for layout. Retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, LAYOUT_RETRY_DELAY));
        return applyLayoutStylesWithRetry(domService, selector, styles, retries - 1);
    } else {
        console.error(`Omni Max [ContentIndex]: Element "${selector}" not found after ${MAX_LAYOUT_RETRIES} retries. Cannot apply layout styles.`);
        return false;
    }
}

/**
 * Applies or removes layout corrections to the target platform's UI based on extension settings.
 * Uses a retry mechanism to ensure the target element is found.
 * @param {DomService} domService - Instance of DomService for DOM manipulations.
 * @param {Config} config - The application configuration object containing selectors.
 * @param {boolean} moduleEnabled - Whether the layout correction module is specifically enabled.
 * @param {boolean} globalEnabled - Whether the extension is globally enabled.
 * @public
 */
export async function handleLayoutCorrection(domService: DomService, config: Config, moduleEnabled: boolean, globalEnabled: boolean): Promise<void> {
    const tabsListSelector = config.selectors?.tabsList;
    if (!tabsListSelector) {
        console.warn("Omni Max [ContentIndex]: tabsList selector is not defined in config. Cannot handle layout correction.");
        return;
    }

    if (globalEnabled && moduleEnabled) {
        // console.log(`Omni Max [ContentIndex]: Attempting to apply layout correction to "${tabsListSelector}".`);
        await applyLayoutStylesWithRetry(domService, tabsListSelector, {
            float: 'right',
            maxHeight: '72vh',
            overflowY: 'auto'
        });
    } else {
        // console.log(`Omni Max [ContentIndex]: Attempting to remove layout correction from "${tabsListSelector}".`);
        await applyLayoutStylesWithRetry(domService, tabsListSelector, {
            float: '',
            maxHeight: '',
            overflowY: ''
        });
    }
}


function getActiveTabChatContext(domService: DomService): ActiveChatContext | null {
    const activeTabLinkElement = domService.query<HTMLAnchorElement>('ul#tabs li.active a');
    if (activeTabLinkElement) {
        const protocolNumber = activeTabLinkElement.dataset.protocolo;
        const attendanceId = activeTabLinkElement.dataset.atendimento;
        const contactId = activeTabLinkElement.dataset.contato;

        const panelElement = attendanceId ? domService.query<HTMLElement>(`#aba_${attendanceId}`) : null;

        if (protocolNumber && attendanceId && contactId) {
            return {
                protocolNumber,
                attendanceId,
                contactId,
                panelElement: panelElement || undefined
            };
        }
    }
    return null;
}

export async function initializeOmniMaxContentScript(): Promise<void> {
    if ((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]) {
        // console.log(`Omni Max: Content script v${extensionVersion} (layoutFix) already initialized.`);
        return;
    }
    (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;

    // Detect and store the page language
    detectAndStorePageLanguage();

    console.log(`Omni Max: Content Script v${extensionVersion} (layoutFix) - Initializing...`);

    const domService = new DomService();
    const clipboardService = new ClipboardService();
    const notificationService = new NotificationService(domService);
    const extractionService = new ExtractionService(CONFIG, domService);
    const shortcutService = new ShortcutService(extractionService, clipboardService, notificationService);
    const templateHandlingService = new TemplateHandlingService(CONFIG, domService);

    const aiManager = new AIServiceManager();
    const matrixApiService = new MatrixApiService();
    const summaryCacheService = new SummaryCacheService(defaultStorageAdapter);

    const summaryUiService = new SummaryUiService(
        domService,
        aiManager,
        matrixApiService,
        summaryCacheService,
        () => getActiveTabChatContext(domService)
    );

    const refreshSummaryButtonLogic = () => {
        // console.log("Omni Max [ContentIndex]: Settings changed, refreshing summary button logic.");
        setupSummaryButtonForActivePanel(); // Esta função já decide se injeta ou remove
    };

    const setupSummaryButtonForActivePanel = (): void => {
        const isGloballyEnabled = get(globalExtensionEnabledStore) !== false;
        const isAiFeaturesOverallEnabled = get(aiFeaturesEnabledStore) !== false;
        const currentModuleStates = get(moduleStatesStore);
        const isChatSummaryModuleEnabled = currentModuleStates?.aiChatSummary !== false;

        if (!isGloballyEnabled || !isAiFeaturesOverallEnabled || !isChatSummaryModuleEnabled) {
            const existingButtons = domService.queryAll<HTMLButtonElement>(`.${SUMMARY_BUTTON_CLASS}`);
            existingButtons.forEach(btn => btn.remove());
            return;
        }

        const activeChatCtx = getActiveTabChatContext(domService);
        if (!activeChatCtx || !activeChatCtx.protocolNumber || !activeChatCtx.contactId || !activeChatCtx.attendanceId) {
            return;
        }

        let hsmButtonsContainer: HTMLDivElement | null = null;
        if (activeChatCtx.panelElement) {
            hsmButtonsContainer = domService.query<HTMLDivElement>('div.hsm_buttons', activeChatCtx.panelElement);
        }

        if (!hsmButtonsContainer) {
            const allHsmButtonDivs = domService.queryAll<HTMLDivElement>('div.hsm_buttons');
            for (const div of allHsmButtonDivs) {
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
            // console.warn(`Omni Max [ContentIndex]: Could not find 'div.hsm_buttons' for active panel (protocol: ${activeChatCtx.protocolNumber}). Summary button not injected.`);
        }
    };

    const tabsUlElement = domService.query('ul#tabs');
    if (tabsUlElement) {
        const tabObserver = new MutationObserver(async (mutationsList) => {
            let needsButtonSetup = false;
            let activeProtocolsChanged = false;

            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class' &&
                    mutation.target.nodeName === 'LI' && (mutation.target as HTMLLIElement).classList.contains('active')) {
                    needsButtonSetup = true;
                    activeProtocolsChanged = true;
                }
                if (mutation.type === 'childList') {
                    activeProtocolsChanged = true;
                    mutation.removedNodes.forEach(async removedNode => {
                        if (removedNode.nodeName === 'LI' && removedNode instanceof HTMLLIElement) {
                            const linkElement = domService.query<HTMLAnchorElement>('a', removedNode);
                            const protocolNumberToRemove = linkElement?.dataset.protocolo;
                            if (protocolNumberToRemove) {
                                setTimeout(async () => {
                                    const currentActiveTabElements = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
                                    const currentActiveProtocolNumbers = currentActiveTabElements
                                        .map(tab => tab.dataset.protocolo)
                                        .filter(Boolean) as string[];
                                    if (!currentActiveProtocolNumbers.includes(protocolNumberToRemove)) {
                                        await summaryCacheService.removeSummary(protocolNumberToRemove);
                                    }
                                }, 7000);
                            }
                        }
                    });
                }
            }

            if (needsButtonSetup) {
                setTimeout(setupSummaryButtonForActivePanel, 250);
            }
            if (activeProtocolsChanged) {
                const currentActiveTabElements = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
                const currentActiveProtocolNumbers = currentActiveTabElements
                    .map(tab => tab.dataset.protocolo)
                    .filter(p => !!p) as string[];
                await summaryCacheService.clearInvalidSummaries(currentActiveProtocolNumbers);
            }
        });
        tabObserver.observe(tabsUlElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

        setTimeout(setupSummaryButtonForActivePanel, 1500);

        const initialActiveTabElements = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
        const initialActiveProtocolNumbers = initialActiveTabElements
            .map(tab => tab.dataset.protocolo)
            .filter(p => !!p) as string[];
        await summaryCacheService.clearInvalidSummaries(initialActiveProtocolNumbers);

    } else {
        console.warn('Omni Max [ContentIndex]: Target ul#tabs for MutationObserver not found. Summary button might not be injected on tab changes.');
        setTimeout(setupSummaryButtonForActivePanel, 1500);
    }


    // --- Subscrições às Stores para Reatividade do Botão de Resumo e Layout ---
    const updateUiBasedOnSettings = () => {
        // Layout Correction
        const isGloballyEnabledForLayout = get(globalExtensionEnabledStore);
        const currentModuleStatesForLayout = get(moduleStatesStore);
        const isLayoutModuleEnabled = currentModuleStatesForLayout?.layoutCorrection;
        handleLayoutCorrection(
            domService,
            CONFIG,
            isLayoutModuleEnabled ?? false,
            isGloballyEnabledForLayout ?? true
        ).catch(err => console.error(`Omni Max [ContentIndex]: Layout correction handling failed:`, err));

        // Summary Button (já chamado pelo setupSummaryButtonForActivePanel, que é chamado abaixo)
        refreshSummaryButtonLogic();
    };

    // Inscrever-se nas mudanças das stores relevantes
    // Qualquer mudança nessas stores acionará uma reavaliação completa da UI.
    const unsubGlobal = globalExtensionEnabledStore.subscribe(updateUiBasedOnSettings);
    const unsubModules = moduleStatesStore.subscribe(updateUiBasedOnSettings);
    const unsubAiFeatures = aiFeaturesEnabledStore.subscribe(updateUiBasedOnSettings);
    // Adicionar unsubAiFeatures para garantir que o botão de resumo reaja se a feature de IA geral for (des)ativada


    // console.log("Omni Max [ContentIndex]: Subscribed to store changes for layout updates.");

    // A primeira chamada a `updateLayout` já ocorre devido à subscrição.
    // A lógica de retentativa em `handleLayoutCorrection` cuidará do timing do DOM.

    shortcutService.attachListeners();
    templateHandlingService.attachListeners();

    console.log(`Omni Max: Content Script v${extensionVersion} (layoutFix) initialization sequence complete.`);
}

// --- Script Auto-Execution ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // console.log("Omni Max [ContentIndex]: DOMContentLoaded event fired.");
        initializeOmniMaxContentScript();
    });
} else {
    // console.log(`Omni Max [ContentIndex]: DOM already loaded (readyState: ${document.readyState}). Initializing.`);
    initializeOmniMaxContentScript();
}