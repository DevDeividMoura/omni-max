import { z } from "zod";
import { type BaseMessage, type StoredMessage } from "@langchain/core/messages";
import { addMessages, type Messages } from "@langchain/langgraph/web";
import "@langchain/langgraph/zod";

export const AgentStateSchema = z.object({
  // --- Core Conversation State ---
  /**
   * The history of messages between the support agent and the AI agent.
   * This is the agent's short-term memory for the current interaction.
   */
  messages: z
    .custom<BaseMessage[]>()
    .default([])
    .langgraph.reducer<Messages>((left, right) => addMessages(left, right)),

  // --- Dynamic Agent Configuration (from Persona) ---
  /**
   * The system prompt from the currently active persona.
   * Guides the AI's behavior, tone, and goals.
   */
  system_prompt: z.string().default("You are a helpful assistant."),

  /**
   * A list of tool names the active persona can use.
   * Dynamically adjusts the agent's capabilities.
   */
  available_tool_names: z.array(z.string()).default([]),
  
  // --- Static Session Context ---
  /**
   * The main protocol number for the entire customer interaction.
   * Remains constant for the session. Essential for tools like get_entire_protocol_history.
   */
  protocol_number: z.string(),

  /**
   * The ID of the current, active service session (cod_atendimento).
   * Remains constant for the session. Used by tools fetching real-time data.
   */
  attendance_id: z.string(),

  /**
   * The unique ID of the customer contact.
   * Remains constant for the session.
   */
  contact_id: z.string(),
  
  /**
   * The base URL of the ASC SAC platform.
   * Required by API service tools to construct endpoint URLs.
   */
  base_url: z.string().url().optional(),

  // --- Checkpoint for Client Conversation ---
  /**
   * The Unix timestamp (ms) of the last client message processed by the agent.
   * This allows the agent to fetch only new messages, making it more efficient.
   * It is updated by the agent after processing new context.
   */
  last_processed_client_message_timestamp: z.number().nullable().default(null),

  /**
   * The ID of the selected AI provider (e.g., "groq", "openai").
   * Injected at the start of the graph's execution.
   */
  provider: z.string(),

  /**
   * The specific model selected for the chosen provider.
   * Injected at the start.
   */
  model: z.string(),

  /**
   * The API key for the selected provider.
   * Injected securely at the start. Optional for providers that don't use it.
   */
  api_key: z.string().optional(),

  /**
   * The base URL for providers like Ollama.
   * Injected at the start. Optional for most providers.
   */
  llm_base_url: z.string().url().optional(),
  /**
   * The ID of the currently active persona.
   * Used to detect when the user switches personas in the UI.
   */
  persona_id: z.string(),
});

/**
 * Representa a forma do nosso estado quando está serializado no storage.
 * É idêntico ao AgentState, mas a propriedade 'messages' é um array de StoredMessage.
 */
export type StoredAgentState = Omit<AgentState, "messages"> & {
  messages: StoredMessage[];
};

export type AgentState = z.infer<typeof AgentStateSchema>;