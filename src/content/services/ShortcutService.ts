/**
 * src/content/services/ShortcutService.ts
 * Manages the registration and handling of keyboard shortcuts for the extension.
 * It listens for key combinations (Ctrl+Shift+Key) and triggers actions
 * based on user-configured shortcuts and enabled modules.
 */
import { get } from 'svelte/store'
import { globalExtensionEnabledStore, shortcutsOverallEnabledStore, moduleStatesStore, shortcutKeysStore } from '../../storage/stores'
import type { ExtractionService } from './ExtractionService'
import type { ClipboardService } from './ClipboardService'
import type { NotificationService } from './NotificationService'
import type { ShortcutKeysConfig } from '../../storage/stores'

import { translator } from '../../i18n/translator.content';


export class ShortcutService {
  private extractionService: ExtractionService;
  private clipboardService: ClipboardService;
  private notificationService: NotificationService;
  private boundHandleKeyDown: (event: KeyboardEvent) => Promise<void>;

  /**
   * Maps shortcut module IDs to their respective action functions and default keys.
   * This allows for a declarative way to define and manage multiple shortcuts.
   * Each actionFunction should return the data to be copied and a user-friendly label for notifications.
   */
  private readonly actionsMap: Array<{
    /** The ID of the module this shortcut corresponds to (must match an ID in `src/modules.ts` and `ShortcutKeysConfig`). */
    moduleId: keyof ShortcutKeysConfig;
    /** The default key for this shortcut if not configured by the user. */
    defaultKey: string;
    /** Asynchronous function that performs the shortcut's action (e.g., extracts data). */
    actionFunction: () => Promise<{ data: string | null; labelKey: string; notFoundKey: string }>;
  }> = [
      {
        moduleId: 'shortcutCopyDocumentNumber',
        defaultKey: 'X',
        actionFunction: async () => ({
          data: await this.extractionService.extractDocumentNumber(),
          labelKey: 'modules.shortcutCopyDocumentNumber.name', // Chave do nome do módulo
          notFoundKey: 'alerts.document_not_found' // Chave para erro específico
        })
      },
      {
        moduleId: 'shortcutCopyName',
        defaultKey: 'Z',
        actionFunction: async () => ({
          data: await this.extractionService.extractCustomerName(),
          labelKey: 'modules.shortcutCopyName.name',
          notFoundKey: 'alerts.customer_name_not_found'
        })
      },
      {
        moduleId: 'shortcutServiceOrderTemplate',
        defaultKey: 'S',
        actionFunction: async () => {
          const phoneNumber = await this.extractionService.extractPhoneNumber();
          const protocolNumber = await this.extractionService.extractProtocolNumber();

          // Pega as traduções para as partes do template
          const situationLabel = await translator.t('templates.service_order.situation');
          const phoneLabel = await translator.t('templates.service_order.phone');
          const protocolLabel = await translator.t('templates.service_order.protocol');
          const notesLabel = await translator.t('templates.service_order.notes');

          const phonePlaceholder = await translator.t('templates.service_order.phone_placeholder');
          const protocolPlaceholder = await translator.t('templates.service_order.protocol_placeholder');

          const template = `${situationLabel}: [RELATO_DO_CLIENTE] |||
${phoneLabel}: ${phoneNumber || `[${phonePlaceholder}]`} |||
${protocolLabel}: ${protocolNumber || `[${protocolPlaceholder}]`} |||
${notesLabel}: [OBSERVAÇÕES]`;

          return {
            data: template,
            labelKey: 'modules.shortcutServiceOrderTemplate.name',
            notFoundKey: 'alerts.template_creation_failed' // Chave genérica para este caso
          };
        }
      }
    ];

  /**
   * Constructs an instance of the ShortcutService.
   * @param {ExtractionService} extractionService Service for extracting data from the page.
   * @param {ClipboardService} clipboardService Service for copying data to the clipboard.
   * @param {NotificationService} notificationService Service for displaying toast notifications.
   */
  constructor(
    extractionService: ExtractionService,
    clipboardService: ClipboardService,
    notificationService: NotificationService
  ) {
    this.extractionService = extractionService;
    this.clipboardService = clipboardService;
    this.notificationService = notificationService;
    // Pre-bind the event handler for easy addition/removal of the listener
    this.boundHandleKeyDown = this.handleCtrlShiftKeyDown.bind(this);
  }

  /**
   * Handles the `keydown` event, specifically looking for Ctrl+Shift combinations.
   * If a recognized and enabled shortcut is detected, its action is performed.
   * @param {KeyboardEvent} event The `keydown` event object.
   */
  private async handleCtrlShiftKeyDown(event: KeyboardEvent): Promise<void> {
    if (!event.ctrlKey || !event.shiftKey) {
      return; // Only interested in Ctrl+Shift combinations
    }
    event.preventDefault(); // Prevent default browser action for this key combination
    // console.log("Omni Max [ShortcutService]: Ctrl+Shift key combination detected.");
    event.stopPropagation(); // Stop the event from bubbling further

    // Get current settings from stores
    const globalEnable = get(globalExtensionEnabledStore)
    const shortcutsEnable = get(shortcutsOverallEnabledStore)
    const moduleStates = get(moduleStatesStore)
    const shortcutKeys = get(shortcutKeysStore)

    if (!globalEnable || !shortcutsEnable) return

    const pressedKey = event.key.toUpperCase()

    for (const mappedAction of this.actionsMap) {
      const isModuleEnabled = moduleStates[mappedAction.moduleId] !== false;
      const configuredKey = (shortcutKeys[mappedAction.moduleId] || mappedAction.defaultKey).toUpperCase();

      if (isModuleEnabled && pressedKey === configuredKey) {
        console.log(`[ShortcutService]: Shortcut '${mappedAction.moduleId}' triggered!`);

        // 1. Executa a ação e pega os dados e as CHAVES de tradução
        const { data, labelKey, notFoundKey } = await mappedAction.actionFunction();

        // 2. Traduz o nome do dado (o label) para usar nas notificações
        const translatedLabel = await translator.t(labelKey);

        // 3. Lida com o caso de "dado não encontrado"
        if (!data) {
          const warningText = await translator.t(notFoundKey);
          this.notificationService.showToast(warningText, 'warning');
          return;
        }

        // 4. Tenta copiar e lida com o erro de cópia
        if (!await this.clipboardService.copy(data, translatedLabel)) {
          const errorText = await translator.t('alerts.copy_failed', {
            values: { label: translatedLabel }
          });
          this.notificationService.showToast(errorText, 'error');
          return;
        }

        // 5. Mostra a notificação de sucesso
        const successText = await translator.t('alerts.copy_success', {
          values: { label: translatedLabel }
        });
        this.notificationService.showToast(successText, 'success');
        return;
      }
    }
  }
  /**
   * Attaches the keyboard event listener to the document to listen for shortcuts.
   * Ensures that the listener is not attached multiple times.
   * The listener is attached in the capture phase to potentially intercept events earlier.
   */
  public attachListeners(): void {
    // Remove any existing listener to prevent duplicates (important for HMR or script re-injection scenarios)
    document.removeEventListener('keydown', this.boundHandleKeyDown, true);
    document.addEventListener('keydown', this.boundHandleKeyDown, true); // Use capture phase
    console.log("Omni Max [ShortcutService]: Keyboard shortcut listener attached.");
  }

  /**
   * Detaches the keyboard event listener from the document.
   * Useful when the content script is being disabled or unloaded.
   */
  public detachListeners(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown, true);
    console.log("Omni Max [ShortcutService]: Keyboard shortcut listener detached.");
  }
}