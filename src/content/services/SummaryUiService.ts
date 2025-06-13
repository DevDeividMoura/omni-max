import { mount } from 'svelte';
import { get } from 'svelte/store';
import { summaryPopupStore } from '../../components/summary/summaryPopupStore';
import popupStyles from '../../components/summary/SummaryPopup.css?inline';
import type { DomService } from './DomService';
import type { AIServiceManager } from '../../ai/AIServiceManager';
import type { MatrixApiService } from './MatrixApiService';
import type { SummaryCacheService } from './SummaryCacheService';
import type { ActiveChatContext } from '../types';
import type { Translator } from '../../i18n/translator.content';
import SummaryPopup from '../../components/summary/SummaryPopup.svelte';

/** CSS class for the summary button injected into the page. */
export const SUMMARY_BUTTON_CLASS = 'omni-max-summary-action-button-preview';

/** ID for the host element where the Svelte component will be mounted. */
const SUMMARY_POPUP_HOST_ID = 'omni-max-summary-popup-host';

/** SVG icon for sparkles, used on the summary button (white version). */
const SPARKLES_SVG_WHITE = `
<svg width="12" height="12" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(0, 512) scale(1, -1)">
    <path fill="#FFFFFF" fill-opacity="1" d="M6.7 188.3c50.8 12.9 90.8 52.9 103.7 103.7c1.2 4.9 7.5 4.9 8.8 0c12.9-50.8 52.9-90.8 103.7-103.7c4.9-1.2 4.9-7.5 0-8.8C172 166.7 132 126.7 119.2 75.9c-1.2-4.9-7.5-4.9-8.8 0c-12.9 50.8-52.9 90.8-103.7 103.7c-4.9 1.2-4.9 7.5 0 8.7z" />
    <path fill="#FFFFFF" fill-opacity="1" d="M180 350.7c76 19.3 135.9 79.1 155.1 155.1c1.9 7.3 11.3 7.3 13.1 0c19.3-76 79.1-135.9 155.1-155.1c7.3-1.9 7.3-11.3 0-13.1c-76-19.3-135.9-79.1-155.1-155.1c-1.9-7.3-11.3-7.3-13.1 0c-19.3 76-79.1 135.9-155.1 155.1c-7.3 1.8-7.3 11.2 0 13.1z" />
  </g>
</svg>`;

/**
 * @class SummaryUiService
 * @description Manages the lifecycle of the summary UI. It injects the summary button
 * and controls the mounting and properties of the `SummaryPopup.svelte` component.
 */
export class SummaryUiService {
  private t: (key: string, options?: { values?: Record<string, string | number> }) => Promise<string>;

  constructor(
    private domService: DomService,
    private aiManager: AIServiceManager,
    private matrixApiService: MatrixApiService,
    private summaryCacheService: SummaryCacheService,
    private getActiveChatContextCallback: () => ActiveChatContext | null,
    private translator: Translator,
  ) {
    this.t = this.translator.t.bind(this.translator);
    this.initialize();
  }

  /**
   * Creates a host element and mounts the SummaryPopup component into it once.
   * @private
   */
  private initialize(): void {
    if (this.domService.query(`#${SUMMARY_POPUP_HOST_ID}`)) return;

    const host = this.domService.createElementWithOptions('div', {
        id: SUMMARY_POPUP_HOST_ID,
        parent: document.body,
    });
    
    // Attach the shadow root
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const styleEl = document.createElement('style');
    styleEl.textContent = popupStyles;
    shadowRoot.appendChild(styleEl);

    // Mount the component inside the shadow root
    mount(SummaryPopup, {
      target: shadowRoot,
      props: {
        aiManager: this.aiManager,
        matrixApiService: this.matrixApiService,
        summaryCacheService: this.summaryCacheService,
        translator: this.translator,
      }
    });
  }

  /**
   * Injects a "Summarize" button into the specified container on the page.
   * @param {HTMLDivElement} targetButtonContainerDiv The container for the button.
   * @param {string} initialProtocolNumber The protocol number for the context.
   * @param {string} initialContactId The contact ID for the context.
   */
  public async injectSummaryButton(
    targetButtonContainerDiv: HTMLDivElement,
    initialProtocolNumber: string,
    initialContactId: string
  ): Promise<void> {
    if (targetButtonContainerDiv.querySelector(`.${SUMMARY_BUTTON_CLASS}`) || targetButtonContainerDiv.dataset.omniMaxSummaryButtonInjected === 'true') {
      return;
    }
    targetButtonContainerDiv.dataset.omniMaxSummaryButtonInjected = 'true';

    const buttonText = await this.t('content.summary_button.label');
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
    summaryButtonElement.innerHTML = `${SPARKLES_SVG_WHITE} <span style="margin-left: 5px;">${buttonText}</span>`;

    summaryButtonElement.addEventListener('click', async (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        console.log("Omni Max: Summary button clicked."); // Log para depuração

        const isCurrentlyVisible = get(summaryPopupStore).isVisible;
        console.log(`Omni Max: Popup is currently visible? ${isCurrentlyVisible}`); // Log para depuração

        if (isCurrentlyVisible) {
            summaryPopupStore.hide();
        } else {
            const activeChatCtx = this.getActiveChatContextCallback();
            const protocolNumber = activeChatCtx?.protocolNumber || initialProtocolNumber;
            const contactId = activeChatCtx?.contactId || initialContactId;

            if (protocolNumber && contactId) {
                const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                console.log("Omni Max: Showing popup with context:", { protocolNumber, contactId }); // Log para depuração
                summaryPopupStore.show({
                    triggerButtonRect: buttonRect,
                    protocolNumber: protocolNumber,
                    contactId: contactId,
                });
            } else {
                console.warn("Omni Max: Could not determine context to generate summary.");
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
  }
}