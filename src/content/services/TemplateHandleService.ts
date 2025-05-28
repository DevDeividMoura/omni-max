/**
 * src/content/services/TemplateHandlingService.ts
 * Handles advanced template processing within the chatbox, primarily triggered by the Tab key.
 * This includes features like auto-formatting customer names (e.g., {FULL NAME} -> Firstname)
 * and selecting placeholder variables (e.g., [VARIABLE]) for quick editing.
 */
import type { Config } from '../config';
import type { DomService } from './DomService'; // Corrected import path

export class TemplateHandlingService {
  private config: Config;
  private dom: DomService;
  private bracketRegex = /\[([^\]]+)\]/g; // Regex for finding placeholders like [VARIABLE]
  private boundOnKeyDown: (event: KeyboardEvent) => Promise<void>;


  /**
   * Constructs an instance of the TemplateHandlingService.
   * @param {Config} config The application configuration object.
   * @param {DomService} domService An instance of the DomService for DOM interactions.
   */
  constructor(config: Config, domService: DomService) {
    this.config = config;
    this.dom = domService;
    this.boundOnKeyDown = this.onKeyDown.bind(this);
  }

  /**
   * Capitalizes the first letter of a given full name and returns only the first name, lowercased.
   * Example: "ANA MARIA SOUZA" -> "Ana"
   * @param {string} fullName The full name string.
   * @returns {string} The capitalized first name, or an empty string if input is invalid.
   */
  private capitalizeFirstName(fullName: string): string {
    if (!fullName || typeof fullName !== 'string') return '';
    const firstName = fullName.split(' ')[0];
    return firstName
      ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      : '';
  }

  /**
   * Transforms template text by processing specific placeholders.
   * Currently, it replaces placeholders like `{CUSTOMER NAME}` with the capitalized first name.
   * @param {string} text The input text containing potential placeholders.
   * @returns {string} The text with placeholders transformed.
   */
  private transformTemplateText(text: string): string {
    // Process {NOME COMPLETO} -> Nome (capitalized first name)
    return text.replace(/\{([^}]+)\}/g, (_, placeholderContent) =>
      this.capitalizeFirstName(placeholderContent.trim())
    );
  }

  /**
   * Finds all selectable variable placeholders (e.g., `[VARIABLE]`) within a given text.
   * @param {string} text The text to search within.
   * @returns {Array<{ word: string, startIndex: number, endIndex: number }>} An array of objects,
   * each representing a found variable with its content, start index (of '['), and end index (of ']').
   */
  private findSelectableVariables(text: string): Array<{ word: string, startIndex: number, endIndex: number }> {
    const matches: Array<{ word: string, startIndex: number, endIndex: number }> = [];
    let matchResult;
    this.bracketRegex.lastIndex = 0; // Reset lastIndex for global regex before each use

    while ((matchResult = this.bracketRegex.exec(text)) !== null) {
      matches.push({
        word: matchResult[1], // Content within the brackets
        startIndex: matchResult.index, // Start index of '['
        endIndex: this.bracketRegex.lastIndex - 1 // Index of ']' (inclusive)
      });
    }
    return matches;
  }

  /**
   * Core logic executed when the Tab key is pressed in an editable div.
   * It first transforms basic templates (like customer name), then attempts to find
   * and select the first available `[VARIABLE]` placeholder. If no variables are found,
   * it moves the cursor to the end of the content.
   * @param {HTMLElement} editableDiv The content-editable HTML element (chatbox).
   */
  private async handleTabPressLogic(editableDiv: HTMLElement): Promise<void> {
    // console.log("Omni Max [TemplateHandling]: Tab key logic initiated...");
    try {
      let currentText = this.dom.getTextSafely(editableDiv); // Get plain text content
      let transformedText = this.transformTemplateText(currentText);

      // Update the div's content if transformations occurred.
      // This is crucial because selection offsets depend on the actual rendered text.
      if (editableDiv.innerText !== transformedText) {
        editableDiv.innerText = transformedText;
        await this.dom.waitNextFrame(); // Wait for DOM to update with the new innerText
        // After setting innerText, the cursor position might be lost or reset.
        // The text used for finding variables must be the *new* transformed text.
        currentText = transformedText;
      }

      const selectableVariables = this.findSelectableVariables(currentText);

      if (selectableVariables.length > 0) {
        const firstVariable = selectableVariables[0];
        const selection = window.getSelection();
        if (!selection) return;

        // Attempt to find the text node(s) and offsets for the variable placeholder.
        // The `+1` for startIndex is to select *inside* the brackets `[` `]`.
        // The `endIndex` already points to `]`, so `endIndex + 1` is the offset *after* `]`.
        // To select the content *inside* [VAR], we want `startIndex + 1` to `endIndex`.
        const startNodeInfo = this.dom.getTextNodeAndOffsetAtCharIndex(editableDiv, firstVariable.startIndex);
        const endNodeInfo = this.dom.getTextNodeAndOffsetAtCharIndex(editableDiv, firstVariable.endIndex + 1);


        if (startNodeInfo && endNodeInfo) {
          const range = document.createRange();
          try {
            range.setStart(startNodeInfo.node, startNodeInfo.offset);
            range.setEnd(endNodeInfo.node, endNodeInfo.offset);
            selection.removeAllRanges();
            selection.addRange(range);
            // console.log(`Omni Max [TemplateHandling]: Variable "${firstVariable.word}" selected.`);
          } catch (rangeError) {
             console.warn("Omni Max [TemplateHandling]: Error setting range for variable selection. Moving cursor to end.", rangeError);
             this.dom.moveCursorToEnd(editableDiv);
          }
        } else {
          console.warn("Omni Max [TemplateHandling]: Could not find text nodes for variable selection. Moving cursor to end.");
          this.dom.moveCursorToEnd(editableDiv);
        }
      } else {
        // If no variables are found to select, move the cursor to the end of the editable div.
        this.dom.moveCursorToEnd(editableDiv);
      }
    } catch (error) {
      console.error("Omni Max [TemplateHandling]: Error processing Tab key press:", error);
      if (editableDiv) this.dom.moveCursorToEnd(editableDiv); // Fallback
    }
  }


  /**
   * Handles the `keydown` event, specifically for the Tab key within the configured editable chatbox.
   * It checks if the template processing module is enabled before proceeding.
   * @param {KeyboardEvent} event The `keydown` event object.
   */
  private async onKeyDown(event: KeyboardEvent): Promise<void> {
    // Check if the "Template Processor" module is enabled
    const settings = await chrome.storage.sync.get(['omniMaxGlobalEnabled', 'omniMaxModuleStates']);
    const isGlobalEnabled = settings.omniMaxGlobalEnabled !== false; // Default true
    const moduleStates = settings.omniMaxModuleStates || {};
    const isTemplateProcessorEnabled = moduleStates['templateProcessor'] !== false; // Default true

    if (!isGlobalEnabled || !isTemplateProcessorEnabled) {
      return; // Do nothing if the module or global extension is disabled
    }

    // Check if Tab key was pressed and the target is the configured editable chatbox
    if (event.key !== 'Tab' || !(event.target instanceof HTMLElement) || !event.target.matches(this.config.selectors.editableChatbox)) {
      return;
    }

    event.preventDefault(); // Prevent default Tab behavior (e.g., changing focus)
    event.stopPropagation(); // Stop the event from bubbling further

    this.handleTabPressLogic(event.target as HTMLElement);
  }

  /**
   * Attaches the keyboard event listener to the document to listen for Tab key presses
   * in the relevant context.
   * Ensures the listener is not attached multiple times.
   */
  public attachListeners(): void {
    document.removeEventListener('keydown', this.boundOnKeyDown, true);
    document.addEventListener('keydown', this.boundOnKeyDown, true); // Use capture phase
    console.log("Omni Max [TemplateHandlingService]: Tab key listener attached.");
  }

  /**
   * Detaches the keyboard event listener from the document.
   */
  public detachListeners(): void {
    document.removeEventListener('keydown', this.boundOnKeyDown, true);
    console.log("Omni Max [TemplateHandlingService]: Tab key listener detached.");
  }
}