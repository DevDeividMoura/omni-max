// src/content/services/TemplateHandlingService.ts
import { get } from 'svelte/store';
import { globalExtensionEnabledStore, moduleStatesStore } from '../../storage/stores';
import type { Config } from '../config';
import type { DomService } from './DomService';

export class TemplateHandlingService {
  private config: Config;
  private dom: DomService;
  private bracketRegex = /\[([^\]]+)\]/g; // Regex for finding placeholders like [VARIABLE]
  private boundOnKeyDown: (event: KeyboardEvent) => Promise<void>;

  constructor(config: Config, domService: DomService) {
    this.config = config;
    this.dom = domService;
    this.boundOnKeyDown = this.onKeyDown.bind(this);
  }

  private capitalizeFirstName(fullName: string): string {
    if (!fullName || typeof fullName !== 'string') return '';
    const firstName = fullName.split(' ')[0];
    return firstName
      ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      : '';
  }

  private transformTemplateText(text: string): string {
    // Adicionada verificação para robustez
    if (typeof text !== 'string') {
      // console.warn("Omni Max [TemplateHandlingService]: transformTemplateText received non-string input:", text);
      return ''; // Retornar string vazia para entradas não-string
    }
    return text.replace(/\{([^}]+)\}/g, (_, placeholderContent) =>
      this.capitalizeFirstName(placeholderContent.trim())
    );
  }

  private findSelectableVariables(text: string): Array<{ word: string, startIndex: number, endIndex: number }> {
    // Adicionada verificação para robustez
    if (typeof text !== 'string') {
      // console.warn("Omni Max [TemplateHandlingService]: findSelectableVariables received non-string input:", text);
      return []; // Retornar array vazio para entradas não-string
    }
    const matches: Array<{ word: string, startIndex: number, endIndex: number }> = [];
    let matchResult;
    this.bracketRegex.lastIndex = 0;

    while ((matchResult = this.bracketRegex.exec(text)) !== null) {
      matches.push({
        word: matchResult[1],
        startIndex: matchResult.index,
        endIndex: this.bracketRegex.lastIndex - 1,
      });
    }
    return matches;
  }

  private async handleTabPressLogic(editableDiv: HTMLElement): Promise<void> {
    try {
      let currentText = this.dom.getTextSafely(editableDiv);
      let transformedText = this.transformTemplateText(currentText);

      if (editableDiv.textContent !== transformedText) {
        editableDiv.textContent = transformedText;
        await this.dom.waitNextFrame();
        currentText = transformedText; // Reatribuir após a atualização do DOM
      }

      const selectableVariables = this.findSelectableVariables(currentText);

      if (selectableVariables.length > 0) {
        const firstVariable = selectableVariables[0];
        const selection = window.getSelection();
        if (!selection) return;

        const startNodeInfo = this.dom.getTextNodeAndOffsetAtCharIndex(editableDiv, firstVariable.startIndex);
        const endNodeInfo = this.dom.getTextNodeAndOffsetAtCharIndex(editableDiv, firstVariable.endIndex + 1);

        if (startNodeInfo && endNodeInfo) {
          const range = document.createRange();
          try {
            range.setStart(startNodeInfo.node, startNodeInfo.offset);
            range.setEnd(endNodeInfo.node, endNodeInfo.offset);
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (rangeError) {
            console.warn("Omni Max [TemplateHandling]: Error setting range for variable selection. Moving cursor to end.", rangeError);
            this.dom.moveCursorToEnd(editableDiv);
          }
        } else {
          console.warn("Omni Max [TemplateHandling]: Could not find text nodes for variable selection. Moving cursor to end.");
          this.dom.moveCursorToEnd(editableDiv);
        }
      } else {
        this.dom.moveCursorToEnd(editableDiv);
      }
    } catch (error) {
      console.error("Omni Max [TemplateHandling]: Error processing Tab key press:", error);
      if (editableDiv) this.dom.moveCursorToEnd(editableDiv); // Fallback
    }
  }

  private async onKeyDown(event: KeyboardEvent): Promise<void> {
    const globalEnable = get(globalExtensionEnabledStore);
    const modules = get(moduleStatesStore);
    const enabled = modules['templateProcessor'] !== false;
    if (!globalEnable || !enabled) return;

    if (event.key !== 'Tab' || !(event.target instanceof HTMLElement) || !event.target.matches(this.config.selectors.editableChatbox)) {
      return;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 30); // Pequeno delay para garantir que o DOM esteja pronto, se necessário
      });
    });

    this.handleTabPressLogic(event.target as HTMLElement);
  }

  public attachListeners(): void {
    document.removeEventListener('keydown', this.boundOnKeyDown, true);
    document.addEventListener('keydown', this.boundOnKeyDown, true);
    console.log("Omni Max [TemplateHandlingService]: Tab key listener attached.");
  }

  public detachListeners(): void {
    document.removeEventListener('keydown', this.boundOnKeyDown, true);
    console.log("Omni Max [TemplateHandlingService]: Tab key listener detached.");
  }
}