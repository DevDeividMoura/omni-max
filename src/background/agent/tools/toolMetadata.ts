// File: src/background/agent/tools/toolMetadata.ts

/**
 * @interface ToolMetadata
 * @description Describes the metadata for a tool, using i18n keys for display strings.
 */
export interface ToolMetadata {
  /**
   * The unique identifier for the tool. Must match the tool's name in the masterToolRegistry.
   */
  id: string;

  /**
   * The i18n key for the tool's user-friendly name.
   * Example: "modules.tools.get_entire_protocol_history.name"
   */
  name_i18n_key: string; // <-- CORRIGIDO

  /**
   * The i18n key for the tool's description, used for tooltips.
   * Example: "modules.tools.get_entire_protocol_history.description"
   */
  description_i18n_key: string; // <-- CORRIGIDO
}

/**
 * @const {ToolMetadata[]} AVAILABLE_TOOLS_METADATA
 * @description A list of metadata for all available tools in the system.
 */
export const AVAILABLE_TOOLS_METADATA: ToolMetadata[] = [
  {
    id: 'get_entire_protocol_history',
    name_i18n_key: 'modules.tools.get_entire_protocol_history.name',
    description_i18n_key: 'modules.tools.get_entire_protocol_history.description'
  },
  {
    id: 'get_latest_messages_from_session',
    name_i18n_key: 'modules.tools.get_latest_messages_from_session.name',
    description_i18n_key: 'modules.tools.get_latest_messages_from_session.description'
  },
];