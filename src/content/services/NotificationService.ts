/**
 * src/content/services/NotificationService.ts
 * Service for displaying transient toast-style notifications on the page.
 * It handles the creation, styling, animation, and removal of notification elements.
 */

import { DomService } from './DomService';

/** Base CSS styles for toast notifications. */
const toastBaseStyles: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  padding: '12px 20px',
  borderRadius: '6px',
  color: 'white',
  zIndex: '2147483647', // High z-index to appear above most page elements
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
  fontSize: '14px',
  opacity: '0', // Start transparent for fade-in animation
  transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
  transform: 'translateY(20px)', // Start slightly offset for slide-in animation
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

/** Defines background colors for different notification types. */
const toastTypeColors: Record<string, string> = {
  success: '#2ecc71', // Green
  warning: '#f39c12', // Orange
  error: '#e74c3c',   // Red
  // Add more types/colors here if needed (e.g., 'info': '#3498db')
};

export class NotificationService {
  private domService: DomService;
  /**
   * Displays a toast notification on the page with a specified message, type, and duration.
   *
   * @param {string} message The message to be displayed in the toast.
   * @param {'success' | 'warning' | 'error'} [type='success'] The type of notification, determining its background color. Defaults to 'success'.
   * @param {number} [duration=3000] The duration in milliseconds for which the toast will be visible. Defaults to 3000ms.
   */

  constructor(domService: DomService) { // Ou constructor(domService: DomService) se for injetar
        this.domService = domService;
    }

  showToast(
    message: string,
    type: 'success' | 'warning' | 'error' = 'success',
    duration: number = 3000
  ): void {
        const finalBaseStyles = { ...toastBaseStyles }; // Copia para não modificar o original
        // Remove opacity e transform dos estilos base, pois serão aplicados na animação
        delete finalBaseStyles.opacity;
        delete finalBaseStyles.transform;

        const toastElement = this.domService.createElementWithOptions('div', {
            textContent: message,
            styles: {
                ...finalBaseStyles, // Estilos base sem os de animação inicial
                backgroundColor: toastTypeColors[type] || toastTypeColors.success,
                // Estilos iniciais para animação (começa invisível e deslocado)
                opacity: '0',
                transform: 'translateY(20px)',
            },
            parent: document.body
        });

        // Forçar reflow - opcional no teste, mas importante no browser
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        toastElement.offsetHeight;

        this.domService.waitNextFrame().then(() => {
            this.domService.applyStyles(toastElement, {
                opacity: '1',
                transform: 'translateY(0)' // Anima para a posição final
            });
        });

        setTimeout(() => {
            this.domService.applyStyles(toastElement, {
                opacity: '0',
                transform: 'translateY(20px)' // Anima para sair
            });

            setTimeout(() => {
                if (toastElement.parentNode) {
                    toastElement.remove(); // Remoção padrão do DOM
                }
            }, 300); // Duração da animação de saída
        }, duration);
    }
}