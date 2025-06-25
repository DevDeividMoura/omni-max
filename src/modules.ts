/**
 * @file src/modules.ts
 * @description Defines the available modules in the Omni Max extension, their properties,
 * and helper functions to retrieve their initial states.
 */

/**
 * @type ModuleCategory
 * @description Defines the valid categories a module can belong to. This is used for grouping in the UI.
 */
export type ModuleCategory = 'general' | 'shortcut' | 'ai';

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
   * @property {ModuleCategory} category - The category the module belongs to, for UI grouping.
   */
  category: ModuleCategory;

  /**
   * @property {string} name - User-friendly name of the module, displayed in the UI (i18n key).
   */
  name: string;

  /**
   * @property {string} description - Detailed description of what the module does (i18n key).
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
}

/**
 * @const {Module[]} availableModules
 * @description List of all available modules in the Omni Max extension.
 * This array serves as the single source of truth for module definitions.
 */
export const availableModules: Module[] = [
  {
    id: 'layoutCorrection',
    category: 'general',
    name: 'modules.general.layout_correction.name',
    description: 'modules.general.layout_correction.description',
    defaultEnabled: false,
    released: true,
  },
  {
    id: 'templateProcessor',
    category: 'general',
    name: 'modules.general.template_processor.name',
    description: 'modules.general.template_processor.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutCopyName',
    category: 'shortcut',
    name: 'modules.shortcuts.shortcut_copy_name.name',
    description: 'modules.shortcuts.shortcut_copy_name.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutCopyDocumentNumber',
    category: 'shortcut',
    name: 'modules.shortcuts.shortcut_copy_document_number.name',
    description: 'modules.shortcuts.shortcut_copy_document_number.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutServiceOrderTemplate',
    category: 'shortcut',
    name: 'modules.shortcuts.shortcut_service_order_template.name',
    description: 'modules.shortcuts.shortcut_service_order_template.description',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'aiAssistant',
    category: 'ai',
    name: 'modules.ai.ai_assistant.name',
    description: 'modules.ai.ai_assistant.description',
    defaultEnabled: true,
    released: true,
  },
];

/**
 * Generates an initial state object for all defined modules.
 * @returns {Record<string, boolean>} An object where keys are module IDs and values are their default enabled status.
 */
export function getInitialModuleStates(): Record<string, boolean> {
  const initialState: Record<string, boolean> = {};
  for (const module of availableModules) {
    initialState[module.id] = module.defaultEnabled;
  }
  return initialState;
}