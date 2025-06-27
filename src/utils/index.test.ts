/**
 * @file utils/index.test.ts
 * @description Unit tests for utility functions defined in `src/utils/index.ts`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { capitalizeFirstLetterOfWords, decodeHtmlEntities, maskSensitiveDocumentNumbers } from './index';

/**
 * @describe capitalizeFirstLetterOfWords
 * @description Test suite for the `capitalizeFirstLetterOfWords` utility function.
 */
describe('capitalizeFirstLetterOfWords', () => {
  it('should capitalize the first letter of a single lowercase word', () => {
    expect(capitalizeFirstLetterOfWords('word')).toBe('Word');
  });

  it('should capitalize the first letter of each word in a lowercase string', () => {
    expect(capitalizeFirstLetterOfWords('hello world')).toBe('Hello World');
  });

  it('should return an empty string if an empty string is provided', () => {
    expect(capitalizeFirstLetterOfWords('')).toBe('');
  });

  it('should not change already capitalized words', () => {
    expect(capitalizeFirstLetterOfWords('Already Capitalized Words')).toBe('Already Capitalized Words');
  });

  it('should handle mixed case words, capitalizing the first letter at word boundaries', () => {
    expect(capitalizeFirstLetterOfWords('mIxEd cAsE')).toBe('MIxEd CAsE');
  });

  it('should handle strings with leading and trailing spaces, preserving spaces', () => {
    expect(capitalizeFirstLetterOfWords('   leading space')).toBe('   Leading Space');
    expect(capitalizeFirstLetterOfWords('trailing space   ')).toBe('Trailing Space   ');
    expect(capitalizeFirstLetterOfWords('   both sides   ')).toBe('   Both Sides   ');
  });

  it('should handle multiple spaces between words, preserving spaces', () => {
    expect(capitalizeFirstLetterOfWords('multiple    spaces')).toBe('Multiple    Spaces');
  });

  it('should handle words containing or starting with numbers', () => {
    expect(capitalizeFirstLetterOfWords('word1 test2')).toBe('Word1 Test2');
    expect(capitalizeFirstLetterOfWords('1st place')).toBe('1st Place');
  });

  it('should treat hyphens as word boundaries, capitalizing subsequent letters', () => {
    expect(capitalizeFirstLetterOfWords('state-of-the-art')).toBe('State-Of-The-Art');
  });

  it('should handle underscores based on word boundary definitions', () => {
    expect(capitalizeFirstLetterOfWords('under_score_test')).toBe('Under_score_test');
    expect(capitalizeFirstLetterOfWords('_leading_underscore')).toBe('_leading_underscore');
    expect(capitalizeFirstLetterOfWords('another__test')).toBe('Another__test');
  });

  it('should correctly capitalize words with accented Unicode characters', () => {
    expect(capitalizeFirstLetterOfWords('olá mundo')).toBe('Olá Mundo');
    expect(capitalizeFirstLetterOfWords('éric çäñtæ')).toBe('Éric Çäñtæ');
  });

  it('should handle a sentence with various cases and punctuation correctly', () => {
    const sentence = 'this is a teST of the capitalize FUNCTION. it should wORk!';
    const expected = 'This Is A TeST Of The Capitalize FUNCTION. It Should WORk!';
    expect(capitalizeFirstLetterOfWords(sentence)).toBe(expected);
  });

  it('should return an empty string if null is provided', () => {
    expect(capitalizeFirstLetterOfWords(null)).toBe('');
  });

  it('should return an empty string if undefined is provided', () => {
    expect(capitalizeFirstLetterOfWords(undefined)).toBe('');
  });
});

/**
 * @describe decodeHtmlEntities
 * @description Test suite for the `decodeHtmlEntities` utility function.
 * It includes tests for scenarios with DOMParser, a textarea fallback, and no available decoding mechanisms.
 */
describe('decodeHtmlEntities', () => {
  const originalDOMParser = global.DOMParser;
  const originalDocument = global.document;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.stubGlobal('DOMParser', originalDOMParser);
    vi.stubGlobal('document', originalDocument);
    consoleWarnSpy.mockRestore();
  });

  it('should decode common HTML entities using DOMParser when available', () => {
    const decodedText = 'Text with < > " \' & \u00A0.';
    const mockParseFromString = vi.fn().mockReturnValue({
      body: { textContent: decodedText }
    });
    vi.stubGlobal('DOMParser', vi.fn(() => ({ parseFromString: mockParseFromString })));
    vi.stubGlobal('document', undefined); // Ensure DOMParser is preferred

    const encoded = 'Text with &lt; &gt; &quot; &apos; &amp; &nbsp;.';
    expect(decodeHtmlEntities(encoded)).toBe(decodedText);
    expect(mockParseFromString).toHaveBeenCalledWith(`<!doctype html><body>${encoded}`, 'text/html');
  });

  it('should return an empty string if DOMParser.parseFromString.body.textContent is null', () => {
    const mockParseFromString = vi.fn().mockReturnValue({
      body: { textContent: null }
    });
    vi.stubGlobal('DOMParser', vi.fn(() => ({ parseFromString: mockParseFromString })));
    vi.stubGlobal('document', undefined);

    expect(decodeHtmlEntities('some text')).toBe('');
  });

  it('should decode entities using textarea fallback if DOMParser is undefined and document is available', () => {
    vi.stubGlobal('DOMParser', undefined);
    const mockTextarea = {
      _internalValue: '', // Using a different property to avoid potential setter/getter conflicts in some test environments
      set innerHTML(html: string) {
        // More complete simulation for the previously failing test case, ensuring correct entity handling.
        let temp = html;
        temp = temp.replace(/&amp;/g, '&');
        temp = temp.replace(/&lt;/g, '<');
        temp = temp.replace(/&gt;/g, '>');
        temp = temp.replace(/&quot;/g, '"');
        temp = temp.replace(/&apos;/g, "'");
        temp = temp.replace(/&nbsp;/g, '\u00A0');
        this._internalValue = temp;
      },
      get value() { return this._internalValue; }
    };
    vi.stubGlobal('document', {
      createElement: vi.fn((tagName: string) => {
        if (tagName === 'textarea') {
          mockTextarea._internalValue = ''; // Reset for each creation in case of multiple calls
          return mockTextarea;
        }
        return null; // Should not happen in this test
      })
    });

    expect(decodeHtmlEntities('Hello &amp; &lt;World&gt;')).toBe('Hello & <World>');
    expect(document.createElement).toHaveBeenCalledWith('textarea');
  });

  it('should return original text and warn if DOMParser and document are undefined', () => {
    vi.stubGlobal('DOMParser', undefined);
    vi.stubGlobal('document', undefined);
    const text = 'Text with &amp; entities';
    expect(decodeHtmlEntities(text)).toBe(text);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Omni Max [Utils]: decodeHtmlEntities - DOMParser and document not available. HTML entities might not be fully decoded."
    );
  });

  it('should return an empty string for an empty input string when DOMParser is available', () => {
    // Mock DOMParser to ensure it's the path taken
    vi.stubGlobal('DOMParser', vi.fn(() => ({ parseFromString: vi.fn(() => ({ body: { textContent: '' } })) })));
    vi.stubGlobal('document', undefined);
    expect(decodeHtmlEntities('')).toBe('');
  });

  it('should return the same string if no entities are present when DOMParser is available', () => {
    const text = 'Just a plain text.';
    // Mock DOMParser to ensure it's the path taken
    vi.stubGlobal('DOMParser', vi.fn(() => ({ parseFromString: vi.fn(() => ({ body: { textContent: text } })) })));
    vi.stubGlobal('document', undefined);
    expect(decodeHtmlEntities(text)).toBe(text);
  });
});

/**
 * @describe maskSensitiveDocumentNumbers
 * @description Test suite for the `maskSensitiveDocumentNumbers` utility function.
 */
describe('maskSensitiveDocumentNumbers', () => {
  const DEFAULT_PLACEHOLDER = "[DOCUMENTO_CLIENTE]";

  it('should return an empty string for null, undefined, or non-string input', () => {
    expect(maskSensitiveDocumentNumbers(null as any)).toBe("");
    expect(maskSensitiveDocumentNumbers(undefined as any)).toBe("");
    expect(maskSensitiveDocumentNumbers(123 as any)).toBe("");
  });

  it('should return an empty string for an empty input string', () => {
    expect(maskSensitiveDocumentNumbers("")).toBe("");
  });

  it('should return the original text if no sensitive document numbers are found', () => {
    const text = "This text has no sensitive document numbers.";
    expect(maskSensitiveDocumentNumbers(text)).toBe(text);
  });

  const cpfTestData = [
    { input: "CPF: 123.456.789-00", expected: `CPF: ${DEFAULT_PLACEHOLDER}` },
    { input: "My CPF is 11122233344.", expected: `My CPF is ${DEFAULT_PLACEHOLDER}.` },
    { input: "Doc: 123 456 789 00!", expected: `Doc: ${DEFAULT_PLACEHOLDER}!` },
    { input: "12345678900", expected: DEFAULT_PLACEHOLDER },
    { input: "Leading text 123.456.789-00 trailing text", expected: `Leading text ${DEFAULT_PLACEHOLDER} trailing text` },
    { input: "No space12345678900here", expected: "No space12345678900here" }, // \b prevents matching
    { input: "Number 123456789001 is too long", expected: "Number 123456789001 is too long" }, // \b prevents matching
    { input: "Number 1234567890 is too short", expected: "Number 1234567890 is too short" }, // \b prevents matching
  ];
  cpfTestData.forEach(data => {
    it(`should correctly handle CPF in "${data.input}" (expected: "${data.expected}")`, () => {
      expect(maskSensitiveDocumentNumbers(data.input)).toBe(data.expected);
    });
  });

  const cnpjTestData = [
    { input: "CNPJ: 12.345.678/0001-99", expected: `CNPJ: ${DEFAULT_PLACEHOLDER}` },
    { input: "Company CNPJ 11222333000144.", expected: `Company CNPJ ${DEFAULT_PLACEHOLDER}.` },
    { input: "ID: 12 345 678 0001 99!", expected: `ID: ${DEFAULT_PLACEHOLDER}!` },
    { input: "12345678000199", expected: DEFAULT_PLACEHOLDER },
    { input: "CNPJ: 12.345.678/0001 99", expected: `CNPJ: ${DEFAULT_PLACEHOLDER}` },
    { input: "Text 12.345.678/0001-99 and more", expected: `Text ${DEFAULT_PLACEHOLDER} and more` },
    { input: "No space12345678000199here", expected: "No space12345678000199here" }, // \b prevents matching
    { input: "Number 123456780001991 is too long", expected: "Number 123456780001991 is too long" }, // \b prevents matching
    { input: "Number 1234567800019 is too short", expected: "Number 1234567800019 is too short" }, // \b prevents matching
  ];
  cnpjTestData.forEach(data => {
    it(`should correctly handle CNPJ in "${data.input}" (expected: "${data.expected}")`, () => {
      expect(maskSensitiveDocumentNumbers(data.input)).toBe(data.expected);
    });
  });

  it('should mask multiple CPFs and CNPJs in the same text string', () => {
    const text = "User 1: CPF 111.222.333-44 and CNPJ 12.345.678/0001-99. User 2: CPF 99988877766.";
    const expected = `User 1: CPF ${DEFAULT_PLACEHOLDER} and CNPJ ${DEFAULT_PLACEHOLDER}. User 2: CPF ${DEFAULT_PLACEHOLDER}.`;
    expect(maskSensitiveDocumentNumbers(text)).toBe(expected);
  });

  it('should use a custom placeholder when one is provided', () => {
    const text = "My document is 123.456.789-00.";
    const customPlaceholder = "[HIDDEN_DOC]";
    const expected = `My document is ${customPlaceholder}.`;
    expect(maskSensitiveDocumentNumbers(text, customPlaceholder)).toBe(expected);
  });

  it('should correctly prioritize CNPJ masking over potential partial CPF match', () => {
    // This test ensures that the CNPJ (longer pattern) is masked first,
    // which is the current implementation strategy.
    const textWithCnpj = "Document 12345678000199 is a CNPJ.";
    const expected = `Document ${DEFAULT_PLACEHOLDER} is a CNPJ.`;
    expect(maskSensitiveDocumentNumbers(textWithCnpj)).toBe(expected);
  });
});