import { get } from 'svelte/store';
import { globalExtensionEnabledStore, shortcutsOverallEnabledStore, moduleStatesStore, shortcutKeysStore } from '../../storage/stores';
import type { ExtractionService } from './ExtractionService';
import type { ClipboardService } from './ClipboardService';
import type { NotificationService } from './NotificationService';
import type { ShortcutKeysConfig } from '../../storage/stores';
import type { Translator } from '../../i18n/translator.content';

export class ShortcutService {
  private extractionService: ExtractionService;
  private clipboardService: ClipboardService;
  private notificationService: NotificationService;
  private translator: Translator;

  private boundHandleKeyDown: (event: KeyboardEvent) => Promise<void>;

  /**
   * Maps shortcut module IDs to their respective action functions.
   */
  private readonly actionsMap = new Map<keyof ShortcutKeysConfig, () => Promise<{ data: string | null; label: string; notFoundKey: string }>>([
    ['shortcutCopyDocumentNumber', async () => {
      const data = await this.extractionService.extractDocumentNumber();
      const label = await this.translator.t('modules.shortcuts.shortcut_copy_document_number.label');
      return { data, label, notFoundKey: 'alerts.document_not_found' };
    }],
    ['shortcutCopyName', async () => {
      const data = await this.extractionService.extractCustomerName();
      const label = await this.translator.t('modules.shortcuts.shortcut_copy_name.label');
      return { data, label, notFoundKey: 'alerts.customer_name_not_found' };
    }],
    ['shortcutServiceOrderTemplate', async () => {
      const phoneNumber = await this.extractionService.extractPhoneNumber();
      const protocolNumber = await this.extractionService.extractProtocolNumber();
      const situationLabel = await this.translator.t('templates.service_order.situation');
      const phoneLabel = await this.translator.t('templates.service_order.phone');
      const protocolLabel = await this.translator.t('templates.service_order.protocol');
      const notesLabel = await this.translator.t('templates.service_order.notes');

      const situationPlaceholder = await this.translator.t('templates.service_order.situation_placeholder');
      const phonePlaceholder = await this.translator.t('templates.service_order.phone_placeholder');
      const protocolPlaceholder = await this.translator.t('templates.service_order.protocol_placeholder');
      const notesPlaceholder = await this.translator.t('templates.service_order.notes_placeholder');


      const template = `${situationLabel}: [${situationPlaceholder}] |||
${phoneLabel}: ${phoneNumber || `[${phonePlaceholder}]`} |||
${protocolLabel}: ${protocolNumber || `[${protocolPlaceholder}]`} |||
${notesLabel}: [${notesPlaceholder}]`;

      const label = await this.translator.t('modules.shortcuts.shortcut_service_order_template.label');
      return { data: template, label, notFoundKey: 'alerts.template_creation_failed' };
    }],
  ]);

  constructor(
    extractionService: ExtractionService,
    clipboardService: ClipboardService,
    notificationService: NotificationService,
    translator: Translator
  ) {
    this.extractionService = extractionService;
    this.clipboardService = clipboardService;
    this.notificationService = notificationService;
    this.translator = translator;
    this.boundHandleKeyDown = this.handleCtrlShiftKeyDown.bind(this);
  }

  private async handleCtrlShiftKeyDown(event: KeyboardEvent): Promise<void> {
    if (!event.ctrlKey || !event.shiftKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const globalEnable = get(globalExtensionEnabledStore);
    const shortcutsEnable = get(shortcutsOverallEnabledStore);
    const moduleStates = get(moduleStatesStore);
    const shortcutKeys = get(shortcutKeysStore);

    if (!globalEnable || !shortcutsEnable) return;

    const pressedKey = event.key.toUpperCase();
    const defaultKeys: Partial<ShortcutKeysConfig> = {
      shortcutCopyDocumentNumber: 'X',
      shortcutCopyName: 'Z',
      shortcutServiceOrderTemplate: 'S',
    };

    for (const [moduleId, actionFunction] of this.actionsMap.entries()) {
      const isModuleEnabled = moduleStates[moduleId] !== false;
      const configuredKey = (shortcutKeys[moduleId] || defaultKeys[moduleId]!).toUpperCase();

      if (isModuleEnabled && pressedKey === configuredKey) {
        console.log(`[ShortcutService]: Shortcut '${moduleId}' triggered!`);
        const { data, label, notFoundKey } = await actionFunction();

        if (!data) {
          const warningText = await this.translator.t(notFoundKey);
          this.notificationService.showToast(warningText, 'warning');
          return;
        }

        if (!(await this.clipboardService.copy(data, label))) {
          const errorText = await this.translator.t('alerts.copy_failed', { values: { label } });
          this.notificationService.showToast(errorText, 'error');
          return;
        }

        const successText = await this.translator.t('alerts.copy_success', { values: { label, data } });
        this.notificationService.showToast(successText, 'success');
        return;
      }
    }
  }

  public attachListeners(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown, true);
    document.addEventListener('keydown', this.boundHandleKeyDown, true);
    console.log("Omni Max [ShortcutService]: Keyboard shortcut listener attached.");
  }

  public detachListeners(): void {
    document.removeEventListener('keydown', this.boundHandleKeyDown, true);
    console.log("Omni Max [ShortcutService]: Keyboard shortcut listener detached.");
  }
}
