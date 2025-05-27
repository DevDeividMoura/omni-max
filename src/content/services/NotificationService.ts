/**
 * src/content/services/NotificationService.ts
 * Service for displaying transient toast-style notifications on the page.
 * It handles the creation, styling, animation, and removal of notification elements.
 */

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
  /**
   * Displays a toast notification on the page with a specified message, type, and duration.
   *
   * @param {string} message The message to be displayed in the toast.
   * @param {'success' | 'warning' | 'error'} [type='success'] The type of notification, determining its background color. Defaults to 'success'.
   * @param {number} [duration=3000] The duration in milliseconds for which the toast will be visible. Defaults to 3000ms.
   */
  showToast(
    message: string,
    type: 'success' | 'warning' | 'error' = 'success',
    duration: number = 3000
  ): void {
    const toastElement = document.createElement('div');
    toastElement.textContent = message;

    Object.assign(toastElement.style, toastBaseStyles);
    toastElement.style.backgroundColor = toastTypeColors[type] || toastTypeColors.success; // Fallback to success color

    document.body.appendChild(toastElement);

    // Force a reflow to ensure CSS transitions apply correctly from the initial state.
    // Accessing offsetHeight is a common way to trigger this.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    toastElement.offsetHeight;

    // Animate in: fade in and slide up
    requestAnimationFrame(() => {
      toastElement.style.opacity = '1';
      toastElement.style.transform = 'translateY(0)';
    });

    // Set up removal after the specified duration
    setTimeout(() => {
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translateY(20px)'; // Animate out: fade out and slide down

      // Wait for the fade-out animation to complete before removing the element from the DOM.
      // This timeout should match the CSS transition duration (0.3s = 300ms).
      setTimeout(() => {
        toastElement.remove();
      }, 300);
    }, duration);
  }
}