/**
 * src/content/utils/NotificationService.ts
 * Serviço para exibir notificações toast na página.
 */

const toastStyles: Partial<CSSStyleDeclaration> = { /* ... (estilos do toast como antes) ... */ };
const typeColors: Record<string, string> = { /* ... (cores como antes) ... */ };

export class NotificationService {
  /**
   * Exibe uma notificação toast na página.
   * @param message A mensagem a ser exibida.
   * @param type O tipo de toast (success, warning, error).
   * @param duration Duração em milissegundos que o toast fica visível.
   */
  showToast(
    message: string,
    type: 'success' | 'warning' | 'error' = 'success',
    duration: number = 3000
  ): void {
    const toastElement = document.createElement('div');
    toastElement.textContent = message;
    
    Object.assign(toastElement.style, toastStyles); // Aplica estilos base
    toastElement.style.backgroundColor = typeColors[type]; // Aplica cor do tipo

    document.body.appendChild(toastElement);

    requestAnimationFrame(() => { // Garante que o elemento está no DOM antes de animar
      toastElement.style.opacity = '1';
      toastElement.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translateY(20px)';
      setTimeout(() => {
        toastElement.remove();
      }, 300); // Tempo da animação de saída
    }, duration);
  }
}