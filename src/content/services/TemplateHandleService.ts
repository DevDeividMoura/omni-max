/**
 * src/content/services/TemplateHandlingService.ts
 * Lida com o processamento de templates na caixa de chat ao pressionar Tab.
 */
import type { Config } from '../config';
import type { DomService } from '../utils/DomService';

export class TemplateHandlingService {
  private config: Config;
  private dom: DomService;
  private bracketRegex = /\[([^\]]+)\]/g; // Regex para encontrar [VARIAVEL]

  constructor(config: Config, domService: DomService) {
    this.config = config;
    this.dom = domService;
  }

  private capitalizeFirstName(fullName: string): string {
    if (!fullName || typeof fullName !== 'string') return '';
    const firstName = fullName.split(' ')[0];
    return firstName
      ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      : '';
  }

  private transformTemplateText(text: string): string {
    // Processa {NOME COMPLETO} -> Nome
    return text.replace(/\{([^}]+)\}/g, (_, placeholderContent) => 
      this.capitalizeFirstName(placeholderContent.trim())
    );
  }

  private findSelectableVariables(text: string): Array<{ word: string, startIndex: number, endIndex: number }> {
    const matches: Array<{ word: string, startIndex: number, endIndex: number }> = [];
    let matchResult;
    // Resetar lastIndex do regex global antes de usar
    this.bracketRegex.lastIndex = 0; 
    while ((matchResult = this.bracketRegex.exec(text)) !== null) {
      matches.push({
        word: matchResult[1], // Conteúdo dentro dos colchetes
        startIndex: matchResult.index, // Índice de início do '['
        endIndex: this.bracketRegex.lastIndex - 1 // Índice do ']'
      });
    }
    return matches;
  }
  
  private async handleTabPressLogic(editableDiv: HTMLElement): Promise<void> {
    console.log("Omni Max [TemplateHandling]: Lógica do Tab iniciada...");
    try {
      let currentText = this.dom.getTextSafely(editableDiv); // Pega o texto como string simples
      let transformedText = this.transformTemplateText(currentText);

      // Atualiza o conteúdo do div com o texto transformado ANTES de tentar selecionar
      if (editableDiv.innerText !== transformedText) {
        editableDiv.innerText = transformedText; // Isso pode perder a posição do cursor, mas é necessário para a seleção correta
        await this.dom.waitNextFrame(); // Espera o DOM atualizar com o novo innerText
        // Após innerText ser setado, o cursor geralmente vai para o início ou fim.
        // Precisamos recalcular o texto para encontrar as variáveis na nova string.
        currentText = transformedText; // O texto base para busca de variáveis agora é o transformado
      }
      
      const selectableVariables = this.findSelectableVariables(currentText);

      if (selectableVariables.length > 0) {
        const firstVariable = selectableVariables[0];
        const selection = window.getSelection();
        if (!selection) return;

        // Acha os nós de texto correspondentes aos índices da variável no elemento
        const startNodeInfo = this.dom.getTextNodeAndOffsetAtCharIndex(editableDiv, firstVariable.startIndex); // +1 para pular '['
        const endNodeInfo = this.dom.getTextNodeAndOffsetAtCharIndex(editableDiv, firstVariable.endIndex + 1); // endIndex já é o ']'

        if (startNodeInfo && endNodeInfo && startNodeInfo.node === endNodeInfo.node) { // Simples caso: variável está em um único nó de texto
          const range = document.createRange();
          range.setStart(startNodeInfo.node, startNodeInfo.offset);
          range.setEnd(endNodeInfo.node, endNodeInfo.offset);
          selection.removeAllRanges();
          selection.addRange(range);
          console.log(`Omni Max [TemplateHandling]: Variável "${firstVariable.word}" selecionada.`);
        } else if (startNodeInfo && endNodeInfo) { // Caso mais complexo: variável cruza múltiplos nós de texto
            const range = document.createRange();
            range.setStart(startNodeInfo.node, startNodeInfo.offset);
            range.setEnd(endNodeInfo.node, endNodeInfo.offset); // Tenta selecionar mesmo assim
            selection.removeAllRanges();
            selection.addRange(range);
            console.warn("Omni Max [TemplateHandling]: Seleção de variável cruzou múltiplos nós de texto, pode ser imprecisa.");
        } else {
          console.warn("Omni Max [TemplateHandling]: Não foi possível encontrar nós para seleção da variável. Movendo cursor para o final.");
          this.dom.moveCursorToEnd(editableDiv);
        }
      } else {
        // Se não há variáveis para selecionar, apenas move o cursor para o final
        this.dom.moveCursorToEnd(editableDiv);
      }
    } catch (error) {
      console.error("Omni Max [TemplateHandling]: Erro ao processar Tab:", error);
    }
  }


  /**
   * Manipulador de evento para a tecla Tab no chatbox editável.
   */
  private async onKeyDown(event: KeyboardEvent): Promise<void> {
    // Verifica se o módulo "Template Processor" está ativo
    const settings = await chrome.storage.sync.get(['omniMaxGlobalEnabled', 'omniMaxModuleStates']);
    const isGlobalEnabled = settings.omniMaxGlobalEnabled !== false;
    const isTemplateProcessorEnabled = settings.omniMaxModuleStates?.['templateProcessor'] !== false;

    if (!isGlobalEnabled || !isTemplateProcessorEnabled) {
      return; // Não faz nada se o módulo estiver desabilitado
    }

    if (event.key !== 'Tab' || !(event.target instanceof HTMLElement) || !event.target.matches(this.config.selectors.editableChatbox)) {
      return;
    }
    
    event.preventDefault(); // Previne o comportamento padrão do Tab (mudar foco)
    event.stopPropagation(); // Para o evento aqui

    // Usamos setTimeout para permitir que a ação padrão do Tab (se houver alguma
    // manipulação de template pela plataforma) ocorra antes da nossa lógica,
    // embora o event.preventDefault() acima vá impedir isso.
    // A lógica do seu script original parecia esperar uma ação do Tab da plataforma primeiro.
    // Se o preventDefault() estiver ativo, precisamos ler o texto e aplicar as lógicas diretamente.
    this.handleTabPressLogic(event.target as HTMLElement);
  }
  
  /**
   * Anexa o listener de eventos de teclado ao documento.
   */
  public attachListeners(): void {
    // Garante que não haja listeners duplicados
    document.removeEventListener('keydown', this.boundOnKeyDown, true);
    this.boundOnKeyDown = this.onKeyDown.bind(this); // Guarda a referência binded
    document.addEventListener('keydown', this.boundOnKeyDown, true); // Fase de captura
    console.log("Omni Max [TemplateHandlingService]: Listener de Tab anexado.");
  }
  private boundOnKeyDown: (event: KeyboardEvent) => Promise<void> = async () => {};
}