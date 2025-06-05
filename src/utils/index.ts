/**
 * @file src/utils/index.ts
 * @description Provides miscellaneous utility functions for the application.
 */

/**
 * Capitalizes the first letter of each "word" in a given string using Unicode properties.
 *
 * A "word" character is defined as any Unicode letter (`\p{L}`),
 * any Unicode number (`\p{N}`), or an underscore (`_`).
 * Capitalization occurs for such characters if they are at the beginning of the string
 * or if they are preceded by a character that is NOT a Unicode letter,
 * Unicode number, or underscore.
 *
 * The regex used is `/(^|[^\p{L}\p{N}_])([\p{L}\p{N}_])/gu`:
 * - `(^|[^\p{L}\p{N}_])`: Captures (as p1) the start of the string (`^`) OR any character
 * that is not a Unicode letter, number, or underscore. This acts as the delimiter.
 * - `([\p{L}\p{N}_])`: Captures (as p2) a Unicode letter, number, or underscore that
 * immediately follows the delimiter (or is at the start of the string). This is the
 * character that will be capitalized.
 * - The `u` flag ensures correct Unicode pattern matching.
 * - The `g` flag ensures all occurrences are processed.
 *
 * This means that:
 * - Letters, numbers, or underscores at the start of the string or after characters
 * like spaces, hyphens, punctuation, etc., will be targeted for capitalization
 * (though `_.toUpperCase()` is `_`, and numbers don't change case).
 * - In a string like `_hello` (at the start), `_` is targeted, `_.toUpperCase()` results in `_`.
 * - In `one_two`, `o` is capitalized. The `_` is not preceded by a "non-word" character
 * (as `e` is a letter), so `_` itself isn't targeted by this specific regex logic as `p2` following a `p1` separator.
 * However, in `one _two` (with a space), the space is `p1` and `_` is `p2`.
 * - The function handles common Unicode characters (like accented letters) robustly
 * for both detection and capitalization due to Unicode properties in regex and
 * JavaScript's `toUpperCase()` behavior.
 *
 * If the input string is `null`, `undefined`, or not a string, an empty string is returned.
 *
 * @param {string | null | undefined} str The input string to capitalize.
 * @returns {string} The string with the first letter of each identified "word character" capitalized,
 * or an empty string if the input is not a valid string.
 *
 * @example
 * capitalizeFirstLetterOfWords("hello world"); // "Hello World"
 * capitalizeFirstLetterOfWords("state-of-the-art"); // "State-Of-The-Art"
 * capitalizeFirstLetterOfWords("éric çäñtæ"); // "Éric Çäñtæ"
 * capitalizeFirstLetterOfWords("_privateVar"); // "_privateVar"
 * capitalizeFirstLetterOfWords(" leading_space"); // " Leading_space"
 * capitalizeFirstLetterOfWords(null); // ""
 */
export const capitalizeFirstLetterOfWords = (str: string | null | undefined): string => {
  if (typeof str !== 'string' || !str) {
    return '';
  }
  return str.replace(/(^|[^\p{L}\p{N}_])([\p{L}\p{N}_])/gu, (_match, p1, p2) => {
    // p1 is the separator character (or an empty string if it's the start of the string)
    // p2 is the "word character" to be potentially capitalized
    return p1 + p2.toUpperCase();
  });
};

/**
 * Decodes HTML entities in a string.
 * Example: '&amp;' becomes '&'.
 * It prioritizes `DOMParser` if available, falling back to a textarea-based method
 * if `document` is available, and finally returning the original text if no decoding
 * mechanism is found (e.g., in a pure Node.js environment without JSDOM).
 *
 * @param {string} text The string with HTML entities.
 * @returns {string} The decoded string, or the original string if decoding is not possible.
 */
export function decodeHtmlEntities(text: string): string {
  // Check if running in a browser-like environment that supports DOMParser
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const decodedString = parser.parseFromString(`<!doctype html><body>${text}`, 'text/html').body.textContent;
    return decodedString || "";
  }

  // Fallback: If DOMParser is not available, but 'document' (and thus document.createElement) is.
  // This is a simpler method and might not cover all entities as robustly as DOMParser.
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // If no decoding mechanism is available (e.g., pure Node.js environment without JSDOM),
  // return the original text. This might be acceptable if complex entities are not expected.
  console.warn("Omni Max [Utils]: decodeHtmlEntities - DOMParser and document not available. HTML entities might not be fully decoded.");
  return text;
}

/**
 * Masks CPF (Brazilian individual taxpayer registry ID) and CNPJ (Brazilian company taxpayer registry ID)
 * numbers found in a given text, replacing them with a specified placeholder.
 * The function handles various common formats for these document numbers.
 *
 * @param {string} text The text to sanitize. It's recommended to use this function
 * after HTML entities have been decoded if the text comes from an HTML source.
 * @param {string} [placeholder="[DOCUMENTO_CLIENTE]"] The placeholder string to use for masking.
 * @returns {string} The text with CPF and CNPJ numbers masked. Returns an empty string
 * if the input `text` is not a valid string or is empty.
 */
export function maskSensitiveDocumentNumbers(text: string, placeholder: string = "[DOCUMENTO_CLIENTE]"): string {
  if (!text || typeof text !== 'string') return "";

  // Regex for CPF (Brazilian individual taxpayer ID):
  // Accepts formats like: ddd.ddd.ddd-dd | ddd ddd ddd dd | ddddddddddd
  // The \b word boundary ensures that parts of larger numbers are not mistakenly matched.
  const cpfPattern = /\b(?:\d{3}(?:[.\s])?\d{3}(?:[.\s])?\d{3}(?:[-\s])?\d{2}|\d{11})\b/g;

  // Regex for CNPJ (Brazilian company taxpayer ID):
  // Accepts formats like: dd.ddd.ddd/dddd-dd | dd ddd ddd dodd dd | dddddddddddddd
  // The [\/\.\s] allows a forward slash, dot, or space as a separator before the block of four digits.
  const cnpjPattern = /\b(?:\d{2}(?:[.\s])?\d{3}(?:[.\s])?\d{3}(?:[\/.\s])?\d{4}(?:[-\s])?\d{2}|\d{14})\b/g;

  let maskedText = text;

  // Mask CNPJ first (it's the longer pattern) to prevent potential partial conflicts
  // if a CPF pattern could hypothetically match part of a CNPJ string (unlikely with these specific regexes, but good practice).
  maskedText = maskedText.replace(cnpjPattern, placeholder);
  maskedText = maskedText.replace(cpfPattern, placeholder);

  return maskedText;
}