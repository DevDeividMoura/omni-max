import { type Tool } from "@langchain/core/tools";
import { knowledgeBaseSearchTool } from './knowledgeBaseTool';
// Importe aqui todas as ferramentas que o AGENTE pode usar

/**
 * @interface AgentToolMetadata
 * @description Descreve uma ferramenta do agente, incluindo sua implementação e metadados para a UI.
 */
export interface AgentToolMetadata {
  id: string; // Deve ser igual ao `tool.name`
  tool: Tool; // O objeto da ferramenta real
  name: string; // Chave para o nome na UI
  description: string; // Chave para a descrição na UI
}

/**
 * @const AGENT_TOOLS_METADATA
 * @description A lista definitiva de TODAS as ferramentas disponíveis para o AGENTE.
 * Esta é a ÚNICA lista que você precisa manter.
 * A UI de configuração de personas usará esta lista para renderizar os checkboxes.
 */
export const AGENT_TOOLS_METADATA: AgentToolMetadata[] = [
  // Ferramentas internas como 'get_entire_protocol_history' foram REMOVIDAS daqui.
  {
    id: 'knowledge_base_search',
    tool: knowledgeBaseSearchTool as unknown as Tool,
    name: 'Knowledge Base Search',
    description: 'Searches the knowledge base for relevant information.',
  }

  // Adicione aqui outras ferramentas do agente no futuro...
];