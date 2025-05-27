/**
 * src/content/index.ts
 * Ponto de entrada principal para os content scripts da Omni Max.
 * Inicializa e configura todos os serviços e listeners.
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

function initializeOmniMaxContentScript(): void {
  /**
   * Previne múltiplas inicializações do content script,
   * o que pode acontecer com HMR ou re-injeções.
   */
  if ((window as any).omniMaxContentLoaded) {
    console.log("Omni Max: Content script já inicializado nesta página.");
    return;
  }
  (window as any).omniMaxContentLoaded = false;

  console.log(`Omni Max: Content Script ${version} - Inicializando...`);

  // Instanciação dos serviços com injeção de dependência
  const domService = new DomService(); // DomService não usa CONFIG no construtor na minha versão
  const clipboardService = new ClipboardService();
  const notificationService = new NotificationService();
  const extractionService = new ExtractionService(CONFIG, domService); // ExtractionService usa CONFIG

  // Inicializa os manipuladores de eventos/funcionalidades
  const shortcutService = new ShortcutService(CONFIG, extractionService, clipboardService, notificationService);
  shortcutService.attachListeners(); // Ativa os listeners de atalho

  const templateHandlingService = new TemplateHandlingService(CONFIG, domService);
  templateHandlingService.attachListeners(); // Ativa os listeners de Tab

  // Aplica estilos para correção de layout (se o módulo estiver ativo)
  // Esta parte precisa ser condicional baseada no estado do módulo 'layoutCorrection'
  chrome.storage.sync.get(['omniMaxGlobalEnabled', 'omniMaxModuleStates'], (settings) => {
    const isGlobalEnabled = settings.omniMaxGlobalEnabled !== false;
    const isLayoutCorrectionEnabled = settings.omniMaxModuleStates?.['layoutCorrection'] !== false;
    if (isGlobalEnabled && isLayoutCorrectionEnabled && CONFIG.selectors.tabsList) {
      console.log("Omni Max: Aplicando correção de layout.");
      domService.applyStyles(CONFIG.selectors.tabsList, {
        float: 'right',
        maxHeight: '72vh',
        overflowY: 'auto'
      });
    }
  });

  console.log('Omni Max: Content Script pronto!');
}

// Garante que o script rode após o DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOmniMaxContentScript);
} else {
  initializeOmniMaxContentScript();
}