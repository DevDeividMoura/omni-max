import type { BaseMessage } from "@langchain/core/messages";

/**
 * @interface AgentState
 * @description Defines the state of our LangGraph agent for a single customer session.
 * This structure is passed between the nodes of the graph.
 */
export interface AgentState {
  // A lista de mensagens da conversa entre o atendente e o agente de IA.
  messages: BaseMessage[];

  // O prompt de sistema da persona atualmente ativa.
  system_prompt: string;

  // A lista de nomes de ferramentas que a persona ativa pode usar.
  available_tool_names: string[];
}