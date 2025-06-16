import { localstorageAdapter } from '../../storage/ChromeStorageLocalAdapter';

/**
 * @interface AgentSessionState
 * @description Defines the data structure for a single agent session to be persisted.
 */
export interface AgentSessionState {
  /** The complete state of the LangGraph agent's conversation. */
  agentGraphState: any; // Using `any` for now, will be replaced by LangGraph's state type.

  /** The timestamp of the last client message processed by the agent. */
  lastProcessedClientMessageTimestamp: number | null;
}

const SESSION_KEY_PREFIX = 'agent-session-';

/**
 * Creates the storage key for a given session ID.
 * @param atendimentoId The unique ID of the customer service session.
 * @returns The formatted storage key.
 */
function getStorageKey(atendimentoId: string): string {
  return `${SESSION_KEY_PREFIX}${atendimentoId}`;
}

/**
 * Retrieves the persisted state for a specific agent session.
 * @param atendimentoId The ID of the session to retrieve.
 * @returns A promise resolving to the session state, or null if not found.
 */
export async function getAgentSession(atendimentoId: string): Promise<AgentSessionState | null> {
  const key = getStorageKey(atendimentoId);
  const session = await localstorageAdapter.get<AgentSessionState>(key);
  return session || null;
}

/**
 * Saves the state for a specific agent session.
 * @param atendimentoId The ID of the session to save.
 * @param state The agent session state to persist.
 */
export async function saveAgentSession(atendimentoId: string, state: AgentSessionState): Promise<void> {
  const key = getStorageKey(atendimentoId);
  await localstorageAdapter.set(key, state);
}