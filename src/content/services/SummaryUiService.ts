// src/content/services/SummaryUiService.ts
import { marked } from 'marked';
import type { DomService } from './DomService';
import type { AIServiceManager } from '../../ai/AIServiceManager';
import type { MatrixApiService } from './MatrixApiService';
import type { SummaryCacheService } from './SummaryCacheService';
import type { ActiveChatContext, CustomerServiceSession } from '../types';
import { maskSensitiveDocumentNumbers, decodeHtmlEntities } from '../../utils';

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
    private getActiveChatContextCallback: () => ActiveChatContext | null
  ) {
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
   * Includes base styles, layout for loading states, content display, and animations.
   * Note: Styles for the injected summary button (which lives in the Light DOM) are
   * also included here for reference but are primarily applied inline or via global CSS.
   * @returns {string} The CSS style string.
   * @private
   */
  private getPopupStyles(): string {
    // Styles for the injected button are duplicated: here for reference/Shadow DOM fallback,
    // and applied inline when the button is created in injectSummaryButton.
    // Ideally, Light DOM button styling should come from a global stylesheet.
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

      /* Styles for the summary button (for reference, primarily applied inline or via global CSS) */
      .${SUMMARY_BUTTON_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 12px;
        border-radius: 20px;
        background-image: linear-gradient(to right, #a9276f, #d02125, #d6621c);
        color: white;
        font-size: 12px;
        font-weight: 500;
        border: none;
        cursor: pointer;
        text-decoration: none;
        transition: filter 0.2s ease-out;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .${SUMMARY_BUTTON_CLASS}:hover {
        filter: brightness(110%);
      }
      .${SUMMARY_BUTTON_CLASS} svg {
        width: 12px;
        height: 12px;
        margin-right: 5px;
        fill: "#ffffff";
      }
    `;
  }

  /**
   * Creates the basic HTML structure for the summary popup and appends it to the DOM (hidden initially).
   * This includes the Shadow DOM host, stylesheet, overlay, and main popup elements.
   * This method should only execute once.
   * @private
   */
  private createPopupBaseLayout(): void {
    if (this.domService.query(`#${SUMMARY_POPUP_HOST_ID}`)) return; // Prevent multiple creations

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

    const popupInner = this.domService.createElementWithOptions('div', { className: 'popup-inner', parent: this.popupMainElement });
    if (!popupInner) return;

    const header = this.domService.createElementWithOptions('div', { className: 'popup-header', parent: popupInner });
    if (!header) return;

    this.domService.createElementWithOptions('h3', { className: 'popup-title', textContent: 'Resumo da Conversa', parent: header });
    const closeButton = this.domService.createElementWithOptions('button', {
      className: 'close-button',
      attributes: { title: 'Fechar', 'aria-label': 'Fechar resumo' },
      parent: header,
    });

    if (closeButton) {
      closeButton.innerHTML = CLOSE_ICON_SVG;
      closeButton.addEventListener('click', () => this.hide());
    }

    this.popupContentAreaElement = this.domService.createElementWithOptions('div', {
      id: 'popup-content-area-dynamic', // For potential targeting
      parent: popupInner,
    });
  }

  /**
   * Updates the content of the summary popup based on the current loading state and summary text.
   * Renders a loading skeleton or the (Markdown-parsed) summary.
   * @private
   */
  private updatePopupContent(): void {
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
            <span class="loading-text-span">Analisando conversa...</span>
          </div>
        </div>`;
    } else {
      try {
        // Use `marked.parse` for potentially safer HTML output if `this.currentSummaryText` is untrusted.
        // Ensure `marked` is configured to sanitize if necessary, or trust the source of `currentSummaryText`.
        const rawHtml = marked.parse(this.currentSummaryText || "Nenhum resumo disponível.");
        this.popupContentAreaElement.innerHTML = `<div class="summary-content">${rawHtml}</div>`;
      } catch (error) {
        console.error("Omni Max [SummaryUiService]: Error parsing Markdown for summary:", error);
        this.popupContentAreaElement.innerHTML = `<div class="summary-content">Erro ao renderizar o resumo.</div>`;
      }
    }
  }
  
  /**
   * Injects a "Resumir" (Summarize) button into the specified container element on the page.
   * The button, when clicked, will trigger the summary generation and display process.
   * @param {HTMLDivElement} targetButtonContainerDiv The `div` element where the summary button should be injected.
   * @param {string} initialProtocolNumber The protocol number associated with the chat context where the button is injected.
   * @param {string} initialContactId The contact ID associated with the chat context.
   */
  public injectSummaryButton(
    targetButtonContainerDiv: HTMLDivElement,
    initialProtocolNumber: string,
    initialContactId: string
  ): void {
    if (targetButtonContainerDiv.querySelector(`.${SUMMARY_BUTTON_CLASS}`)) {
      // console.log("Omni Max [SummaryUiService]: Summary button already injected.");
      return; // Button already exists
    }

    const summaryButtonElement = this.domService.createElementWithOptions('button', {
      className: SUMMARY_BUTTON_CLASS,
      // Inline styles are applied here to ensure consistent appearance in the Light DOM,
      // regardless of external stylesheets. The class can be used for overrides or global styling.
      styles: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '4px 12px', borderRadius: '20px',
        backgroundImage: 'linear-gradient(to right, #a9276f, #d02125, #d6621c)',
        color: 'white', fontSize: '12px', fontWeight: '500',
        border: 'none', cursor: 'pointer', textDecoration: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        verticalAlign: 'middle', // Helps align with other inline-block elements
      }
    });

    if (!summaryButtonElement) {
        console.error("Omni Max [SummaryUiService]: Failed to create summary button element.");
        return;
    }
    
    summaryButtonElement.innerHTML = `${SPARKLES_SVG_WHITE} <span style="margin-left: 5px;">Resumir</span>`;
    // Ensure SVG within the button is styled correctly.
    const svgElement = summaryButtonElement.querySelector('svg');
    if(svgElement) {
        this.domService.applyStyles(svgElement, {
            width: '14px', height: '14px', fill: '#ffffff'
        });
    }

    summaryButtonElement.addEventListener('click', async (event: MouseEvent) => {
       event.preventDefault();
      event.stopPropagation(); // Prevent event from bubbling up.
      if (this.isPopupVisible) {
        this.hide();
      } else {
        let currentProtocolNumber = initialProtocolNumber;
        let currentContactId = initialContactId;

        // If initial IDs are not available (e.g., button context changed), try to get active context.
        if (!currentProtocolNumber || !currentContactId) {
          const activeChatCtx = this.getActiveChatContextCallback();
          if (activeChatCtx) {
            currentProtocolNumber = activeChatCtx.protocolNumber; // Use updated type property
            currentContactId = activeChatCtx.contactId;         // Use updated type property
          }
        }
        
        if (currentProtocolNumber && currentContactId) {
          const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          await this.showAndGenerateSummary(buttonRect, currentProtocolNumber, currentContactId);
        } else {
          console.warn("Omni Max [SummaryUiService]: Protocol number or Contact ID could not be determined to generate summary.");
          alert("Omni Max: Não foi possível identificar o atendimento ativo para resumir.");
        }
      }
    });

    // Insert the button strategically, e.g., before the first existing link or button.
    const firstInteractiveElement = targetButtonContainerDiv.querySelector('a, button');
    if (firstInteractiveElement) {
      targetButtonContainerDiv.insertBefore(summaryButtonElement, firstInteractiveElement);
    } else {
      targetButtonContainerDiv.appendChild(summaryButtonElement); // Fallback if no other elements
    }
    
    console.log(`Omni Max [SummaryUiService]: Summary button injected into:`, targetButtonContainerDiv);
  }

  /**
   * Shows the summary popup, positions it near the trigger button, and initiates
   * the summary generation process (fetching from cache or generating via AI).
   * @param {DOMRect} triggerButtonRect The DOMRect of the button that triggered the popup, used for positioning.
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
    this.currentSummaryText = ""; // Clear previous summary

    if (!this.summaryPopupHostElement.isConnected) {
      document.body.appendChild(this.summaryPopupHostElement);
    }

    this.domService.applyStyles(this.popupMainElement, {
      left: `${this.currentPopupPosition.x}px`,
      bottom: `${window.innerHeight - this.currentPopupPosition.y + 10}px`, // Position above button
      transform: 'translateX(-50%)',
      display: 'block',
    });
    this.domService.applyStyles(this.popupOverlayElement, { display: 'block' });
    document.body.style.overflow = 'hidden'; // Prevent page scroll when popup is open
    this.updatePopupContent(); // Show loading state
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
                    const customerNameForContext = currentSession.contactName || "Cliente";
                    
                    // Adiciona informações do cabeçalho do atendimento
                    let conversationPreamble = `Início do atendimento do protocolo ${protocolNumber} com ${customerNameForContext}.\n`;
                    if(currentSession.originalAttendanceIds.length > 1) {
                        conversationPreamble += `Este protocolo inclui múltiplos segmentos de atendimento fundidos (IDs: ${currentSession.originalAttendanceIds.join(', ')}).\n`;
                    }
                    conversationPreamble += "\n";

                    const conversationTurns = currentSession.messages.map(msg => {
                        const decodedContent = decodeHtmlEntities(msg.content); // Decodifica HTML entities
                        const maskedContent = maskSensitiveDocumentNumbers(decodedContent); // Mascara documentos
                        
                        // Determina o display name do remetente.
                        // msg.senderName já foi preenchido pelo MatrixApiService.
                        let senderDisplayName = msg.senderName;

                        // Para clareza, podemos adicionar o tipo de remetente (Cliente, Atendente, Sistema)
                        let roleLabel = "Desconhecido";
                        if (msg.role === 'customer') roleLabel = "Cliente";
                        else if (msg.role === 'agent') roleLabel = "Atendente";
                        else if (msg.role === 'system') roleLabel = "Sistema/Chatbot";
                        
                        return `${senderDisplayName} (${roleLabel}): ${maskedContent}`;
                    }).join('\n\n');
                    
                    const fullConversationForAI = conversationPreamble + conversationTurns;

                    console.log(`Omni Max [SummaryUiService]: Generating summary for protocol ${protocolNumber}. Full context for AI: ${fullConversationForAI.substring(0,1000)}...`);
                    const newSummary = await this.aiManager.generateSummary(fullConversationForAI);
                    
                    // Decidir se o newSummary precisa ser mascarado também.
                    // Por enquanto, vamos assumir que o prompt da IA cuida disso.
                    await this.summaryCacheService.saveSummary(protocolNumber, newSummary);
                    this.currentSummaryText = newSummary;
                } else {
                    this.currentSummaryText = "Nenhuma mensagem encontrada para este atendimento ou protocolo.";
                }
                this.isLoadingSummary = false;
            }
        } catch (error: any) {
            console.error(`Omni Max [SummaryUiService]: Error processing summary for protocol ${protocolNumber}:`, error);
            this.isLoadingSummary = false;
            this.currentSummaryText = `Erro ao gerar resumo: ${error.message || 'Erro desconhecido.'}`;
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
    document.body.style.overflow = ''; // Restore page scroll
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  /**
   * Handles the 'Escape' key press to hide the summary popup.
   * @param {KeyboardEvent} event The keyboard event.
   * @private
   */
  private handleEscapeKey = (event: KeyboardEvent): void => {
    // Bound function for add/removeEventListener
    if (event.key === 'Escape') {
      this.hide();
    }
  };
}