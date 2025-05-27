/**
 * src/content/services/DomService.ts
 * Utility service for DOM manipulation and querying.
 * Provides a set of helper methods to abstract common DOM operations,
 * making other services cleaner and more focused on their specific logic.
 */
export class DomService {
  /**
   * Queries the DOM for a single element matching the given CSS selector.
   * Equivalent to `context.querySelector(selector)`.
   *
   * @template E The type of the Element to query for, extending `Element`.
   * @param {string} selector The CSS selector string.
   * @param {Document | Element} [context=document] The context in which to search (e.g., a specific parent element or the entire document).
   * @returns {E | null} The first matching element, or null if no match is found.
   */
  query<E extends Element>(selector: string, context: Document | Element = document): E | null {
    return context.querySelector<E>(selector);
  }

  /**
   * Queries the DOM for all elements matching the given CSS selector.
   * Equivalent to `Array.from(context.querySelectorAll(selector))`.
   *
   * @template E The type of the Elements to query for, extending `Element`.
   * @param {string} selector The CSS selector string.
   * @param {Document | Element} [context=document] The context in which to search.
   * @returns {E[]} An array of matching elements. The array will be empty if no matches are found.
   */
  queryAll<E extends Element>(selector: string, context: Document | Element = document): E[] {
    return Array.from(context.querySelectorAll<E>(selector));
  }

  /**
   * Applies a set of CSS styles to a given DOM element.
   *
   * @param {Element | string | null} element The target DOM element or a CSS selector string for the element. If null or a selector that doesn't match, a warning is logged.
   * @param {Partial<CSSStyleDeclaration>} styles An object where keys are CSS property names (in camelCase, e.g., `backgroundColor`) and values are the corresponding style values.
   */
  applyStyles(element: Element | string | null, styles: Partial<CSSStyleDeclaration>): void {
    const el = typeof element === 'string' ? this.query(element) : element;
    if (!el) {
      const selectorForWarning = typeof element === 'string' ? element : 'provided Element object';
      console.warn(`Omni Max [DomService]: Element "${selectorForWarning}" not found. Cannot apply styles.`);
      return;
    }
    Object.assign((el as HTMLElement).style, styles);
  }

  /**
   * Returns a Promise that resolves on the next animation frame.
   * Useful for waiting for DOM updates to be rendered before proceeding with further DOM manipulations.
   *
   * @returns {Promise<void>} A Promise that resolves when the browser is ready to paint the next frame.
   */
  waitNextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  /**
   * Safely retrieves the trimmed text content of a DOM element.
   *
   * @param {Element | null | undefined} element The DOM element from which to get text.
   * @returns {string} The trimmed text content of the element, or an empty string if the element is null, undefined, or has no text content.
   */
  getTextSafely(element: Element | null | undefined): string {
    return element?.textContent?.trim() || '';
  }

  /**
   * Finds the specific text node and the character offset within that node
   * corresponding to a global character index within a root DOM element.
   * This is useful for precisely placing selections or cursors in `contenteditable` elements
   * or other complex text-bearing structures.
   *
   * @param {Node} rootNode The root DOM node (usually an Element) within which to search.
   * @param {number} charIndex The 0-based global character index within the `rootNode`'s aggregated text content.
   * @returns {{ node: Text; offset: number } | null} An object containing the found text `node` and the `offset` within that node,
   * or `null` if the `charIndex` is out of bounds or no suitable text node is found.
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
    // Character index is out of bounds or no text nodes were found.
    return null;
  }

  /**
   * Moves the user's cursor (selection) to the end of the content
   * within a specified editable HTML element.
   * Also attempts to scroll the element to make the cursor visible.
   *
   * @param {HTMLElement} element The editable HTML element (e.g., a `div[contenteditable="true"]`).
   */
  moveCursorToEnd(element: HTMLElement): void {
    const selection = window.getSelection();
    if (!element || !selection) return;

    const range = document.createRange();
    try {
      range.selectNodeContents(element);
      range.collapse(false); // `false` collapses the range to its end point.
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.error("Omni Max [DomService]: Error moving cursor to end:", error);
      // Fallback: attempt to focus the element, which might place the cursor at the end by default in some cases.
      element.focus();
    }
    // Ensure the new cursor position is visible by scrolling to the bottom of the element.
    element.scrollTop = element.scrollHeight;
  }
}