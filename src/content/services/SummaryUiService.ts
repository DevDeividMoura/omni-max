// src/content/services/SummaryUiService.ts
import { marked } from 'marked';
import type { DomService } from './DomService';
import type { AIServiceManager } from '../../ai/AIServiceManager';
import type { MatrixApiService } from './MatrixApiService';
import type { SummaryCacheService } from './SummaryCacheService';
import type { ActiveChatContext, CustomerServiceSession } from '../types';
import { maskSensitiveDocumentNumbers, decodeHtmlEntities } from '../../utils';
import { getLocaleFromAgent } from '../../utils/language';
import { Translator } from '../../i18n/translator.content';

/** SVG icon for the close button. */
const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

/** CSS class for the summary button injected into the page. */
export const SUMMARY_BUTTON_CLASS = 'omni-max-summary-action-button-preview';

/** ID for the host element of the summary popup (Shadow DOM). */
const SUMMARY_POPUP_HOST_ID = 'omni-max-summary-popup-host';

/** SVG icon for sparkles, used on the summary button (white version). */
const SPARKLES_SVG_WHITE = `
<svg
  width="12"
  height="12"
  viewBox="0 0 512 512"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  role="img"
  preserveAspectRatio="xMidYMid meet"
>
  <g transform="translate(0, 512) scale(1, -1)">
    <path
      fill="#FFFFFF"
      fill-opacity="1"
      d="M6.7 188.3c50.8 12.9 90.8 52.9 103.7 103.7c1.2 4.9 7.5 4.9 8.8 0c12.9-50.8 52.9-90.8 103.7-103.7c4.9-1.2 4.9-7.5 0-8.8C172 166.7 132 126.7 119.2 75.9c-1.2-4.9-7.5-4.9-8.8 0c-12.9 50.8-52.9 90.8-103.7 103.7c-4.9 1.2-4.9 7.5 0 8.7z"
    />
    <path
      fill="#FFFFFF"
      fill-opacity="1"
      d="M180 350.7c76 19.3 135.9 79.1 155.1 155.1c1.9 7.3 11.3 7.3 13.1 0c19.3-76 79.1-135.9 155.1-155.1c7.3-1.9 7.3-11.3 0-13.1c-76-19.3-135.9-79.1-155.1-155.1c-1.9-7.3-11.3-7.3-13.1 0c-19.3 76-79.1 135.9-155.1 155.1c-7.3 1.8-7.3 11.2 0 13.1z"
    />
  </g>
</svg>
`;

/**
 * @class SummaryUiService
 * @description Manages the UI for displaying chat summaries, including injecting
 * a summary button onto the page and showing a popup with the summary content.
 * It interacts with AI services for summary generation, caching services,
 * and API services for fetching chat data.
 */
export class SummaryUiService {
  private summaryPopupHostElement: HTMLDivElement | null = null;
  private summaryPopupShadowRoot: ShadowRoot | null = null;
  private popupMainElement: HTMLElement | null = null;
  private popupContentAreaElement: HTMLElement | null = null;
  private popupOverlayElement: HTMLElement | null = null;

  private isPopupVisible = false;
  private isLoadingSummary = false;
  private currentSummaryText = "";
  private currentPopupPosition = { x: 0, y: 0 };

  /** Tracks active summary generation requests to prevent duplicates for the same protocol. Key is protocolNumber. */
  private activeSummaryRequests: { [protocolNumber: string]: boolean } = {};
  private t: (key: string, options?: { values?: Record<string, string | number> }) => Promise<string>;


  /**
   * Constructs an instance of SummaryUiService.
   * @param {DomService} domService Service for DOM manipulations.
   * @param {AIServiceManager} aiManager Manager for AI service interactions (e.g., summary generation).
   * @param {MatrixApiService} matrixApiService Service for fetching data from the Matrix API.
   * @param {SummaryCacheService} summaryCacheService Service for caching and retrieving summaries.
   * @param {() => ActiveChatContext | null} getActiveChatContextCallback Callback function to get the current active chat context.
   */
  constructor(
    private domService: DomService,
    private aiManager: AIServiceManager,
    private matrixApiService: MatrixApiService,
    private summaryCacheService: SummaryCacheService,
    private getActiveChatContextCallback: () => ActiveChatContext | null,
    private translator: Translator
  ) {
    this.t = this.translator.t.bind(this.translator);
    this.initialize();
  }

  /**
   * Initializes the service, primarily by creating the base layout for the summary popup.
   * @private
   */
  private initialize(): void {
    this.createPopupBaseLayout();
  }

  /**
   * Generates the CSS styles for the summary popup's Shadow DOM.
   * @returns {string} The CSS style string.
   * @private
   */
  private getPopupStyles(): string {
    return `
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; font-size: 14px; }
      
      /* Popup Styles */
      .popup-wrapper { position: fixed; background-color: white; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 2px solid transparent; background-clip: padding-box, border-box; background-origin: border-box; background-image: linear-gradient(white, white), linear-gradient(to right, #a9276f, #d02125, #d6621c); z-index: 2147483647; max-width: 48rem; width: 40rem; overflow: hidden; display: none; }
      .popup-inner { padding: 1rem; }
      .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
      .popup-title { font-size: 2rem; font-weight: 600; color: #1f2937; }
      .close-button { padding: 0.5rem; border-radius: 9999px; background-color: transparent; border: none; cursor: pointer; transition: background-color 0.2s ease-in-out; }
      .close-button:hover { background-color: #f3f4f6; }
      .close-button svg { color: #6b7280; display: block; }
      .loading-state > *:not(:last-child) { margin-bottom: 0.75rem; }
      .skeleton-lines > *:not(:last-child) { margin-bottom: 0.5rem; }
      .skeleton-line { height: 1.5rem; background-image: linear-gradient(to right, #fbcfe8, #fecaca, #fed7aa); border-radius: 0.25rem; animation: pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite; }
      .skeleton-line.w-3-4 { width: 75%; }
      .skeleton-line.w-1-2 { width: 50%; }
      .loading-text-container { font-size: 1.25rem; color: #6b7280; display: flex; align-items: center; gap: 0.5rem; }
      .dot { width: 0.5rem; height: 0.5rem; background-image: linear-gradient(to right, #ec4899, #f56565, #ed8936); border-radius: 9999px; animation: bounce 1s infinite; }
      .dot:nth-child(2) { animation-delay: 0.1s; }
      .dot:nth-child(3) { animation-delay: 0.2s; }
      .loading-text-span { margin-left: 0.5rem; }
      .summary-content { color: #374151; line-height: 1.625; min-height: 70px; max-height: 400px; overflow-y: auto; word-wrap: break-word; }
      .summary-content::-webkit-scrollbar { width: 6px; }
      .summary-content::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
      .summary-content h1, .summary-content h2, .summary-content h3 { margin-top: 0.5em; margin-bottom: 0.25em; line-height: 1.2; }
      .summary-content p { margin-bottom: 0.5em; }
      .summary-content ul, .summary-content ol { margin-left: 1.5em; margin-bottom: 0.5em; }
      .summary-content li { margin-bottom: 0.25em; }
      .summary-content strong, .summary-content b { font-weight: 600; }
      .summary-content em, .summary-content i { font-style: italic; }
      .summary-content pre { background-color: #f3f4f6; padding: 0.5rem; border-radius: 0.25rem; overflow-x: auto; margin-bottom: 0.5em; }
      .summary-content code { font-family: monospace; background-color: #e5e7eb; padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
      .summary-content pre code { background-color: transparent; padding: 0; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      @keyframes bounce { 0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); } 50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); } }
      .popup-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483646; background-color: rgba(0,0,0,0.1); }
    `;
  }

  /**
   * Creates the basic HTML structure for the summary popup.
   * @private
   */
  private async createPopupBaseLayout(): Promise<void> {
    if (this.domService.query(`#${SUMMARY_POPUP_HOST_ID}`)) return;

    this.summaryPopupHostElement = this.domService.createElementWithOptions('div', { id: SUMMARY_POPUP_HOST_ID });
    if (!this.summaryPopupHostElement) {
      console.error("Omni Max [SummaryUiService]: Failed to create summary popup host element.");
      return;
    }
    this.summaryPopupShadowRoot = this.summaryPopupHostElement.attachShadow({ mode: 'open' });

    const styleSheet = this.domService.createElementWithOptions('style', { textContent: this.getPopupStyles() });
    if (styleSheet) this.summaryPopupShadowRoot.appendChild(styleSheet);

    this.popupOverlayElement = this.domService.createElementWithOptions('div', {
      className: 'popup-overlay',
      parent: this.summaryPopupShadowRoot,
      styles: { display: 'none' },
    });
    if (this.popupOverlayElement) {
      this.popupOverlayElement.addEventListener('click', () => this.hide());
    }

    this.popupMainElement = this.domService.createElementWithOptions('div', {
      className: 'popup-wrapper',
      parent: this.summaryPopupShadowRoot,
    });
    if (!this.popupMainElement) return;

    const popupInner = this.domService.createElementWithOptions('div', { className: 'popup-inner', parent: this.popupMainElement! });
    const header = this.domService.createElementWithOptions('div', { className: 'popup-header', parent: popupInner });

    this.domService.createElementWithOptions('h3', {
      className: 'popup-title',
      textContent: await this.t('content.summary_popup.title'), // Traduzido
      parent: header
    });

    const closeButton = this.domService.createElementWithOptions('button', {
      className: 'close-button',
      attributes: {
        title: await this.t('content.summary_popup.close_button_title'), // Traduzido
        'aria-label': await this.t('content.summary_popup.close_button_aria_label') // Traduzido
      },
      parent: header,
    });

    if (closeButton) {
      closeButton.innerHTML = CLOSE_ICON_SVG;
      closeButton.addEventListener('click', () => this.hide());
    }

    this.popupContentAreaElement = this.domService.createElementWithOptions('div', {
      id: 'popup-content-area-dynamic',
      parent: popupInner,
    });
  }

  /**
   * Updates the content of the summary popup based on the current loading state and summary text.
   * @private
   */
  private async updatePopupContent(): Promise<void> {
    if (!this.popupContentAreaElement) return;

    if (this.isLoadingSummary) {
      this.popupContentAreaElement.innerHTML = `
        <div class="loading-state">
          <div class="skeleton-lines">
            <div class="skeleton-line"></div>
            <div class="skeleton-line w-3-4"></div>
            <div class="skeleton-line w-1-2"></div>
          </div>
          <div class="loading-text-container">
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            <span class="loading-text-span">${ await this.t('content.summary_popup.loading_text')}</span>
          </div>
        </div>`;
    } else {
      try {
        const defaultText = await this.t('content.summary_popup.no_summary_available'); // Traduzido
        const rawHtml = marked.parse(this.currentSummaryText || defaultText);
        this.popupContentAreaElement.innerHTML = `<div class="summary-content">${rawHtml}</div>`;
      } catch (error) {
        const errorText = await this.t('content.summary_popup.error_generating', { values: { message: 'render error' } });
        this.popupContentAreaElement.innerHTML = `<div class="summary-content">${errorText}</div>`;
      }
    }
  }

  /**
   * Injects a "Resumir" (Summarize) button into the specified container element on the page.
   * @param {HTMLDivElement} targetButtonContainerDiv The `div` element where the summary button should be injected.
   * @param {string} initialProtocolNumber The protocol number associated with the chat context.
   * @param {string} initialContactId The contact ID associated with the chat context.
   */
  public async injectSummaryButton(
    targetButtonContainerDiv: HTMLDivElement,
    initialProtocolNumber: string,
    initialContactId: string
  ): Promise<void> {
    if (
    targetButtonContainerDiv.querySelector(`.${SUMMARY_BUTTON_CLASS}`) || 
    targetButtonContainerDiv.dataset.omniMaxSummaryButtonInjected === 'true'
  ) {
    return;
  }

  targetButtonContainerDiv.dataset.omniMaxSummaryButtonInjected = 'true';

    const summaryButtonElement = this.domService.createElementWithOptions('button', {
      className: SUMMARY_BUTTON_CLASS,
      styles: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '4px 12px', borderRadius: '20px',
        backgroundImage: 'linear-gradient(to right, #a9276f, #d02125, #d6621c)',
        color: 'white', fontSize: '12px', fontWeight: '500',
        border: 'none', cursor: 'pointer', textDecoration: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        verticalAlign: 'middle',
      }
    });

    if (!summaryButtonElement) {
      console.error("Omni Max [SummaryUiService]: Failed to create summary button element.");
      return;
    }

    const buttonText = await this.t('content.summary_button.label'); // Traduzido
    summaryButtonElement.innerHTML = `${SPARKLES_SVG_WHITE} <span style="margin-left: 5px;">${buttonText}</span>`;

    const svgElement = summaryButtonElement.querySelector('svg');
    if (svgElement) {
      this.domService.applyStyles(svgElement, {
        width: '14px', height: '14px', fill: '#ffffff'
      });
    }

    summaryButtonElement.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.isPopupVisible) {
        this.hide();
      } else {
        let currentProtocolNumber = initialProtocolNumber;
        let currentContactId = initialContactId;

        if (!currentProtocolNumber || !currentContactId) {
          const activeChatCtx = this.getActiveChatContextCallback();
          if (activeChatCtx) {
            currentProtocolNumber = activeChatCtx.protocolNumber;
            currentContactId = activeChatCtx.contactId;
          }
        }

        if (currentProtocolNumber && currentContactId) {
          const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          await this.showAndGenerateSummary(buttonRect, currentProtocolNumber, currentContactId);
        } else {
          console.warn("Omni Max [SummaryUiService]: Protocol number or Contact ID could not be determined to generate summary.");
          alert(await this.t('content.summary_button.context_error_alert'));
        }
      }
    });

    const firstInteractiveElement = targetButtonContainerDiv.querySelector('a, button');
    if (firstInteractiveElement) {
      targetButtonContainerDiv.insertBefore(summaryButtonElement, firstInteractiveElement);
    } else {
      targetButtonContainerDiv.appendChild(summaryButtonElement);
    }

    console.log(`Omni Max [SummaryUiService]: Summary button injected into:`, targetButtonContainerDiv);
  }

  /**
   * Shows the summary popup and initiates the summary generation process.
   * @param {DOMRect} triggerButtonRect The DOMRect of the button that triggered the popup.
   * @param {string} protocolNumber The protocol number of the chat to summarize.
   * @param {string} contactId The contact ID associated with the chat.
   * @public
   */
  public async showAndGenerateSummary(
    triggerButtonRect: DOMRect,
    protocolNumber: string,
    contactId: string
  ): Promise<void> {
    if (!triggerButtonRect || !this.summaryPopupHostElement || !this.popupMainElement || !this.popupOverlayElement) {
      console.error("Omni Max [SummaryUiService]: Popup elements not properly initialized. Cannot show summary.");
      return;
    }

    this.currentPopupPosition = { x: triggerButtonRect.left + triggerButtonRect.width / 2, y: triggerButtonRect.top };
    this.isPopupVisible = true;
    this.isLoadingSummary = true;
    this.currentSummaryText = "";

    if (!this.summaryPopupHostElement.isConnected) {
      document.body.appendChild(this.summaryPopupHostElement);
    }

    this.domService.applyStyles(this.popupMainElement, {
      left: `${this.currentPopupPosition.x}px`,
      bottom: `${window.innerHeight - this.currentPopupPosition.y + 10}px`,
      transform: 'translateX(-50%)',
      display: 'block',
    });
    this.domService.applyStyles(this.popupOverlayElement, { display: 'block' });
    document.body.style.overflow = 'hidden';
    this.updatePopupContent();
    document.addEventListener('keydown', this.handleEscapeKey);

    if (this.activeSummaryRequests[protocolNumber]) {
      console.log(`Omni Max [SummaryUiService]: Summary generation for protocol ${protocolNumber} is already in progress.`);
      return;
    }
    this.activeSummaryRequests[protocolNumber] = true;

    try {
      const cachedSummary = await this.summaryCacheService.getSummary(protocolNumber);
      if (cachedSummary) {
        this.currentSummaryText = cachedSummary;
        this.isLoadingSummary = false;
      } else {
        const allContactSessions: CustomerServiceSession[] = await this.matrixApiService.getAtendimentosByContato(contactId);
        const currentSession = allContactSessions.find(session => session.protocolNumber === protocolNumber);

        if (currentSession && currentSession.messages.length > 0) {
          const customerNameForContext = currentSession.contactName || await this.t('content.ai_context.role_customer');

          let conversationPreamble = await this.t('content.ai_context.preamble_start', { values: { protocolNumber, customerName: customerNameForContext } });
          if (currentSession.originalAttendanceIds.length > 1) {
            conversationPreamble += await this.t('content.ai_context.preamble_segments', { values: { ids: currentSession.originalAttendanceIds.join(', ') } });
          }
          conversationPreamble += "\n\n";

          // Substituímos o .map() por um loop for...of para usar await
          const conversationTurns: string[] = [];
          for (const msg of currentSession.messages) {
            const maskedContent = maskSensitiveDocumentNumbers(decodeHtmlEntities(msg.content));
            let roleLabel: string;
            
            // Usamos await para cada tradução
            switch (msg.role) {
              case 'customer': roleLabel = await this.t('content.ai_context.role_customer'); break;
              case 'agent': roleLabel = await this.t('content.ai_context.role_agent'); break;
              case 'system': roleLabel = await this.t('content.ai_context.role_system'); break;
              default: roleLabel = await this.t('content.ai_context.role_unknown');
            }
            conversationTurns.push(`${msg.senderName} (${roleLabel}): ${maskedContent}`);
          }
          
          // Junta as partes traduzidas
          const fullConversationForAI = conversationPreamble + conversationTurns.join('\n\n');
          
          const currentLocale = getLocaleFromAgent(); 
          
          const newSummary = await this.aiManager.generateSummary(fullConversationForAI, currentLocale); 

          await this.summaryCacheService.saveSummary(protocolNumber, newSummary);
          this.currentSummaryText = newSummary;
        } else {
          this.currentSummaryText = await this.t('content.summary_popup.no_summary_available');
        }
        this.isLoadingSummary = false;
      }
    } catch (error: any) {
      console.error(`Omni Max [SummaryUiService]: Error processing summary for protocol ${protocolNumber}:`, error);
      this.isLoadingSummary = false;
      const message = error.message || await this.t('content.summary_popup.error_generating_unknown');
      this.currentSummaryText = await this.t('content.summary_popup.error_generating', { values: { message } });
    } finally {
      delete this.activeSummaryRequests[protocolNumber];
      if (this.isPopupVisible) {
        this.updatePopupContent();
      }
    }
  }

  /**
   * Hides the summary popup and restores page scroll.
   * @public
   */
  public hide(): void {
    if (!this.popupMainElement || !this.popupOverlayElement) return;
    this.isPopupVisible = false;
    this.domService.applyStyles(this.popupMainElement, { display: 'none' });
    this.domService.applyStyles(this.popupOverlayElement, { display: 'none' });
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  /**
   * Handles the 'Escape' key press to hide the summary popup.
   * @private
   */
  private handleEscapeKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.hide();
    }
  };
}