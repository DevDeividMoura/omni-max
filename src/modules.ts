/**
 * @file src/modules.ts
 * @description Defines the available modules in the Omni Max extension, their properties,
 * and helper functions to retrieve their initial states.
 */

// Important: The keys here should correspond to the keys in PromptsConfig
import type { PromptsConfig } from './storage/stores';

/**
 * @interface Module
 * @description Describes the structure of a configurable module within the extension.
 */
export interface Module {
  /**
   * @property {string} id - Unique identifier for the module.
   */
  id: string;

  /**
   * @property {string} name - User-friendly name of the module, displayed in the UI.
   */
  name: string;

  /**
   * @property {string} description - Detailed description of what the module does, displayed in the UI.
   */
  description: string;

  /**
   * @property {boolean} defaultEnabled - Default enabled state of the module upon first installation.
   */
  defaultEnabled: boolean;

  /**
   * @property {boolean} [released] - Indicates if the feature is released and should be visible/usable.
   * Defaults to true if undefined.
   */
  released?: boolean;

  /**
   * @property {object} [promptSettings] - Configuration for prompts associated with AI modules.
   */
  promptSettings?: {
    /**
     * @property {string} label - Label for the prompt input field in the UI.
     */
    label: string;
    /**
     * @property {keyof PromptsConfig} configKey - Key in the PromptsConfig store where this prompt's value is stored.
     * It's crucial that this key matches a property in the `PromptsConfig` type.
     */
    configKey: keyof PromptsConfig;
    /**
     * @property {string} placeholder - Placeholder text for the textarea.
     */
    placeholder: string;
  };
}

/**
 * @const {Module[]} availableModules
 * @description List of all available modules in the Omni Max extension.
 * This array serves as the single source of truth for module definitions.
 */
export const availableModules: Module[] = [
  {
    id: 'layoutCorrection',
    name: 'modules.general.layout_correction.name',
    description: 'modules.general.layout_correction.description',
    defaultEnabled: false,
    released: true,
  },
  {
    id: 'templateProcessor',
    name: 'modules.general.template_processor.name',
    description: 'modules.general.template_processor.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutCopyName',
    name: 'modules.shortcuts.shortcut_copy_name.name',
    description: 'modules.shortcuts.shortcut_copy_name.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutCopyDocumentNumber',
    name: 'modules.shortcuts.shortcut_copy_document_number.name',
    description: 'modules.shortcuts.shortcut_copy_document_number.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutServiceOrderTemplate',
    name: 'modules.shortcuts.shortcut_service_order_template.name',
    description: 'modules.shortcuts.shortcut_service_order_template.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'aiChatSummary',
    name: 'modules.ai.ai_chat_summary.name',
    description: 'modules.ai.ai_chat_summary.description',
    defaultEnabled: true,
    released: true,
    promptSettings: {
      label: 'modules.prompts.summary_prompt.label',
      configKey: 'summaryPrompt',
      placeholder: 'modules.prompts.summary_prompt.placeholder'
    }
  },
  {
    id: 'aiResponseReview',
    name: 'modules.ai.ai_response_review.name',
    description: 'modules.ai.ai_response_review.description',
    defaultEnabled: false,
    released: false,     // <<< FEATURE NOT RELEASED IN THIS VERSION
    promptSettings: {
      label: 'modules.prompts.improvement_prompt.label',
      configKey: 'improvementPrompt',
      placeholder: 'modules.prompts.improvement_prompt.placeholder'
    }
  },
];

/**
 * Generates an initial state object for all defined modules.
 * This object maps module IDs to their default enabled/disabled status,
 * which is useful for initializing persistent storage when the extension is first run
 * or when new modules are introduced.
 * @returns {Record<string, boolean>} An object where keys are module IDs and values are their default enabled status (e.g., { moduleId1: true, moduleId2: false }).
 */
export function getInitialModuleStates(): Record<string, boolean> {
  const initialState: Record<string, boolean> = {};
  for (const module of availableModules) {
    initialState[module.id] = module.defaultEnabled;
  }
  return initialState;
}