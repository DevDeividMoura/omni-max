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