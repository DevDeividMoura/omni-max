/**
 * @file utils/index.test.ts
 * @description Unit tests for utility functions defined in `src/utils/index.ts`.
 * Currently focuses on testing the `capitalizeFirstLetterOfWords` function.
 */
import { describe, it, expect } from 'vitest';
import { capitalizeFirstLetterOfWords } from './index';

/**
 * Test suite for the `capitalizeFirstLetterOfWords` utility function.
 * It verifies the function's ability to correctly capitalize the first letter
 * of each word in various string inputs, including edge cases and different
 * character types.
 */
describe('capitalizeFirstLetterOfWords', () => {
  /**
   * Tests capitalization of a single lowercase word.
   */
  it('should capitalize the first letter of a single lowercase word', () => {
    expect(capitalizeFirstLetterOfWords('word')).toBe('Word');
  });

  /**
   * Tests capitalization of each word in a multi-word lowercase string.
   */
  it('should capitalize the first letter of each word in a lowercase string', () => {
    expect(capitalizeFirstLetterOfWords('hello world')).toBe('Hello World');
  });

  /**
   * Ensures that an empty string input results in an empty string output.
   */
  it('should return an empty string if an empty string is provided', () => {
    expect(capitalizeFirstLetterOfWords('')).toBe('');
  });

  /**
   * Verifies that words already correctly capitalized are not altered.
   */
  it('should not change already capitalized words', () => {
    expect(capitalizeFirstLetterOfWords('Already Capitalized Words')).toBe('Already Capitalized Words');
  });

  /**
   * Tests how the function handles mixed-case words.
   * The expectation is that it capitalizes the first letter of what it considers a "word",
   * which might depend on word boundary detection (e.g., using `\b` in regex).
   * For "mIxEd cAsE", if 'm' and 'c' are word starts, it becomes "MIxEd CAsE".
   */
  it('should handle mixed case words, capitalizing the first letter at word boundaries', () => {
    expect(capitalizeFirstLetterOfWords('mIxEd cAsE')).toBe('MIxEd CAsE');
  });

  /**
   * Checks handling of strings with leading and/or trailing spaces.
   * Spaces themselves should be preserved, and words adjacent to them capitalized.
   */
  it('should handle strings with leading and trailing spaces, preserving spaces', () => {
    expect(capitalizeFirstLetterOfWords('  leading space')).toBe('  Leading Space');
    expect(capitalizeFirstLetterOfWords('trailing space  ')).toBe('Trailing Space  ');
    expect(capitalizeFirstLetterOfWords('  both sides  ')).toBe('  Both Sides  ');
  });

  /**
   * Ensures multiple spaces between words are preserved, and adjacent words are capitalized.
   */
  it('should handle multiple spaces between words, preserving spaces', () => {
    expect(capitalizeFirstLetterOfWords('multiple   spaces')).toBe('Multiple   Spaces');
  });

  /**
   * Tests capitalization when words contain numbers or start with numbers.
   * Assumes numbers do not prevent a sequence from being treated as a word start.
   */
  it('should handle words containing or starting with numbers', () => {
    expect(capitalizeFirstLetterOfWords('word1 test2')).toBe('Word1 Test2');
    expect(capitalizeFirstLetterOfWords('1st place')).toBe('1st Place');
  });

  /**
   * Verifies behavior with hyphenated strings.
   * Assumes hyphens are treated as word separators, leading to capitalization after each hyphen.
   */
  it('should treat hyphens as word boundaries, capitalizing subsequent letters', () => {
    expect(capitalizeFirstLetterOfWords('state-of-the-art')).toBe('State-Of-The-Art');
  });

  /**
   * Tests behavior with underscores. The outcome depends on whether the underlying
   * capitalization logic (likely regex with `\b`) treats `_` as a word character (`\w`)
   * or a word boundary.
   * - If `_` is `\w`, then `\b` occurs before "under" in "under_score_test", leading to "Under_score_test".
   * - For "_another_test", if `_` is `\w`, `\b` might not occur before the initial `_` if it's the first character,
   * so it might remain `_another_test`.
   */
  it('should handle underscores based on word boundary definitions', () => {
    // Assuming '_' is treated as part of a word character by \w,
    // a word boundary \b might not occur before an initial underscore.
    expect(capitalizeFirstLetterOfWords('under_score_test')).toBe('Under_score_test'); // "under" is capitalized
    expect(capitalizeFirstLetterOfWords('_leading_underscore')).toBe('_leading_underscore'); // Initial '_' might not trigger capitalization if part of \w
    expect(capitalizeFirstLetterOfWords('another__test')).toBe('Another__test'); // "another" is capitalized
  });

  /**
   * Checks correct capitalization of words with Unicode accented characters.
   */
  it('should correctly capitalize words with accented Unicode characters', () => {
    expect(capitalizeFirstLetterOfWords('olá mundo')).toBe('Olá Mundo');
    expect(capitalizeFirstLetterOfWords('éric çäñtæ')).toBe('Éric Çäñtæ');
  });

  /**
   * Tests the function with a complex sentence involving various casings and structures
   * to ensure overall robustness.
   */
  it('should handle a sentence with various cases and punctuation correctly', () => {
    const sentence = 'this is a teST of the capitalize FUNCTION. it should wORk!';
    const expected = 'This Is A TeST Of The Capitalize FUNCTION. It Should WORk!';
    expect(capitalizeFirstLetterOfWords(sentence)).toBe(expected);
  });

  /**
   * Tests that null input returns an empty string or handles as defined (e.g., throws error or specific return).
   * Assuming it should return an empty string for consistency with `''`.
   */
  it('should return an empty string if null is provided', () => {
    expect(capitalizeFirstLetterOfWords(null)).toBe('');
  });

  /**
   * Tests that undefined input returns an empty string or handles as defined.
   * Assuming it should return an empty string for consistency with `''`.
   */
  it('should return an empty string if undefined is provided', () => {
    expect(capitalizeFirstLetterOfWords(undefined)).toBe('');
  });
});