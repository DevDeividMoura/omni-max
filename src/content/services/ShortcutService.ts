/**
 * src/content/modules/ShortcutService.ts
 * Gerencia a escuta e o disparo de ações para atalhos de teclado configuráveis.
 */
import type { Config } from '../config';
import type { ExtractionService } from './ExtractionService';
import type { ClipboardService } from './ClipboardService';
import type { NotificationService } from '../utils/NotificationService';
import type { ShortcutKeysConfig } from '../../storage'; // Para os tipos das chaves

interface StoredSettings {
  globalEnable: boolean;
  shortcutsOverallEnable: boolean;
  moduleStates: Record<string, boolean>;
  shortcutKeys: ShortcutKeysConfig;
}

export class ShortcutService {
  private config: Config;
  private extractionService: ExtractionService;
  private clipboardService: ClipboardService;
  private notificationService: NotificationService;

  // Definição das ações de atalho e seus módulos associados
  private readonly actionsMap: Array<{
    moduleId: keyof ShortcutKeysConfig; // ID do módulo (ex: 'shortcutCopyCPF')
    defaultKey: string; // Tecla padrão de fallback
    actionFunction: () => Promise<{ data: string | null; label: string }>; // Função que retorna o dado e um label
  }> = [
      {
        moduleId: 'shortcutCopyCPF',
        defaultKey: 'X',
        actionFunction: async () => ({ data: this.extractionService.extractCPF(), label: "CPF" })
      },
      {
        moduleId: 'shortcutCopyName',
        defaultKey: 'Z',
        actionFunction: async () => ({ data: this.extractionService.extractCustomerName(), label: "Nome do Cliente" })
      },
      // Adicionar outras ações de atalho aqui
    ];

  constructor(
    config: Config,
    extractionService: ExtractionService,
    clipboardService: ClipboardService,
    notificationService: NotificationService
  ) {
    this.config = config;
    this.extractionService = extractionService;
    this.clipboardService = clipboardService;
    this.notificationService = notificationService;
  }

  /**
   * Busca as configurações relevantes do chrome.storage.sync.
   */
  private async getSettings(): Promise<StoredSettings> {
    const keysToGet = [
      'omniMaxGlobalEnabled',
      'omniMaxShortcutsOverallEnabled',
      'omniMaxModuleStates',
      'omniMaxShortcutKeys'
    ];
    const data = await chrome.storage.sync.get(keysToGet);
    return {
      globalEnable: data.omniMaxGlobalEnabled !== false, // default true
      shortcutsOverallEnable: data.omniMaxShortcutsOverallEnabled !== false, // default true
      moduleStates: data.omniMaxModuleStates || {},
      shortcutKeys: data.omniMaxShortcutKeys || { shortcutCopyName: 'Z', shortcutCopyCPF: 'X' } // fallback defaults
    };
  }

  /**
   * Manipulador para o evento keydown, focado em Ctrl+Shift.
   */
  private async handleCtrlShiftKeyDown(event: KeyboardEvent): Promise<void> {
    if (!event.ctrlKey || !event.shiftKey) return;

    const settings = await this.getSettings();
    if (!settings.globalEnable || !settings.shortcutsOverallEnable) {
      console.log("Omni Max [ShortcutService]: Atalhos desabilitados globalmente ou na seção.");
      return;
    }

    const pressedKey = event.key.toUpperCase();

    for (const mappedAction of this.actionsMap) {
      const isModuleEnabled = settings.moduleStates[mappedAction.moduleId] !== false; // default true se não definido
      const configuredKey = (settings.shortcutKeys[mappedAction.moduleId] || mappedAction.defaultKey).toUpperCase();

      if (isModuleEnabled && pressedKey === configuredKey) {
        event.preventDefault();
        // event.stopPropagation();
        console.log(`Omni Max [ShortcutService]: Atalho '${mappedAction.moduleId}' (tecla ${configuredKey}) disparado!`);

        const { data, label } = await mappedAction.actionFunction();

        if (data) {
          if (await this.clipboardService.copy(data, label)) {
            this.notificationService.showToast(`${label} "${data}" copiado!`, 'success');
          } else {
            this.notificationService.showToast(`Falha ao copiar ${label}.`, 'error');
          }
        } else {
          this.notificationService.showToast(`${label} não encontrado na página.`, 'warning');
        }
        return; // Executa apenas o primeiro atalho correspondente
      }
    }
  }

  /**
   * Anexa o listener de eventos de teclado ao documento.
   */
  public attachListeners(): void {
    // Garante que não haja listeners duplicados (útil para HMR ou múltiplas injeções)
    document.removeEventListener('keydown', this.boundHandleKeyDown, true);
    this.boundHandleKeyDown = this.handleCtrlShiftKeyDown.bind(this); // Guarda a referência binded
    document.addEventListener('keydown', this.boundHandleKeyDown, true); // Fase de captura
    console.log("Omni Max [ShortcutService]: Listener de atalhos anexado.");
  }

  private boundHandleKeyDown: (event: KeyboardEvent) => Promise<void> = async () => { }; // Para poder remover
}