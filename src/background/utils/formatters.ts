/**
 * @file src/background/utils/formatters.ts
 * @description Utility functions for processing and formatting data for the agent.
 */
import { decodeHtmlEntities } from "../../utils";
import type { RawMessage, ProcessedMessage } from '../types/ascsac';

/**
 * Processes raw API messages into a structured, application-level format.
 */
export function processRawMessages(
  rawMessages: RawMessage[],
  contactName: string,
  agentName: string
): ProcessedMessage[] {
  return rawMessages.map(rawMsg => {
    const role = rawMsg.bol_automatica === "1" ? 'system' : (rawMsg.bol_entrante === "1" ? 'customer' : 'agent');
    let senderName = "Unknown";
    if (role === 'customer') senderName = contactName;
    if (role === 'agent') senderName = agentName;
    if (role === 'system') senderName = "System";

    return {
      role: role,
      senderName: senderName,
      content: rawMsg.dsc_msg,
      timestamp: new Date(rawMsg.dat_original || 0),
    };
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Formats an array of processed messages into a single string for the LLM.
 */
export function formatMessagesForLLM(messages: ProcessedMessage[]): string {
  if (messages.length === 0) {
    return "No messages found.";
  }
  const formattedTurns = messages.map(msg => {
    const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    return `${msg.senderName} (${roleLabel}) at ${msg.timestamp.toISOString()}:\n${decodeHtmlEntities(msg.content)}`;
  });
  return `Conversation History:\n${formattedTurns.join('\n---\n')}`;
}