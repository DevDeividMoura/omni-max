import { mount } from 'svelte';
import { AppManager } from './core/AppManager';
import { DomService } from './services/DomService';
import { ClipboardService } from './services/ClipboardService';
import { ExtractionService } from './services/ExtractionService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { AIServiceManager } from '../ai/AIServiceManager';
import { MatrixApiService } from './services/MatrixApiService';
import { getLocaleFromAgent } from '../utils/language';
import { getConfig } from './config';
import packageJson from '../../package.json';
import { Translator } from '../i18n/translator.content';
import NotificationContainer from '../components/notifications/NotificationContainer.svelte';
import { AssistantUiService } from './services/AssistantUiService';

const extensionVersion = packageJson.version;
export const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${extensionVersion}`;

/**
 * Initializes and runs the main application logic for the content script.
 * This function sets up the dependency injection and starts the AppManager.
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

    // --- Instantiate services and dependencies ---
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
    const aiManager = new AIServiceManager();
    const matrixApiService = new MatrixApiService();
    
    // REMOVIDO: SummaryCacheService e SummaryUiService não são mais necessários.

    // ATUALIZADO: AssistantUiService agora recebe os serviços de IA e API
    // para poder executar a lógica de resumo internamente.
    const assistantUiService = new AssistantUiService(
        domService,
        translator,
        aiManager,
        matrixApiService
    );

    // --- Instantiate and run the main application orchestrator ---
    // ATUALIZADO: O AppManager agora é mais simples e recebe apenas o serviço do assistente.
    const app = new AppManager(
        domService,
        shortcutService,
        templateHandlingService,
        assistantUiService
    );

    app.run();
}

/**
 * Sets up a listener for messages from other parts of the extension (e.g., popup).
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