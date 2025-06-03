// src/content/types.ts

/**
 * @interface RawMessageFromApi
 * @description Defines the structure of a raw message object as received from an external API.
 * Property names reflect the API's schema.
 */
export interface RawMessageFromApi {
  /**
   * Indicates the direction of the message.
   * "0": Outgoing message (sent by the agent).
   * "1": Incoming message (received from the customer).
   */
  bol_entrante: "0" | "1";

  /** The raw text content of the message. */
  dsc_msg: string;

  /**
   * The display timestamp of the message from the API.
   * @example "01/10/2024 22:00:16"
   */
  dat_msg: string;

  /**
   * The original, sortable timestamp of the message from the API.
   * Preferably in an ISO-like format.
   * @example "2024-10-01 22:00:16"
   */
  dat_original: string;
  // Add other raw message fields from the API as needed.
}

/**
 * @interface RawServiceItemFromApi
 * @description Defines the structure of a raw customer service session (atendimento) item
 * as received from an external API. Property names reflect the API's schema.
 * The term "ServiceItem" is used to distinguish from the internal "CustomerServiceSession".
 */
export interface RawServiceItemFromApi {
  /** The protocol number associated with the service session. */
  num_protocolo: string | number;

  /** The unique identifier for the service session (atendimento). */
  cod_atendimento: string | number;

  /**
   * The timestamp for when the service session occurred or was last updated.
   * @example "02/10/2024 08:09:45"
   */
  dat_atendimento: string;

  /** Optional array of raw messages associated with this service session. */
  msgs?: RawMessageFromApi[]; // Updated to use RawMessageFromApi

  /** Optional contact name associated with this service session. */
  nom_contato?: string;

  /** Optional CPF or CNPJ number of the contact. */
  num_cpf?: string; // Could be CPF or CNPJ

  /** Optional contact phone number. */
  telefone_contato?: string;
  // Add other raw service session fields from the API as needed.
}

/**
 * @interface ApiResponse
 * @description Defines the general structure of a response from an external API
 * that returns a list of service session items. Property names reflect the API's schema.
 */
export interface ApiResponse {
  /**
   * Indicates the success status of the API call.
   * 1 for success, 0 for failure.
   */
  success: 0 | 1;

  /** Array of raw service session items returned by the API. */
  data: RawServiceItemFromApi[]; // Updated to use RawServiceItemFromApi
  // Add other general API response fields as needed.
}

// --- Application-Specific Internal Types (Normalized and in English) ---

/**
 * @interface Message
 * @description Represents a single message within a conversation in the application's internal format.
 */
export interface Message {
  /** The role of the message sender. */
  role: 'agent' | 'customer';

  /** The content of the message. */
  content: string;

  /** The display timestamp of the message (often in a user-friendly format). */
  displayTimestamp: string;

  /** The Date object representing the message's timestamp, used for internal sorting and processing. */
  timestamp: Date;
}

/**
 * @interface CustomerServiceSession
 * @description Represents a customer service session (atendimento) in the application's internal, processed format.
 * This often aggregates data from one or more `RawServiceItemFromApi` objects.
 */
export interface CustomerServiceSession {
  /** The unique protocol number for the entire interaction. */
  protocolNumber: string;

  /** The unique identifier for the contact (customer). */
  contactId: string;

  /** An array of processed messages belonging to this session. */
  messages: Message[];

  /** Optional name of the contact. */
  contactName?: string;

  /**
   * The contact's document number (CPF or CNPJ).
   * This field is named generically as it can hold either type of document.
   */
  documentNumber?: string;

  /** Optional phone number of the contact. */
  contactPhone?: string;

  /** The original timestamp of the first message in this protocol's history (ISO-like format). */
  firstMessageTimestamp?: string;

  /** The original timestamp of the last message in this protocol's history (ISO-like format). */
  lastMessageTimestamp?: string;

  /** A list of all original `cod_atendimento` IDs that were grouped into this session. */
  originalAttendanceIds: string[];
}

/**
 * @interface SummaryCache
 * @description Defines the structure for storing generated chat summaries in `chrome.storage`.
 * It maps protocol numbers (as strings) to their corresponding summary text.
 */
export interface SummaryCache {
  /** The protocol number serves as the key, and the summary string as the value. */
  [protocolNumber: string]: string;
}

/**
 * @interface ActiveChatContext
 * @description Represents the context of an active chat tab or panel being viewed by the user.
 * This information is typically extracted from the page's DOM or URL.
 */
export interface ActiveChatContext {
  /** The protocol number of the currently active chat. */
  protocolNumber: string;

  /** The specific attendance/service ID of the currently active chat segment. */
  attendanceId: string;

  /** The contact ID associated with the active chat. */
  contactId: string;

  /** Optional reference to the main DOM element of the active chat panel, if needed. */
  panelElement?: HTMLElement;
}