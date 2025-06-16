import { getEntireProtocolHistoryTool, getLatestMessagesFromSessionTool } from './ascSacTools'; // <-- Importação atualizada

// A registry of all available tools for the agent.
export const masterToolRegistry = {
  [getEntireProtocolHistoryTool.name]: getEntireProtocolHistoryTool,
  [getLatestMessagesFromSessionTool.name]: getLatestMessagesFromSessionTool,
};