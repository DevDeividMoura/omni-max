import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { AscSacApiService } from "../../services/AscSacApiService";
import { processRawMessages, formatMessagesForLLM } from "../../utils/formatters";
import type { ProcessedMessage } from "../../types/ascsac";

const ascSacApi = new AscSacApiService();

// TOOL 1: MACRO VIEW
const entireProtocolSchema = z.object({
  contactId: z.string().describe("The unique ID of the customer contact."),
  protocolNumber: z.string().describe("The main protocol number to get the complete history for."),
  baseUrl: z.string().url().describe("The base URL of the ASC SAC platform."),
});

export const getEntireProtocolHistoryTool = tool(
  async ({ contactId, protocolNumber, baseUrl }: z.infer<typeof entireProtocolSchema>): Promise<string> => {
    console.log(`[Tool] Fetching entire protocol history for contactId: ${contactId}, protocolNumber: ${protocolNumber}, baseUrl: ${baseUrl}`);
    try {
      const rawSessions = await ascSacApi.getSessionsByContact(contactId, baseUrl);
      const relevantSessions = rawSessions.filter(s => String(s.num_protocolo) === protocolNumber);

      if (relevantSessions.length === 0) {
        return `No service sessions found for protocol number ${protocolNumber}.`;
      }

      const allMessages: ProcessedMessage[] = relevantSessions.flatMap(session =>
        processRawMessages(session.msgs || [], session.nom_contato || "Customer", session.nom_agente || "Agent")
      );

      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return formatMessagesForLLM(allMessages);

    } catch (error: any) {
      return `An error occurred while fetching the protocol history: ${error.message}`;
    }
  },
  {
    name: "get_entire_protocol_history",
    description: "Fetches the complete and unified history of all conversations belonging to a single protocol number. Use this for creating comprehensive summaries or understanding the customer's full journey for a specific issue.",
    schema: entireProtocolSchema,
  }
);

// TOOL 2: MICRO VIEW
const latestMessagesSchema = z.object({
  sessionId: z.string().describe("The unique ID for the CURRENT, ACTIVE service session (cod_atendimento)."),
  baseUrl: z.string().url().describe("The base URL of the ASC SAC platform."),
  since_timestamp: z.number().optional().describe("Optional. Unix timestamp (ms). If provided, only messages AFTER this time are returned."),
});

export const getLatestMessagesFromSessionTool = tool(
  async ({ sessionId, baseUrl, since_timestamp }: z.infer<typeof latestMessagesSchema>): Promise<string> => {
    try {
      const rawMessages = await ascSacApi.getMessagesBySessionId(sessionId, baseUrl);
      if (rawMessages.length === 0) return "No messages found in this specific session.";

      let processedMessages = processRawMessages(rawMessages, "Customer", "Agent");

      if (since_timestamp) {
        processedMessages = processedMessages.filter(msg => msg.timestamp.getTime() > since_timestamp);
      }
      
      return processedMessages.length > 0 ? formatMessagesForLLM(processedMessages) : "No new messages since the last check.";
    } catch (error: any) {
      return `An error occurred while fetching the latest messages: ${error.message}`;
    }
  },
  {
    name: "get_latest_messages_from_session",
    description: "Fetches recent messages from the single, currently active chat session. Use this to get the latest context for real-time questions and context updates.",
    schema: latestMessagesSchema,
  }
);

