import { mount } from 'svelte';
import { AppManager } from './core/AppManager';
import { DomService } from './services/DomService';
import { ClipboardService } from './services/ClipboardService';
import { ExtractionService } from './services/ExtractionService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { AssistantUiService } from './services/AssistantUiService'; // Único serviço de UI necessário

import { getLocaleFromAgent } from '../utils/language';
import { getConfig } from './config';
import packageJson from '../../package.json';
import { Translator } from '../i18n/translator.content';
import NotificationContainer from '../components/notifications/NotificationContainer.svelte';

const extensionVersion = packageJson.version;
export const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${extensionVersion}`;

/**
 * Initializes and runs the main application logic for the content script.
 */
export async function initializeOmniMaxContentScript(): Promise<void> {
    if ((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]) {
        return; // Prevent multiple initializations
    }
    (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;

    console.log(`Omni Max [Content Script]: v${extensionVersion} - Initializing...`);

    // --- Mount Svelte-based UI Systems ---
    const notificationHost = document.createElement('div');
    notificationHost.id = 'omni-max-notification-host';
    document.body.appendChild(notificationHost);
    mount(NotificationContainer, { target: notificationHost });

    // --- Instantiate services and dependencies for the Content Script ---
    const locale = getLocaleFromAgent();
    const translator = new Translator(locale);
    const domService = new DomService();
    const clipboardService = new ClipboardService();
    const extractionService = new ExtractionService(getConfig(), domService);
    
    const shortcutService = new ShortcutService(
        extractionService,
        clipboardService,
        translator
    );
    const templateHandlingService = new TemplateHandlingService(getConfig(), domService);
    
    // O AssistantUiService agora gerencia sua própria dependência do AgentService internamente.
    const assistantUiService = new AssistantUiService(
        domService,
        translator
    );

    // --- Instantiate and run the main application orchestrator ---
    const app = new AppManager(
        domService,
        shortcutService,
        templateHandlingService,
        assistantUiService
    );

    app.run();
}

/**
 * Sets up a listener for messages from other parts of the extension.
 */
function setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        if (request.type === 'GET_PAGE_LANGUAGE') {
            sendResponse({ locale: getLocaleFromAgent() });
            return true; // Indicates an async response
        }
    });
}

// --- Script Auto-Execution ---
setupMessageListener();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOmniMaxContentScript);
} else {
    initializeOmniMaxContentScript();
}