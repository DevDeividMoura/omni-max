/**
 * src/content/services/ShortcutService.ts
 * Manages the registration and handling of keyboard shortcuts for the extension.
 * It listens for key combinations (Ctrl+Shift+Key) and triggers actions
 * based on user-configured shortcuts and enabled modules.
 */
import type { ExtractionService } from './ExtractionService';
import type { ClipboardService } from './ClipboardService';
import type { NotificationService } from './NotificationService';
import type { ShortcutKeysConfig } from '../../storage';

/**
 * Defines the structure of settings retrieved from `chrome.storage.sync`
 * relevant to the ShortcutService's operation.
 */
interface StoredSettings {
  /** Global enabled state of the entire extension. */
  globalEnable: boolean;
  /** Enabled state for the overall "shortcuts" feature group. */
  shortcutsOverallEnable: boolean;
  /** State of individual modules (e.g., whether 'shortcutCopyDocumentNumber' is enabled). */
  moduleStates: Record<string, boolean>;
  /** User-configured keybindings for each shortcut action. */
  shortcutKeys: ShortcutKeysConfig;
}

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
    actionFunction: () => Promise<{ data: string | null; label: string }>;
  }> = [
      {
        moduleId: 'shortcutCopyDocumentNumber',
        defaultKey: 'X', // Default: Ctrl+Shift+X
        actionFunction: async () => ({ data: this.extractionService.extractDocumentNumber(), label: "Número do Documento" })
      },
      {
        moduleId: 'shortcutCopyName',
        defaultKey: 'Z', // Default: Ctrl+Shift+Z
        actionFunction: async () => ({ data: this.extractionService.extractCustomerName(), label: "Nome do Cliente" })
      },
      // Future shortcuts can be added here following the same pattern.
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
   * Fetches relevant shortcut and module settings from `chrome.storage.sync`.
   * Provides default values if settings are not yet stored.
   * @returns {Promise<StoredSettings>} A promise that resolves to the retrieved settings.
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
      globalEnable: data.omniMaxGlobalEnabled !== false, // Defaults to true if undefined
      shortcutsOverallEnable: data.omniMaxShortcutsOverallEnabled !== false, // Defaults to true
      moduleStates: data.omniMaxModuleStates || {},
      shortcutKeys: data.omniMaxShortcutKeys || { shortcutCopyName: 'Z', shortcutCopyDocumentNumber: 'X' } // Fallback default keys
    };
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

    const settings = await this.getSettings();
    if (!settings.globalEnable || !settings.shortcutsOverallEnable) {
      // console.log("Omni Max [ShortcutService]: Shortcuts globally or sectionally disabled.");
      return;
    }

    const pressedKey = event.key.toUpperCase();

    for (const mappedAction of this.actionsMap) {
      // A module is considered enabled if its state is true or undefined (defaulting to true).
      const isModuleEnabled = settings.moduleStates[mappedAction.moduleId] !== false;
      const configuredKey = (settings.shortcutKeys[mappedAction.moduleId] || mappedAction.defaultKey).toUpperCase();

      if (isModuleEnabled && pressedKey === configuredKey) {
        event.preventDefault(); // Prevent default browser action for this key combination
        // event.stopPropagation(); // Consider if stopping propagation is needed

        console.log(`Omni Max [ShortcutService]: Shortcut '${mappedAction.moduleId}' (key ${configuredKey}) triggered!`);

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
        return; // Execute only the first matching shortcut
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