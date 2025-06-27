/**
 * @file src/content/services/DomService.test.ts
 * @description Unit tests for the DomService class.
 * These tests verify the DOM manipulation and querying functionalities,
 * including element selection, style application, and text content retrieval.
 * A temporary DOM container is used for most tests to isolate DOM operations.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DomService } from './DomService';

/**
 * Test suite for the `DomService` class.
 */
describe('DomService', () => {
  let domService: DomService;
  let testContainer: HTMLDivElement; // Container for DOM elements created during tests
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    domService = new DomService();

    // Create and append a container to the document body for each test
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);

    // Spy on console methods to verify warnings/errors and suppress output
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up the DOM by removing the test container
    if (document.body.contains(testContainer)) {
      document.body.removeChild(testContainer);
    }
    // Clear mocks and spies
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks(); // Restores all mocks (e.g., window.requestAnimationFrame)
  });

  // --- Test Suite for `query` method ---
  describe('query method', () => {
    /**
     * Verifies that `query` can find an existing element by its ID in the document.
     */
    it('should find an existing element by ID in the document', () => {
      testContainer.innerHTML = '<div id="test-element-id" class="test-class"></div>';
      const foundElement = domService.query<HTMLDivElement>('#test-element-id', testContainer);
      expect(foundElement).not.toBeNull();
      expect(foundElement?.id).toBe('test-element-id');
    });

    /**
     * Tests if `query` can find an element within a specified parent context,
     * rather than searching the entire document.
     */
    it('should find an existing element within a specific context', () => {
      testContainer.innerHTML = `
        <div id="parent-context">
          <span class="target-span">Target In Context</span>
        </div>
        <span class="target-span">Outer Target</span>
      `;
      const contextElement = domService.query<HTMLDivElement>('#parent-context', testContainer);
      expect(contextElement).not.toBeNull();

      const foundInContext = domService.query<HTMLSpanElement>('.target-span', contextElement!);
      expect(foundInContext).not.toBeNull();
      expect(foundInContext?.textContent).toBe('Target In Context');
    });

    /**
     * Ensures `query` returns null when the specified selector does not match any element.
     */
    it('should return null if the element is not found', () => {
      testContainer.innerHTML = '<div>Some content</div>'; // Ensure container is not empty
      const foundElement = domService.query('#non-existent-element', testContainer);
      expect(foundElement).toBeNull();
    });
  });

  // --- Test Suite for `queryAll` method ---
  describe('queryAll method', () => {
    /**
     * Verifies that `queryAll` finds all elements matching a class selector.
     */
    it('should find all matching elements by class selector', () => {
      testContainer.innerHTML = `
        <p class="matching-p">Paragraph 1</p>
        <div><p class="matching-p">Paragraph 2</p></div>
        <p class="matching-p">Paragraph 3</p>
        <p class="non-matching-p">Paragraph 4</p>
      `;
      const foundElements = domService.queryAll<HTMLParagraphElement>('.matching-p', testContainer);
      expect(foundElements.length).toBe(3);
      expect(foundElements[0].textContent).toBe('Paragraph 1');
      expect(foundElements[2].textContent).toBe('Paragraph 3');
    });

    /**
     * Ensures `queryAll` returns an empty array if no elements match the selector.
     */
    it('should return an empty array if no elements are found', () => {
      const foundElements = domService.queryAll('.non-existent-selector', testContainer);
      expect(foundElements).toEqual([]); // Should be an empty array
    });
  });

  // --- Test Suite for `applyStyles` method ---
  describe('applyStyles method', () => {
    /**
     * Tests if styles are correctly applied to a directly provided DOM element.
     */
    it('should apply styles to a directly provided HTML element', () => {
      const paragraphElement = document.createElement('p');
      testContainer.appendChild(paragraphElement);
      domService.applyStyles(paragraphElement, { color: 'rgb(0, 0, 255)', marginRight: '10px' });

      expect(paragraphElement.style.color).toBe('rgb(0, 0, 255)');
      expect(paragraphElement.style.marginRight).toBe('10px');
    });

    /**
     * Tests if styles are applied to an element found using a CSS selector string.
     */
    it('should apply styles to an element found by a CSS selector', () => {
      testContainer.innerHTML = '<div id="style-target-div"></div>';
      domService.applyStyles('#style-target-div', { backgroundColor: 'yellow', padding: '5px' });

      const styledDiv = domService.query<HTMLDivElement>('#style-target-div', testContainer);
      expect(styledDiv?.style.backgroundColor).toBe('yellow');
      expect(styledDiv?.style.padding).toBe('5px');
    });

    /**
     * Verifies that a warning is logged if `applyStyles` is called with a selector
     * that does not match any element.
     */
    it('should warn if element is not found by selector for styling', () => {
      domService.applyStyles('#selector-not-found', { color: 'red' });
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Omni Max [DomService]: Element "#selector-not-found" not found. Cannot apply styles.'
      );
    });

    /**
     * Verifies that a warning is logged if `applyStyles` is called with a null element.
     */
    it('should warn if a null element is provided for styling', () => {
      domService.applyStyles(null, { color: 'green' });
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
         'Omni Max [DomService]: Element "provided Element object" not found. Cannot apply styles.'
      );
    });
  });

  // --- Test Suite for `waitNextFrame` method ---
  describe('waitNextFrame method', () => {
    /**
     * Tests if `waitNextFrame` resolves after `window.requestAnimationFrame`'s callback is invoked.
     */
    it('should resolve after the next animation frame callback', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
        // Simulate asynchronous invocation of the callback
        setTimeout(() => callback(performance.now()), 0);
        return 123; // Return a mock request ID
      });

      await domService.waitNextFrame();
      expect(rafSpy).toHaveBeenCalledOnce();
    });
  });

  // --- Test Suite for `getTextSafely` method ---
  describe('getTextSafely method', () => {
    /**
     * Verifies that `getTextSafely` returns the trimmed text content of an element.
     */
    it('should return trimmed text content of a valid element', () => {
      testContainer.innerHTML = '<p>  Trimmed Text Content   </p>';
      const pElement = domService.query('p', testContainer);
      expect(domService.getTextSafely(pElement)).toBe('Trimmed Text Content');
    });

    /**
     * Ensures an empty string is returned for elements with no text content (e.g., empty tags or `<br>`).
     */
    it('should return an empty string for an element with no text content', () => {
      testContainer.innerHTML = '<p></p>';
      const pElement = domService.query('p', testContainer);
      expect(domService.getTextSafely(pElement)).toBe('');
    });

    /**
     * Confirms an empty string is returned if the provided element is null or undefined.
     */
    it('should return an empty string if the element is null or undefined', () => {
      expect(domService.getTextSafely(null)).toBe('');
      expect(domService.getTextSafely(undefined)).toBe('');
    });

    /**
     * Tests retrieval of concatenated text content from an element with nested children.
     */
    it('should retrieve and concatenate text from nested child elements', () => {
      testContainer.innerHTML = '<div>Outer Text <span>Nested Text</span> Suffix</div>';
      const divElement = domService.query('div', testContainer);
      expect(domService.getTextSafely(divElement)).toBe('Outer Text Nested Text Suffix');
    });
  });

  // --- Test Suite for `getTextNodeAndOffsetAtCharIndex` method ---
  describe('getTextNodeAndOffsetAtCharIndex method', () => {
    /**
     * Tests finding the text node and offset within a simple element containing only one text node.
     */
    it('should find the text node and offset in a simple text node', () => {
      testContainer.textContent = 'Simple'; // textContent creates a single text node
      const result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 3); // Index for 'p'
      expect(result).not.toBeNull();
      expect(result?.node.nodeValue).toBe('Simple');
      expect(result?.offset).toBe(3);
    });

    /**
     * Tests finding the node and offset at the very beginning (index 0) of a text node.
     */
    it('should find node and offset at the beginning of a text node (index 0)', () => {
      testContainer.textContent = 'Start';
      const result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 0);
      expect(result?.node.nodeValue).toBe('Start');
      expect(result?.offset).toBe(0);
    });

    /**
     * Tests finding the node and offset at the very end of a text node.
     */
    it('should find node and offset at the end of a text node', () => {
      testContainer.textContent = 'Finish';
      const result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 6); // Index after 'h'
      expect(result?.node.nodeValue).toBe('Finish');
      expect(result?.offset).toBe(6);
    });

    /**
     * Verifies that `null` is returned if `charIndex` is greater than the text content length.
     */
    it('should return null if charIndex is out of bounds (too large)', () => {
      testContainer.textContent = 'Short';
      const result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 10);
      expect(result).toBeNull();
    });

    /**
     * Tests the behavior with a negative `charIndex`. The current implementation of
     * `DomService.getTextNodeAndOffsetAtCharIndex` might return a node with a negative offset.
     * This test documents and verifies this current behavior.
     * A negative offset might be unexpected for typical range operations.
     * The function could be enhanced to return null for `charIndex < 0`.
     */
    it('should return a result with negative offset if charIndex is negative (current behavior)', () => {
      testContainer.textContent = 'NegativeIndex';
      const result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, -1);
      // Current behavior: (currentCharCount (0) + nodeLength (13) >= -1) is true.
      // Returns { node: 'NegativeIndex', offset: -1 - 0 = -1 }
      expect(result?.node.nodeValue).toBe('NegativeIndex');
      expect(result?.offset).toBe(-1); // Documenting that it allows negative offsets.
    });

    /**
     * Tests correct navigation across multiple text nodes within nested elements
     * to find the character at the specified global index.
     */
    it('should correctly navigate multiple text nodes in nested elements', () => {
      testContainer.innerHTML = '<span>First</span> Middle <strong>Last</strong>';
      // Concatenated text: "First Middle Last" (length 17)
      // "First" (index 0-4), " Middle " (index 5-12), "Last" (index 13-16)

      // Index within "First" (span's text node)
      let result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 2); // 'r' in "First"
      expect(result?.node.nodeValue).toBe('First');
      expect(result?.offset).toBe(2);

      // Index within " Middle " (testContainer's own text node)
      result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 7); // 'i' in " Middle "
      expect(result?.node.nodeValue).toBe(' Middle ');
      expect(result?.offset).toBe(2); // " M" are before 'i'

      // Index within "Last" (strong's text node)
      result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 15); // 's' in "Last"
      expect(result?.node.nodeValue).toBe('Last');
      expect(result?.offset).toBe(2);
    });

    /**
     * Verifies `null` is returned if the root node for searching is empty (has no child nodes).
     */
    it('should return null for an empty root node', () => {
      // testContainer is empty (no innerHTML or textContent set after beforeEach cleanup)
      const result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 0);
      expect(result).toBeNull();
    });

    /**
     * Ensures `null` is returned if the root node contains no text nodes (e.g., only <img> or <br>).
     */
    it('should return null if root node contains no text nodes', () => {
      testContainer.innerHTML = '<img><br><hr>';
      const result = domService.getTextNodeAndOffsetAtCharIndex(testContainer, 0);
      expect(result).toBeNull();
    });
  });

  // --- Test Suite for `moveCursorToEnd` method ---
  describe('moveCursorToEnd method', () => {
    let mockSelection: Selection;
    let mockRangeInstance: Range; // Use a more descriptive name

    beforeEach(() => {
      // Mock parts of the Range object needed by the method
      mockRangeInstance = {
        selectNodeContents: vi.fn(),
        collapse: vi.fn(),
        // Add stubs for other Range methods/properties if DomService.moveCursorToEnd uses them
        // For example, if it used commonAncestorContainer, you'd mock that.
        // Since it's cast to `unknown as Range`, only what's used needs to be mocked.
      } as unknown as Range;

      // Mock parts of the Selection object
      mockSelection = {
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
      } as unknown as Selection;

      vi.spyOn(document, 'createRange').mockReturnValue(mockRangeInstance);
      vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);
    });

    /**
     * Tests the successful path of moving the cursor to the end of an editable element's content.
     * Verifies that appropriate Selection and Range API methods are called.
     */
    it('should move cursor to the end of the element and scroll', () => {
      const editableDiv = document.createElement('div');
      editableDiv.contentEditable = 'true';
      editableDiv.textContent = 'Initial text content.';
      testContainer.appendChild(editableDiv);
      const focusSpy = vi.spyOn(editableDiv, 'focus');

      domService.moveCursorToEnd(editableDiv);

      expect(window.getSelection).toHaveBeenCalledOnce();
      expect(document.createRange).toHaveBeenCalledOnce();
      expect(mockRangeInstance.selectNodeContents).toHaveBeenCalledWith(editableDiv);
      expect(mockRangeInstance.collapse).toHaveBeenCalledWith(false); // false for end
      expect(mockSelection.removeAllRanges).toHaveBeenCalledOnce();
      expect(mockSelection.addRange).toHaveBeenCalledWith(mockRangeInstance);
      expect(editableDiv.scrollTop).toBe(editableDiv.scrollHeight); // Check scroll
      expect(focusSpy).not.toHaveBeenCalled(); // Focus should not be called on successful path
    });

    /**
     * Ensures that if `window.getSelection()` returns `null`, the method exits early
     * without attempting range operations.
     */
    it('should do nothing if window.getSelection() returns null', () => {
      vi.mocked(window.getSelection).mockReturnValue(null);
      const editableDiv = document.createElement('div');
      testContainer.appendChild(editableDiv);

      domService.moveCursorToEnd(editableDiv);

      expect(document.createRange).not.toHaveBeenCalled();
      expect(mockSelection.addRange).not.toHaveBeenCalled();
    });

    /**
     * Tests the fallback behavior when an error occurs during Range operations.
     * Expects the element to be focused and an error to be logged.
     */
    it('should call focus, log an error, and scroll if range operations fail', () => {
      const editableDiv = document.createElement('div');
      editableDiv.contentEditable = 'true';
      testContainer.appendChild(editableDiv);
      const focusSpy = vi.spyOn(editableDiv, 'focus');
      const simulatedError = new Error('Simulated Range operation failure');

      // Make one of the range operations throw an error
      vi.mocked(mockRangeInstance.selectNodeContents).mockImplementation(() => {
        throw simulatedError;
      });

      domService.moveCursorToEnd(editableDiv);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Omni Max [DomService]: Error moving cursor to end:", simulatedError);
      expect(focusSpy).toHaveBeenCalledOnce();
      // Scroll to end should still be attempted as part of the finally/fallback logic in `moveCursorToEnd`
      expect(editableDiv.scrollTop).toBe(editableDiv.scrollHeight);
    });
  });

  describe('createElementWithOptions', () => {
    it('should create an element with the specified tag name', () => {
        const div = domService.createElementWithOptions('div');
        expect(div).toBeInstanceOf(HTMLDivElement);
        expect(div.tagName).toBe('DIV');
    });

    it('should set ID if provided', () => {
        const p = domService.createElementWithOptions('p', { id: 'my-paragraph' });
        expect(p.id).toBe('my-paragraph');
    });

    it('should set a single class name if provided as string', () => {
        const span = domService.createElementWithOptions('span', { className: 'my-class' });
        expect(span.classList.contains('my-class')).toBe(true);
    });

    it('should set multiple class names if provided as array', () => {
        const article = domService.createElementWithOptions('article', { className: ['class1', 'class2'] });
        expect(article.classList.contains('class1')).toBe(true);
        expect(article.classList.contains('class2')).toBe(true);
    });

    it('should set textContent if provided', () => {
        const h1 = domService.createElementWithOptions('h1', { textContent: 'Hello Title' });
        expect(h1.textContent).toBe('Hello Title');
    });

    it('should apply styles if provided', () => {
        const styles: Partial<CSSStyleDeclaration> = { color: 'rgb(0, 0, 255)', marginLeft: '10px' };
        // Espiona o método applyStyles da instância atual de domService
        const applyStylesSpy = vi.spyOn(domService, 'applyStyles');
        const section = domService.createElementWithOptions('section', { styles });

        expect(applyStylesSpy).toHaveBeenCalledWith(section, styles);
        // Verificação real do estilo (opcional, pois applyStyles já é testado, mas bom para integração)
        expect(section.style.color).toBe('rgb(0, 0, 255)');
        expect(section.style.marginLeft).toBe('10px');
        applyStylesSpy.mockRestore(); // Restaura o spy
    });

    it('should append to parent if provided', () => {
        const parentDiv = document.createElement('div');
        testContainer.appendChild(parentDiv); // testContainer é do beforeEach geral
        const childP = domService.createElementWithOptions('p', { parent: parentDiv, textContent: 'child' });

        expect(parentDiv.contains(childP)).toBe(true);
        expect(parentDiv.textContent).toBe('child');
    });

    it('should set attributes if provided', () => {
        const input = domService.createElementWithOptions('input', { 
            attributes: { type: 'text', placeholder: 'Enter here', 'data-custom': 'value' } 
        });
        expect(input.getAttribute('type')).toBe('text');
        expect(input.getAttribute('placeholder')).toBe('Enter here');
        expect(input.getAttribute('data-custom')).toBe('value');
    });

    it('should handle empty options object', () => {
        const el = domService.createElementWithOptions('a', {});
        expect(el).toBeInstanceOf(HTMLAnchorElement);
        expect(el.id).toBe('');
        expect(el.textContent).toBe('');
    });

    it('should handle undefined options', () => {
        const el = domService.createElementWithOptions('button', undefined);
        expect(el).toBeInstanceOf(HTMLButtonElement);
    });
});
});