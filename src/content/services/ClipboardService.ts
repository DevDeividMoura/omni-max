/**
 * src/content/services/ClipboardService.ts
 * Utility service for interacting with the system clipboard.
 * Encapsulates the logic for copying text, providing a clean interface
 * for other services that need to perform copy operations.
 */
export class ClipboardService {
  /**
   * Copies the provided text to the system clipboard.
   * Uses the `navigator.clipboard.writeText` API.
   *
   * @param {string | null | undefined} text The text to be copied. If null, undefined, or an empty/whitespace string, the operation will not proceed.
   * @param {string} label A descriptive label for the type of data being copied (e.g., "CPF", "Customer Name"). Used in console log messages.
   * @returns {Promise<boolean>} True if the text was successfully copied, false otherwise (e.g., if text is invalid or an error occurs).
   */
  async copy(text: string | null | undefined, label: string): Promise<boolean> {
    if (!text || typeof text !== 'string' || !text.trim()) {
      console.warn(`Omni Max [ClipboardService]: No valid ${label} found to copy.`);
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      console.log(`Omni Max [ClipboardService]: ${label} "${text}" copied!`);
      return true;
    } catch (err) {
      console.error(`Omni Max [ClipboardService]: Failed to copy ${label}:`, err);
      return false;
    }
  }
}