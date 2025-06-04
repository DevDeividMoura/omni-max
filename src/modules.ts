// src/modules.ts
/**
 * src/modules.ts
 * Defines the available modules in the Omni Max extension, their properties,
 * and helper functions to get their initial states.
 */

// Importante: As chaves aqui devem corresponder às chaves em PromptsConfig
import type { PromptsConfig } from './storage/stores';

/**
 * Interface describing the structure of a configurable module within the extension.
 */
export interface Module {
  /** Unique identifier for the module. */
  id: string;
  /** User-friendly name of the module, displayed in the UI. */
  name: string;
  /** Detailed description of what the module does, displayed in the UI. */
  description: string;
  /** Default enabled state of the module upon first installation. */
  defaultEnabled: boolean;
  /**
   * Indicates if the feature is released and should be visible/usable.
   * Defaults to true if undefined.
   */
  released?: boolean;
  /**
   * Configuration for prompts associated with AI modules.
   */
  promptSettings?: {
    /** Label for the prompt input field in the UI. */
    label: string;
    /** Key in the PromptsConfig store where this prompt's value is stored. */
    configKey: keyof PromptsConfig;
    /** Placeholder text for the textarea. */
    placeholder: string;
  };
}

/**
 * List of all available modules in the Omni Max extension.
 * This array serves as the single source of truth for module definitions.
 */
export const availableModules: Module[] = [
  {
    id: 'layoutCorrection',
    name: 'Correção de Layout',
    description: 'Move a lista de conversas para a direia e limita a altura 70% da tela para melhor usabilidade.',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutCopyName',
    name: 'Atalho: Copiar Nome do Cliente',
    description: 'Permite copiar o nome do cliente usando um atalho de teclado (padrão: Ctrl+Shift+Z).',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutCopyDocumentNumber',
    name: 'Atalho: Copiar Número do Documento do Cliente',
    description: 'Permite copiar o Número do Documento do cliente usando um atalho de teclado (padrão: Ctrl+Shift+X).',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'shortcutServiceOrderTemplate',
    name: 'Atalho: Template de Ordem de Serviço',
    description: 'Copia um template de Ordem de Serviço para a área de transferência com Telefone e Protocolo pré-preenchidos (padrão: Ctrl+Shift+S).',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'templateProcessor',
    name: 'Processador de Templates de Mensagens',
    description: 'Ajusta o nome do cliente ({ANA MARIA} => Ana), auto seleciona variavel ([VARIAVEL]) com Tab.',
    defaultEnabled: true,
    released: true,
  },
  {
    id: 'aiChatSummary',
    name: 'IA: Resumir Atendimento',
    description: 'Gera um resumo do histórico da conversa (protocolo) atual utilizando Inteligência Artificial.',
    defaultEnabled: false, // Começa desabilitado por padrão
    released: true,      // Funcionalidade está liberada
    promptSettings: {
      label: 'Prompt de Resumo do Atendimento',
      configKey: 'summaryPrompt',
      placeholder: 'Ex: Resuma esta conversa de forma concisa, focando no problema principal do cliente e na solução oferecida.'
    }
  },
  {
    id: 'aiResponseReview',
    name: 'IA: Revisar e Melhorar Resposta',
    description: 'Utiliza IA para analisar e sugerir melhorias no texto da sua resposta antes do envio.',
    defaultEnabled: false, // Começa desabilitado por padrão
    released: false,     // <<< FUNCIONALIDADE NÃO LIBERADA NESTA VERSÃO
    promptSettings: {
      label: 'Prompt de Melhoria de Resposta',
      configKey: 'improvementPrompt',
      placeholder: 'Ex: Revise a seguinte resposta para um cliente, tornando-a mais clara, empática e profissional, mantendo o significado original e o tom amigável.'
    }
  }
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