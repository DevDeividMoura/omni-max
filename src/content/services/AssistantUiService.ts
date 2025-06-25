import { mount } from 'svelte';
import type { DomService } from './DomService';
import type { ActiveChatContext } from '../types';
import type { Translator } from '../../i18n/translator.content';
import { assistantPopupStore } from '../components/assistant/assistantPopupStore';
import popupStyles from '../components/assistant/AIAssistantPopup.css?inline';
import AIAssistantPopup from '../components/assistant/AIAssistantPopup.svelte';
import { AgentService } from './AgentService'; // <-- Importando o novo serviço

export const ASSISTANT_BUTTON_CLASS = 'omni-max-assistant-button';
const ASSISTANT_POPUP_HOST_ID = 'omni-max-assistant-popup-host';

const ASSISTANT_ICON_SVG = `
<svg width="10" height="10" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" preserveAspectRatio="xMidYMid meet">
  <g transform="translate(0, 512) scale(1, -1)">
    <path fill="#FFFFFF" fill-opacity="1" d="M6.7 188.3c50.8 12.9 90.8 52.9 103.7 103.7c1.2 4.9 7.5 4.9 8.8 0c12.9-50.8 52.9-90.8 103.7-103.7c4.9-1.2 4.9-7.5 0-8.8C172 166.7 132 126.7 119.2 75.9c-1.2-4.9-7.5-4.9-8.8 0c-12.9 50.8-52.9 90.8-103.7 103.7c-4.9 1.2-4.9 7.5 0 8.7z" />
    <path fill="#FFFFFF" fill-opacity="1" d="M180 350.7c76 19.3 135.9 79.1 155.1 155.1c1.9 7.3 11.3 7.3 13.1 0c19.3-76 79.1-135.9 155.1-155.1c7.3-1.9 7.3-11.3 0-13.1c-76-19.3-135.9-79.1-155.1-155.1c-1.9-7.3-11.3-7.3-13.1 0c-19.3 76-79.1 135.9-155.1 155.1c-7.3 1.8-7.3 11.2 0 13.1z" />
  </g>
</svg>`;

export class AssistantUiService {
  private t: (key: string, options?: { values: Record<string, any> }) => Promise<string>;
  private agentService: AgentService; // <-- Armazena a instância do AgentService

  constructor(
    private domService: DomService,
    private translator: Translator
  ) {
    this.t = this.translator.t.bind(this.translator);
    this.agentService = new AgentService(); // <-- Instancia o serviço aqui
    this.initialize();
  }

  /**
   * Creates a host element and mounts the AIAssistantPopup component into it ONCE.
   */
  private initialize(): void {
    if (this.domService.query(`#${ASSISTANT_POPUP_HOST_ID}`)) return;

    const host = this.domService.createElementWithOptions('div', {
      id: ASSISTANT_POPUP_HOST_ID,
      parent: document.body,
    });

    const shadowRoot = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = popupStyles;
    shadowRoot.appendChild(styleEl);

    // Mount the component once, passing the correct dependencies
    mount(AIAssistantPopup, {
      target: shadowRoot,
      props: {
        translator: this.translator,
        agentService: this.agentService, // <-- Passa o AgentService para o componente
      }
    });
  }

  /**
   * Injects the Assistant button into the specified container on the page.
   */
  public async injectAssistantButton(targetContainer: HTMLElement, context: ActiveChatContext): Promise<void> {
    if (targetContainer.querySelector(`.${ASSISTANT_BUTTON_CLASS}`) || targetContainer.dataset.omniMaxAssistantButtonInjected === 'true') {
      return;
    }
    targetContainer.dataset.omniMaxAssistantButtonInjected = 'true';

    const buttonText = await this.t('assistant.button_label');
    const assistantButton = this.domService.createElementWithOptions('button', {
      className: ASSISTANT_BUTTON_CLASS,
      styles: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '4px 10px', borderRadius: '20px',
        background: 'linear-gradient(to right, #a9276f, #d02125, #d6621c)',
        color: 'white', fontSize: '10px', fontWeight: '500',
        border: 'none', cursor: 'pointer', marginLeft: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }
    });

    assistantButton.innerHTML = `${ASSISTANT_ICON_SVG} <span style="margin-left: 3px;">${buttonText}</span>`;

    assistantButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();

      // Passa o objeto de contexto completo para a store
      assistantPopupStore.show({
        context: context, // Passa o objeto context inteiro
        triggerButtonRect: buttonRect
      });
    });

    targetContainer.prepend(assistantButton);
  }
}