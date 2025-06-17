import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";
import { addMessages, type Messages } from "@langchain/langgraph";
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
  base_url: z.string().url(),

  // --- Checkpoint for Client Conversation ---
  /**
   * The Unix timestamp (ms) of the last client message processed by the agent.
   * This allows the agent to fetch only new messages, making it more efficient.
   * It is updated by the agent after processing new context.
   */
  last_processed_client_message_timestamp: z.number().nullable().default(null),
});

export type AgentState = z.infer<typeof AgentStateSchema>;