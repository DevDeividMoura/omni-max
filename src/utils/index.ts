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
  return str.replace(/(^|[^\p{L}\p{N}_])([\p{L}\p{N}_])/gu, (match, p1, p2) => {
    // p1 é o caractere separador (ou string vazia se for início da string)
    // p2 é o caractere "de palavra" a ser potencialmente capitalizado
    return p1 + p2.toUpperCase();
  });
};
