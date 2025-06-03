// src/content/index.ts
import { CONFIG, type Config } from './config'; // Seu config existente
import { DomService } from './services/DomService';
import { ClipboardService } from './services/ClipboardService';
import { NotificationService } from './services/NotificationService';
import { ExtractionService } from './services/ExtractionService'; // Para outras extrações
import { ShortcutService } from './services/ShortcutService';
import { TemplateHandlingService } from './services/TemplateHandlingService';

import { AIServiceManager } from '../ai/AIServiceManager';
import { MatrixApiService } from './services/MatrixApiService';
import { SummaryCacheService } from './services/SummaryCacheService';
import { SummaryUiService } from './services/SummaryUiService';
import { defaultStorageAdapter } from '../storage/IStorageAdapter'; // Para SummaryCacheService
import type { ActiveChatContext } from './types';

import { globalExtensionEnabledStore, moduleStatesStore, aiFeaturesEnabledStore } from '../storage/stores'; // Para verificar se a IA está habilitada
import { get } from 'svelte/store'; // Para ler o valor atual das stores

import { SUMMARY_BUTTON_CLASS } from './services/SummaryUiService'; // Constante para a classe do botão de resumo

import packageJson from '../../package.json';
const version = packageJson.version;
const OMNI_MAX_CONTENT_LOADED_FLAG = `omniMaxContentLoaded_v${version}_summary`;



export async function applyLayoutCorrection(domService: DomService, config: Config) {
  const isGlobal = get(globalExtensionEnabledStore) !== false;
  const moduleStates = get(moduleStatesStore);
  const isLayoutEnabled = moduleStates?.layoutCorrection !== false;
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
 * Identifica o contexto do chat ativo (protocolo e contatoId)
 * baseado na aba de navegação ativa (ul#tabs li.active a).
 */
function getActiveTabChatContext(domService: DomService): ActiveChatContext | null {
  const activeTabLink = domService.query<HTMLAnchorElement>('ul#tabs li.active a');
  if (activeTabLink) {
    const protocolo = activeTabLink.dataset.protocolo;
    const atendimentoId = activeTabLink.dataset.atendimento; // Seu HTML usa data-atendente
    const contatoId = activeTabLink.dataset.contato; // Seu HTML usa data-contato
    const panelElement = domService.query<HTMLElement>(`#aba_${atendimentoId}`); // Supondo que o painel tenha ID 'aba_PROTOCOL'

    if (protocolo && atendimentoId && contatoId) {
      return { protocolo, atendimentoId, contatoId, panelElement: panelElement || undefined };
    }
  }
  // console.warn("Omni Max [ContentIndex]: Não foi possível determinar o contexto da aba ativa.");
  return null;
}


export async function initializeOmniMaxContentScript(): Promise<void> {
  if ((window as any)[OMNI_MAX_CONTENT_LOADED_FLAG]) {
    console.log(`Omni Max: Content script v${version} (com resumo) já inicializado.`);
    return;
  }
  (window as any)[OMNI_MAX_CONTENT_LOADED_FLAG] = true;

  console.log(`Omni Max: Content Script v${version} (com resumo) - Inicializando...`);

  const domService = new DomService();
  const clipboardService = new ClipboardService(); // Seus serviços existentes
  const notificationService = new NotificationService(domService);
  const extractionService = new ExtractionService(CONFIG, domService);
  const shortcutService = new ShortcutService(extractionService, clipboardService, notificationService);
  const templateHandlingService = new TemplateHandlingService(CONFIG, domService);
  
  // Instanciando serviços para a funcionalidade de resumo
  const aiManager = new AIServiceManager(); // Instanciado no content script
  const matrixApiService = new MatrixApiService();
  const summaryCacheService = new SummaryCacheService(defaultStorageAdapter); // Usa o adapter padrão

  const summaryUiService = new SummaryUiService(
    domService,
    aiManager,
    matrixApiService,
    summaryCacheService,
    () => getActiveTabChatContext(domService) // Callback para obter contexto ativo
  );

  // Função para configurar o botão de resumo para o painel ativo
  const setupSummaryButtonForActivePanel = () => {
    // Verifica se a funcionalidade de IA e o módulo de resumo estão habilitados
    const isGloballyEnabled = get(globalExtensionEnabledStore);
    const isAiFeaturesEnabled = get(aiFeaturesEnabledStore);
    const moduleStates = get(moduleStatesStore);
    const isChatSummaryModuleEnabled = moduleStates['aiChatSummary'] !== false; // Habilitado por padrão

    if (!isGloballyEnabled || !isAiFeaturesEnabled || !isChatSummaryModuleEnabled) {
      // console.log("Omni Max [ContentIndex]: Funcionalidade de resumo de IA desabilitada nas configurações.");
      // TODO: Poderia remover o botão se ele já existir e a funcionalidade for desabilitada
      const existingButton = domService.queryAll<HTMLButtonElement>(`.${SUMMARY_BUTTON_CLASS}`);
      existingButton.forEach(btn => btn.remove());
      return;
    }
    
    const activeChatCtx = getActiveTabChatContext(domService);
    if (!activeChatCtx || !activeChatCtx.protocolo) return;

    // Encontra o container `div.hsm_buttons` dentro do painel ativo
    // O seletor `#aba_ID .hsm_buttons` assume que o painel tem um ID como `aba_272074`
    // e o `div.hsm_buttons` está dentro dele.
    // Se o `activeChatCtx.panelElement` for confiável:
    let hsmButtonsDiv: HTMLDivElement | null = null;
    if (activeChatCtx.panelElement) {
        hsmButtonsDiv = domService.query<HTMLDivElement>('div.hsm_buttons', activeChatCtx.panelElement);
    }
    
    // Fallback: Tenta encontrar o div.hsm_buttons associado ao protocolo ativo
    // usando o data-id dos seus filhos como pista, se o panelElement não foi encontrado ou não contém.
    if (!hsmButtonsDiv) {
        const firstIconLinkInPanel = domService.query<HTMLAnchorElement>(
            `a[data-id="${activeChatCtx.atendimentoId}"][data-contato="${activeChatCtx.contatoId}"]`
        );
        if (firstIconLinkInPanel) {
            hsmButtonsDiv = firstIconLinkInPanel.closest('div.hsm_buttons') as HTMLDivElement | null;
        }
    }
    
    // Outro fallback, mais genérico se a estrutura for consistente dentro do painel ativo
    if (!hsmButtonsDiv) {
        const activePanelGeneral = domService.query('div.tab-pane.active'); // Seletor genérico para painel ativo
        if (activePanelGeneral) {
            hsmButtonsDiv = domService.query<HTMLDivElement>('div.hsm_buttons', activePanelGeneral);
        }
    }


    if (hsmButtonsDiv) {
      summaryUiService.injectSummaryButton(hsmButtonsDiv, activeChatCtx.protocolo, activeChatCtx.contatoId);
    } else {
      console.warn(`Omni Max [ContentIndex]: 'div.hsm_buttons' não encontrado para o painel ativo (protocolo ${activeChatCtx.protocolo}).`);
    }
  };

  // Observador para as abas de navegação (ul#tabs) e para o conteúdo do chat
  const tabsUl = domService.query('ul#tabs');
  if (tabsUl) {
    console.log('Omni Max [ContentIndex]: Configurando MutationObserver para ul#tabs.');
    const tabObserver = new MutationObserver(async (mutations) => {
      let activeProtocolChanged = false; // Flag para limpar cache se necessário
      let setupButtonNeeded = false;

      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class' &&
            mutation.target.nodeName === 'LI' && (mutation.target as HTMLLIElement).classList.contains('active')) {
          console.log("Omni Max [ContentIndex]: Aba de chat tornou-se ativa via observador.");
          setupButtonNeeded = true;
          activeProtocolChanged = true; // Mudança de aba ativa também implica mudança de protocolo ativo
        }
        if (mutation.type === 'childList') {
          activeProtocolChanged = true; // Adição/remoção de abas
          mutation.removedNodes.forEach(async node => {
            if (node.nodeName === 'LI' && node instanceof HTMLLIElement) {
              const aTag = domService.query<HTMLAnchorElement>('a', node);
              const protocolo = aTag?.dataset.protocolo;
              if (protocolo) {
                console.log(`Omni Max [ContentIndex]: Aba removida para protocolo ${protocolo}. Agendando limpeza de resumo.`);
                setTimeout(async () => {
                  const activeTabsNow = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
                  const currentActiveProtocolsNow = activeTabsNow.map(t => t.dataset.protocolo).filter(Boolean) as string[];
                  if (!currentActiveProtocolsNow.includes(protocolo)) {
                    await summaryCacheService.removeSummary(protocolo);
                  }
                }, 7000); // Delay para evitar remoção por flicker da UI
              }
            }
          });
        }
      }

      if (setupButtonNeeded) {
        // Atraso pequeno para garantir que o conteúdo do painel da aba esteja renderizado
        setTimeout(setupSummaryButtonForActivePanel, 200);
      }
      if (activeProtocolChanged) {
        const activeTabs = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
        const currentProtocols = activeTabs.map(tab => tab.dataset.protocolo).filter(p => !!p) as string[];
        await summaryCacheService.clearInvalidSummaries(currentProtocols);
      }
    });
    tabObserver.observe(tabsUl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    
    // Configuração inicial
    setTimeout(setupSummaryButtonForActivePanel, 1500); // Delay para a UI inicial da página
    const initialActiveTabs = domService.queryAll<HTMLAnchorElement>('ul#tabs li a');
    const initialProtocols = initialActiveTabs.map(tab => tab.dataset.protocolo).filter(p => !!p) as string[];
    await summaryCacheService.clearInvalidSummaries(initialProtocols);

  } else {
    console.error('Omni Max [ContentIndex]: ul#tabs não encontrado para observação.');
  }
  
  // Anexa listeners dos seus outros serviços
  shortcutService.attachListeners();
  templateHandlingService.attachListeners();
  
  applyLayoutCorrection(domService, CONFIG)
    .then(() => console.log(`Omni Max: Layout correction applied.`))
    .catch(err => console.error(`Omni Max: Layout correction error:`, err));
  
  console.log(`Omni Max [ContentIndex]: Script de conteúdo v${version} pronto.`);
}

// Auto-execução
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOmniMaxContentScript);
} else {
  initializeOmniMaxContentScript();
}