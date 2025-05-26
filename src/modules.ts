/**
 * src/modules.ts
 * Defines the available modules in the Omni Max extension, their properties,
 * and helper functions to get their initial states.
 */

/**
 * Interface describing the structure of a configurable module.
 */
export interface Module {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
}

/**
 * List of all available modules in the Omni Max extension.
 * This is the single source of truth for module definitions.
 */
export const availableModules: Module[] = [
  {
    id: 'layoutCorrection',
    name: 'Correção de Layout',
    description: 'Aplica pequenos ajustes no layout da plataforma Matrix Go para melhor usabilidade.',
    defaultEnabled: true,
  },
  {
    id: 'shortcutCopyName',
    name: 'Atalho: Copiar Nome do Cliente',
    description: 'Permite copiar o nome do cliente usando um atalho de teclado (padrão: Ctrl+Shift+X).',
    defaultEnabled: true,
  },
  {
    id: 'shortcutCopyCPF',
    name: 'Atalho: Copiar CPF do Cliente',
    description: 'Permite copiar o CPF do cliente usando um atalho de teclado (padrão: Ctrl+Shift+C).',
    defaultEnabled: true,
  },
  {
    id: 'messageTemplates',
    name: 'Templates de Mensagens',
    description: 'Acesso rápido a respostas e mensagens pré-definidas para agilizar o atendimento.',
    defaultEnabled: true,
  },
  {
    id: 'templateProcessor',
    name: 'Processador de Templates (Automático)',
    description: 'Sugere ou aplica templates de forma mais automática durante a interação (funcionalidade futura).',
    defaultEnabled: false,
  },
  {
    id: 'aiChatSummary',
    name: 'IA: Resumir Atendimento',
    description: 'Gera um resumo do histórico da conversa atual utilizando Inteligência Artificial.',
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
 * This object maps module IDs to their default enabled/disabled status.
 * Useful for initializing the persistent storage.
 * @returns {Record<string, boolean>} An object like { moduleId1: true, moduleId2: false, ... }
 */
export function getInitialModuleStates(): Record<string, boolean> {
  const initialState: Record<string, boolean> = {};
  for (const module of availableModules) {
    initialState[module.id] = module.defaultEnabled;
  }
  return initialState;
}