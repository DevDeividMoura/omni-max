// src/content/index.ts
/**
 * @file src/content/index.ts
 * @description Main entry point for the Omni Max content script.
 * This script composes the application by instantiating services and running the AppManager.
 */
import { AppManager } from './core/AppManager';
import { DomService } from './services/DomService';
import { ClipboardService } from './services/ClipboardService';
import { NotificationService } from './services/NotificationService';
import { ExtractionService } from './services/ExtractionService';
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';
import { AIServiceManager } from '../ai/AIServiceManager';
import { MatrixApiService } from './services/MatrixApiService';
import { SummaryCacheService } from './services/SummaryCacheService';
import { SummaryUiService } from './services/SummaryUiService';
import { defaultStorageAdapter } from '../storage/IStorageAdapter';
import { getLocaleFromAgent } from '../utils/language';
import { getConfig } from './config';
import packageJson from '../../package.json';
import { getActiveTabChatContext } from './utils/context';

const extensionVersion = packageJson.version;
export const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${extensionVersion}_refactor`;

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

    // --- Composition Root: Instantiate all services ---
    const domService = new DomService();
    const clipboardService = new ClipboardService();
    const notificationService = new NotificationService(domService);
    const extractionService = new ExtractionService(getConfig(), domService);
    const shortcutService = new ShortcutService(extractionService, clipboardService, notificationService);
    const templateHandlingService = new TemplateHandlingService(getConfig(), domService);
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

    // --- Instantiate and run the main application orchestrator ---
    const app = new AppManager(
        domService,
        shortcutService,
        templateHandlingService,
        summaryUiService,
        summaryCacheService
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