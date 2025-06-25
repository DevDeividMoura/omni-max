/**
 * @file src/content/services/AgentService.ts
 * @description Provides a clean interface for UI components to communicate with the background agent.
 */
import type { ActiveChatContext } from '../types';

type InvokePayload = {
    context: ActiveChatContext;
    query: string;
    personaId: string;
}

type ChangePersonaPayload = {
    context: ActiveChatContext;
    newPersonaId: string;
}

export class AgentService {
    /**
     * Sends a query from the user to the background agent for processing.
     * @param payload - The data packet containing context, query, and selected persona.
     * @returns A promise that resolves with the agent's final reply.
     */
    public async invoke(payload: InvokePayload): Promise<any> {
        return chrome.runtime.sendMessage({
            type: 'invokeAgent',
            ...payload
        });
    }

    /**
     * Notifies the background agent that the user has selected a new persona for a session.
     * @param payload - The data packet containing context and the new persona ID.
     */
    public async changePersona(payload: ChangePersonaPayload): Promise<void> {
        await chrome.runtime.sendMessage({
            type: 'changePersona',
            ...payload
        });
    }
}