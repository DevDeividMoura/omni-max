/**
 * src/modules.ts
 * Defines the available modules in the Omni Max extension, their properties,
 * and helper functions to get their initial states.
 */

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
  },
  {
    id: 'shortcutCopyName',
    name: 'Atalho: Copiar Nome do Cliente',
    description: 'Permite copiar o nome do cliente usando um atalho de teclado (padrão: Ctrl+Shift+Z).',
    defaultEnabled: true,
  },
  {
    id: 'shortcutCopyDocumentNumber',
    name: 'Atalho: Copiar Número do Documento do Cliente',
    description: 'Permite copiar o Número do Documento do cliente usando um atalho de teclado (padrão: Ctrl+Shift+X).',
    defaultEnabled: true,
  },
  {
    id: 'shortcutServiceOrderTemplate',
    name: 'Atalho: Template de Ordem de Serviço',
    description: 'Copia um template de Ordem de Serviço para a área de transferência com Telefone e Protocolo pré-preenchidos (padrão: Ctrl+Shift+S).',
    defaultEnabled: true, // Habilitado por padrão, você decide
  },
  {
    id: 'templateProcessor',
    name: 'Processador de Templates de Mensagens',
    description: 'Ajusta o nome do cliente ({ANA MARIA} => Ana), auto seleciona variavel ([VARIAVEL]) com Tab.',
    defaultEnabled: true,
  },
  {
    id: 'aiChatSummary',
    name: 'IA: Resumir Atendimento',
    description: 'Gera um resumo do histórico da conversa (protocolo) atual utilizando Inteligência Artificial.',
    defaultEnabled: false,
  },
  {
    id: 'aiResponseReview',
    name: 'IA: Revisar e Melhorar Resposta',
    description: 'Utiliza IA para analisar e sugerir melhorias no texto da sua resposta antes do envio.',
    defaultEnabled: false,
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