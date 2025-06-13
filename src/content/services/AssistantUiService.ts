import { mount } from 'svelte';
import type { DomService } from './DomService';
import type { ActiveChatContext } from '../types';
import type { Translator } from '../../i18n/translator.content';
import { assistantPopupStore } from '../../components/assistant/assistantPopupStore';
import popupStyles from '../../components/assistant/AIAssistantPopup.css?inline';
import AIAssistantPopup from '../../components/assistant/AIAssistantPopup.svelte';

export const ASSISTANT_BUTTON_CLASS = 'omni-max-assistant-button';
const ASSISTANT_POPUP_HOST_ID = 'omni-max-assistant-popup-host';

const ASSISTANT_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m12 3-1.9 4.8-4.8 1.9 4.8 1.9L12 16l1.9-4.8 4.8-1.9-4.8-1.9L12 3z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
</svg>`;

export class AssistantUiService {
  private t: (key: string) => Promise<string>;

  constructor(
    private domService: DomService,
    private translator: Translator,
  ) {
    this.t = this.translator.t.bind(this.translator);
    this.initialize();
  }

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

    assistantPopupStore.subscribe(state => {
      // Remove o componente se não estiver visível
      const existingComponent = shadowRoot.querySelector('div.popup-overlay');
      if (!state.isVisible && existingComponent) {
        existingComponent.parentElement?.remove();
      }
      
      // Monta se estiver visível e ainda não montado
      if (state.isVisible && !existingComponent) {
        const componentHost = document.createElement('div');
        shadowRoot.appendChild(componentHost);
        mount(AIAssistantPopup, {
          target: componentHost,
          props: {
            translator: this.translator,
            protocolNumber: state.protocolNumber,
          }
        });
      }
    });
  }

  public async injectAssistantButton(targetContainer: HTMLElement, context: ActiveChatContext): Promise<void> {
    if (targetContainer.querySelector(`.${ASSISTANT_BUTTON_CLASS}`)) return;

    const buttonText = await this.t('assistant.button_label');
    const assistantButton = this.domService.createElementWithOptions('button', {
      className: ASSISTANT_BUTTON_CLASS,
      styles: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '4px 12px', borderRadius: '20px',
        background: 'linear-gradient(to right, #8b5cf6, #3b82f6)', // Roxo para azul
        color: 'white', fontSize: '12px', fontWeight: '500',
        border: 'none', cursor: 'pointer', marginLeft: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }
    });

    assistantButton.innerHTML = `${ASSISTANT_ICON_SVG} <span style="margin-left: 5px;">${buttonText}</span>`;

    assistantButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log('Assistente clicado para o protocolo:', context.protocolNumber);
      assistantPopupStore.show({ protocolNumber: context.protocolNumber });
    });

    // Inserir ao lado do botão de resumo, se existir
    const summaryButton = targetContainer.querySelector('.omni-max-summary-action-button-preview');
    if (summaryButton && summaryButton.nextSibling) {
      targetContainer.insertBefore(assistantButton, summaryButton.nextSibling);
    } else if (summaryButton) {
      targetContainer.appendChild(assistantButton);
    } else {
       targetContainer.prepend(assistantButton);
    }
  }
}