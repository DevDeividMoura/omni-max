import { type Tool } from "@langchain/core/tools";
import { AGENT_TOOLS_METADATA } from "./toolMetadata"; // Importa a nossa fonte da verdade
import { getEntireProtocolHistoryTool, getLatestMessagesFromSessionTool } from './ascSacTools';

/**
 * @description Ferramentas que o AGENTE (LLM) tem permissão para usar.
 * Este registro é GERADO DINAMICAMENTE a partir de AGENT_TOOLS_METADATA.
 * Não é necessário editar este objeto diretamente.
 */
export const agentTools: Record<string, Tool> = Object.fromEntries(
  AGENT_TOOLS_METADATA.map(meta => [meta.id, meta.tool])
);

/**
 * @description Ferramentas de USO INTERNO do grafo.
 * Este registro permanece o mesmo, separado e seguro.
 */
export const contextTools = {
  getEntireProtocolHistoryTool,
  getLatestMessagesFromSessionTool,
};