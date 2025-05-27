/**
 * src/content/utils/DomService.ts
 * Serviço utilitário para manipulação e consulta do DOM.
 */
export class DomService {
  /**
   * Busca um único elemento no DOM.
   * @param selector Seletor CSS.
   * @param context Elemento pai para a busca (padrão: document).
   * @returns O primeiro elemento encontrado ou null.
   */
  query<E extends Element>(selector: string, context: Document | Element = document): E | null {
    return context.querySelector<E>(selector);
  }

  /**
   * Busca todos os elementos que correspondem a um seletor.
   * @param selector Seletor CSS.
   * @param context Elemento pai para a busca (padrão: document).
   * @returns Um array de elementos encontrados.
   */
  queryAll<E extends Element>(selector: string, context: Document | Element = document): E[] {
    return Array.from(context.querySelectorAll<E>(selector));
  }

  /**
   * Aplica estilos CSS a um elemento.
   * @param element O elemento alvo ou um seletor para o elemento.
   * @param styles Um objeto com os estilos a serem aplicados.
   */
  applyStyles(element: Element | string | null, styles: Partial<CSSStyleDeclaration>): void {
    const el = typeof element === 'string' ? this.query(element) : element;
    if (!el) {
      console.warn(`Omni Max [DomService]: Elemento "${typeof element === 'string' ? element : 'fornecido'}" não encontrado para aplicar estilos.`);
      return;
    }
    Object.assign((el as HTMLElement).style, styles);
  }

  /**
   * Retorna uma Promise que resolve no próximo quadro de animação.
   * Útil para aguardar atualizações do DOM.
   */
  waitNextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  /**
   * Obtém o textContent de um elemento de forma segura, com trim e fallback.
   * @param element O elemento.
   * @returns O texto do elemento ou string vazia.
   */
  getTextSafely(element: Element | null | undefined): string {
    return element?.textContent?.trim() || '';
  }

  /**
   * Encontra o nó de texto e o deslocamento dentro dele para um determinado índice de caractere no elemento raiz.
   * @param rootNode O elemento raiz onde o texto está contido.
   * @param charIndex O índice do caractere global dentro do texto do rootNode.
   * @returns Um objeto com o nó de texto e o deslocamento, ou null se não encontrado.
   */
  getTextNodeAndOffsetAtCharIndex(rootNode: Node, charIndex: number): { node: Text; offset: number } | null {
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentCharCount = 0;
    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      if (currentNode.nodeType === Node.TEXT_NODE) {
        const textNode = currentNode as Text;
        const nodeLength = textNode.nodeValue?.length || 0;
        if (currentCharCount + nodeLength >= charIndex) {
          return { node: textNode, offset: charIndex - currentCharCount };
        }
        currentCharCount += nodeLength;
      }
    }
    return null; // Índice fora dos limites ou nenhum nó de texto encontrado
  }

  /**
   * Move o cursor para o final do conteúdo de um elemento editável.
   * @param element O elemento editável.
   */
  moveCursorToEnd(element: HTMLElement): void {
    const selection = window.getSelection();
    if (!element || !selection) return;
    
    const range = document.createRange();
    try {
      range.selectNodeContents(element);
      range.collapse(false); // false para ir para o final
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.error("Omni Max [DomService]: Erro ao mover cursor para o final:", error);
      element.focus(); // Tenta focar como fallback
    }
    element.scrollTop = element.scrollHeight; // Garante scroll para o final
  }
}