// src/content/services/SummaryUiService.ts
import { marked } from 'marked';
import type { DomService } from './DomService';
import type { AIServiceManager } from '../../ai/AIServiceManager';
import type { MatrixApiService } from './MatrixApiService';
import type { SummaryCacheService } from './SummaryCacheService';
import type { ActiveChatContext, Atendimento as UserAtendimento } from '../types';

const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
export const SUMMARY_BUTTON_CLASS = 'omni-max-summary-action-button-preview'; // Usando a classe do seu CSS
const SUMMARY_POPUP_HOST_ID = 'omni-max-summary-popup-host';

// SVG das faíscas (branco)
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


export class SummaryUiService {
  private summaryPopupHost: HTMLDivElement | null = null;
  private summaryPopupShadowRoot: ShadowRoot | null = null;
  private popupMainElement: HTMLElement | null = null;
  private popupContentArea: HTMLElement | null = null;
  private popupOverlayElement: HTMLElement | null = null;

  private isVisible = false;
  private isLoading = false;
  private summaryText = "";
  private currentPosition = { x: 0, y: 0 };
  private requestStatus: { [protocolo: string]: boolean } = {};

  constructor(
    private domService: DomService,
    private aiManager: AIServiceManager,
    private matrixApiService: MatrixApiService,
    private summaryCacheService: SummaryCacheService,
    private getActiveChatContextCallback: () => ActiveChatContext | null
  ) {
    this.initialize();
  }

  private initialize(): void {
    this.createPopupBaseLayout();
  }

  private getPopupStyles(): string {
    // Adiciona o estilo do botão ao CSS do Shadow DOM, caso queira usá-lo lá no futuro,
    // mas principalmente para ter todas as definições de estilo juntas.
    // O botão real será injetado no Light DOM e usará estilos globais ou inline.
    return `
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; font-size: 14px; }
      
      /* Estilos do Popup */
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

      /* Estilo para o novo botão "Resumir" (igual ao seu CSS, para referência aqui) */
      .${SUMMARY_BUTTON_CLASS} { /* A classe real será aplicada ao botão no Light DOM */
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
        fill: "#ffffff"; /* Herda a cor branca do botão */
      }
    `;
  }

  private createPopupBaseLayout(): void { /* ... (Como antes) ... */
    if (this.domService.query(`#${SUMMARY_POPUP_HOST_ID}`)) return;
    this.summaryPopupHost = this.domService.createElementWithOptions('div', { id: SUMMARY_POPUP_HOST_ID });
    this.summaryPopupShadowRoot = this.summaryPopupHost.attachShadow({ mode: 'open' });
    const styleSheet = this.domService.createElementWithOptions('style', { textContent: this.getPopupStyles() });
    this.summaryPopupShadowRoot.appendChild(styleSheet); // Adiciona todos estilos, incluindo o do botão para referência
    this.popupOverlayElement = this.domService.createElementWithOptions('div', {
        className: 'popup-overlay', parent: this.summaryPopupShadowRoot, styles: { display: 'none' },
    });
    this.popupOverlayElement.addEventListener('click', () => this.hide());
    this.popupMainElement = this.domService.createElementWithOptions('div', { className: 'popup-wrapper', parent: this.summaryPopupShadowRoot });
    const popupInner = this.domService.createElementWithOptions('div', { className: 'popup-inner', parent: this.popupMainElement });
    const header = this.domService.createElementWithOptions('div', { className: 'popup-header', parent: popupInner });
    this.domService.createElementWithOptions('h3', { className: 'popup-title', textContent: 'Resumo da Conversa', parent: header });
    const closeButton = this.domService.createElementWithOptions('button', { className: 'close-button', attributes: { title: 'Fechar' }, parent: header });
    closeButton.innerHTML = CLOSE_ICON_SVG;
    closeButton.addEventListener('click', () => this.hide());
    this.popupContentArea = this.domService.createElementWithOptions('div', { id: 'popup-content-area-dynamic', parent: popupInner });
  }

  private updatePopupContent(): void { /* ... (Como antes) ... */
     if (!this.popupContentArea) return;
     if (this.isLoading) {
         this.popupContentArea.innerHTML = `
         <div class="loading-state">
             <div class="skeleton-lines">
             <div class="skeleton-line"></div> <div class="skeleton-line w-3-4"></div> <div class="skeleton-line w-1-2"></div>
             </div>
             <div class="loading-text-container">
             <div class="dot"></div><div class="dot"></div><div class="dot"></div>
             <span class="loading-text-span">Analisando conversa...</span>
             </div>
         </div>`;
     } else {
         try {
         const rawHtml = marked.parse(this.summaryText || "Nenhum resumo disponível.");
         this.popupContentArea.innerHTML = `<div class="summary-content">${rawHtml}</div>`;
         } catch (e) {
         console.error("Omni Max [SummaryUiService]: Error parsing Markdown:", e);
         this.popupContentArea.innerHTML = `<div class="summary-content">Erro ao renderizar resumo.</div>`;
         }
     }
  }
  
  public injectSummaryButton(hsmButtonsDiv: HTMLDivElement, protocolo:string, contatoId: string): void {
    if (hsmButtonsDiv.querySelector(`.${SUMMARY_BUTTON_CLASS}`)) {
      return;
    }

    const summaryButtonElement = this.domService.createElementWithOptions('button', {
      className: SUMMARY_BUTTON_CLASS, // Classe para aplicar seu CSS
      // Aplicando estilos diretamente para garantir a aparência desejada no Light DOM
      styles: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        borderRadius: '20px',
        backgroundImage: 'linear-gradient(to right, #a9276f, #d02125, #d6621c)',
        color: 'white',
        fontSize: '12px',
        fontWeight: '500',
        border: 'none',
        cursor: 'pointer',
        textDecoration: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        // Para garantir que se alinhe bem com os outros 'a' tags que podem ter margins padrão
        verticalAlign: 'middle', 
      }
    });
    
    // Adiciona o SVG e o texto ao botão
    summaryButtonElement.innerHTML = `${SPARKLES_SVG_WHITE} <span style="margin-left: 5px;">Resumir</span>`;
    // Ajuste no estilo do SVG dentro do botão via JS, se necessário, ou confie no CSS da classe
    const svgElement = summaryButtonElement.querySelector('svg');
    if(svgElement) {
        this.domService.applyStyles(svgElement, {
            width: '14px',
            height: '14px',
            // marginRight: '5px', // Já está no span
            fill: '#ffffff' // Herda a cor do texto do botão (branco)
        });
    }


    summaryButtonElement.addEventListener('click', async (event: MouseEvent) => {
      event.stopPropagation();
      if (this.isVisible) {
        this.hide();
      } else {

        if (!protocolo || !contatoId) {
          const activeTabCtx = this.getActiveChatContextCallback();
          if (activeTabCtx) {
            protocolo = activeTabCtx.protocolo;
            contatoId = activeTabCtx.contatoId;
          }
        }
        
        if (protocolo && contatoId) {
          const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          await this.showAndGenerateSummary(buttonRect, protocolo, contatoId);
        } else {
          console.warn("Omni Max [SummaryUiService]: Protocolo/ContatoID não pôde ser determinado para o resumo.");
          alert("Omni Max: Não foi possível identificar o atendimento para resumir.");
        }
      }
    });

    // Inserir como o primeiro filho ou ao lado do primeiro <a> existente
    const firstLinkOrButton = hsmButtonsDiv.querySelector('a, button');
    if (firstLinkOrButton) {
      hsmButtonsDiv.insertBefore(summaryButtonElement, firstLinkOrButton);
    } else {
      hsmButtonsDiv.appendChild(summaryButtonElement); // Fallback
    }
    
    console.log(`Omni Max [SummaryUiService]: Botão de resumo (novo estilo) injetado em:`, hsmButtonsDiv);
  }

  public async showAndGenerateSummary(buttonRect: DOMRect, protocolo: string, contatoId: string): Promise<void> {
    // ... (lógica como definida anteriormente) ...
    if (!buttonRect || !this.summaryPopupHost || !this.popupMainElement || !this.popupOverlayElement) {
        console.error("Omni Max [SummaryUiService]: Elementos do popup não inicializados."); return;
    }
    this.currentPosition = { x: buttonRect.left + buttonRect.width / 2, y: buttonRect.top };
    this.isVisible = true; this.isLoading = true; this.summaryText = "";
    if (!this.summaryPopupHost.isConnected) document.body.appendChild(this.summaryPopupHost);
    this.domService.applyStyles(this.popupMainElement, { left: `${this.currentPosition.x}px`, bottom: `${window.innerHeight - this.currentPosition.y + 10}px`, transform: 'translateX(-50%)', display: 'block' });
    this.domService.applyStyles(this.popupOverlayElement, { display: 'block' });
    document.body.style.overflow = 'hidden';
    this.updatePopupContent();
    document.addEventListener('keydown', this.handleEscapeKey);

    if (this.requestStatus[protocolo]) { console.log(`Omni Max: Resumo para ${protocolo} já em andamento.`); return; }
    this.requestStatus[protocolo] = true;

    try {
      const cachedSummary = await this.summaryCacheService.getSummary(protocolo);
      if (cachedSummary) {
        this.summaryText = cachedSummary; this.isLoading = false;
        console.log(`Omni Max: Cache hit para ${protocolo}.`);
      } else {
        console.log(`Omni Max: Cache miss para ${protocolo}. Buscando dados...`);
        const todosAtendimentosDoContato = await this.matrixApiService.getAtendimentosByContato(contatoId);
        const atendimentoAtual = todosAtendimentosDoContato.find(at => at.protocolo === protocolo);
        if (atendimentoAtual && atendimentoAtual.mensagens.length > 0) {
          const conversationString = atendimentoAtual.mensagens.map(m => `${m.role === 'atendente' ? 'Atendente' : 'Cliente'}: ${m.message}`).join('\n\n');
          console.log(`Omni Max: Gerando resumo para ${protocolo} (${conversationString.length} chars).`);
          const newSummary = await this.aiManager.generateSummary(conversationString);
          await this.summaryCacheService.saveSummary(protocolo, newSummary);
          this.summaryText = newSummary;
        } else {
          this.summaryText = "Mensagens não encontradas para este atendimento.";
          console.warn(`Omni Max: Sem mensagens para ${protocolo} (contato ${contatoId}).`);
        }
        this.isLoading = false;
      }
    } catch (error: any) {
      console.error(`Omni Max: Erro ao processar ${protocolo}:`, error);
      this.isLoading = false; this.summaryText = `Erro: ${error.message || 'Desconhecido'}`;
    } finally {
      delete this.requestStatus[protocolo];
      if (this.isVisible) this.updatePopupContent();
    }
  }

  public hide(): void { /* ... (Como antes) ... */
    if (!this.popupMainElement || !this.popupOverlayElement) return;
    this.isVisible = false;
    this.domService.applyStyles(this.popupMainElement, { display: 'none' });
    this.domService.applyStyles(this.popupOverlayElement, { display: 'none' });
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.handleEscapeKey);
  }

  private handleEscapeKey = (event: KeyboardEvent): void => { /* ... (Como antes) ... */
    if (event.key === 'Escape') this.hide();
  }
}