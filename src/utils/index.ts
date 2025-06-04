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
    // p1 é o caractere separador (ou string vazia se for início da string)
    // p2 é o caractere "de palavra" a ser potencialmente capitalizado
    return p1 + p2.toUpperCase();
  });
};

/**
 * Decodes HTML entities in a string.
 * Example: '&amp;' becomes '&'.
 * @param text The string with HTML entities.
 * @returns The decoded string.
 */
export function decodeHtmlEntities(text: string): string {
  // Verifica se estamos em um ambiente de navegador que tem DOMParser
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const decodedString = parser.parseFromString(`<!doctype html><body>${text}`, 'text/html').body.textContent;
    return decodedString || "";
  }
  // Fallback simples (pode não cobrir todas as entidades, mas lida com as mais comuns)
  // ou se você tiver uma biblioteca para isso, use-a.
  // Esta implementação de fallback é muito básica.
  if (typeof document !== 'undefined') { // Fallback adicional se DOMParser não estiver disponível mas document sim
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
  }
  // Se não houver como decodificar (ex: ambiente Node.js puro sem JSDOM), retorna o texto original.
  // Isso pode ser aceitável se o conteúdo principal não tiver entidades complexas nos números.
  console.warn("Omni Max [Utils]: decodeHtmlEntities - DOMParser and document not available. HTML entities might not be fully decoded.");
  return text;
}

/**
 * Masks CPF and CNPJ numbers in a given text, handling various formats.
 * Replaces them with a specified placeholder.
 * @param text The text to sanitize (ideally after HTML entities have been decoded).
 * @param placeholder The placeholder to use, e.g., "[DOCUMENTO_CLIENTE]".
 * @returns The text with CPF/CNPJ masked.
 */
export function maskSensitiveDocumentNumbers(text: string, placeholder: string = "[DOCUMENTO_CLIENTE]"): string {
  if (!text || typeof text !== 'string') return "";

  // Regex para CPF:
  // Aceita: ddd.ddd.ddd-dd | ddd ddd ddd dd | ddddddddddd
  // O \b garante que não pegamos parte de números maiores.
  const cpfPattern = /\b(?:\d{3}(?:[.\s])?\d{3}(?:[.\s])?\d{3}(?:[-\s])?\d{2}|\d{11})\b/g;

  // Regex para CNPJ:
  // Aceita: dd.ddd.ddd/dddd-dd | dd ddd ddd dddd dd | dddddddddddddd
  // O [\/\.\s] permite barra, ponto ou espaço como separador antes dos 4 dígitos do milhar.
  const cnpjPattern = /\b(?:\d{2}(?:[.\s])?\d{3}(?:[.\s])?\d{3}(?:[\/.\s])?\d{4}(?:[-\s])?\d{2}|\d{14})\b/g;

  let maskedText = text;
  
  // Mascarar CNPJ primeiro (padrão mais longo) para evitar conflitos parciais se um CPF pudesse ser parte de um CNPJ (improvável aqui).
  maskedText = maskedText.replace(cnpjPattern, placeholder);
  maskedText = maskedText.replace(cpfPattern, placeholder);

  return maskedText;
}