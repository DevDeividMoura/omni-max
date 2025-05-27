/**
 * src/content/utils/ClipboardService.ts
 * Serviço utilitário para interações com a área de transferência.
 */
export class ClipboardService {
  /**
   * Copia o texto fornecido para a área de transferência.
   * @param text O texto a ser copiado.
   * @param label Um rótulo para o tipo de dado copiado (usado em logs).
   * @returns True se a cópia foi bem-sucedida, false caso contrário.
   */
  async copy(text: string | null | undefined, label: string): Promise<boolean> {
    if (!text || typeof text !== 'string' || !text.trim()) {
      console.warn(`Omni Max [ClipboardService]: Nenhum ${label} válido encontrado para copiar.`);
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      console.log(`Omni Max [ClipboardService]: ${label} "${text}" copiado!`);
      return true;
    } catch (err) {
      console.error(`Omni Max [ClipboardService]: Falha ao copiar ${label}:`, err);
      return false;
    }
  }
}