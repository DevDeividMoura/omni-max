/**
 * src/content/services/NotificationService.ts
 * (Movido para services, conforme nossa última discussão de estrutura)
 * Serviço para exibir notificações toast na página com estilos embutidos.
 */

// Estilos base para o toast (como você já tinha)
const toastBaseStyles: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  padding: '12px 20px',
  borderRadius: '6px',
  color: 'white',
  zIndex: '2147483647', // Para garantir que fique sobre a maioria dos elementos
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
  fontSize: '14px',
  opacity: '0', // Começa invisível para animar a entrada
  transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
  transform: 'translateY(20px)', // Começa um pouco abaixo para animar para cima
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};

// Cores para os diferentes tipos de toast
const toastTypeColors: Record<string, string> = {
  success: '#2ecc71', // Verde (cor que você usou)
  warning: '#f39c12', // Laranja
  error: '#e74c3c',   // Vermelho
  // Adicione mais tipos/cores se necessário
};

export class NotificationService {
  /**
   * Exibe uma notificação toast na página.
   * @param message A mensagem a ser exibida.
   * @param type O tipo de toast ('success', 'warning', 'error').
   * @param duration Duração em milissegundos que o toast fica visível.
   */
  showToast(
    message: string,
    type: 'success' | 'warning' | 'error' = 'success',
    duration: number = 3000
  ): void {
    const toastElement = document.createElement('div');
    toastElement.textContent = message;
    
    // Aplica os estilos base definidos acima
    Object.assign(toastElement.style, toastBaseStyles);
    // Aplica a cor de fundo específica do tipo de toast
    toastElement.style.backgroundColor = toastTypeColors[type];

    document.body.appendChild(toastElement);

    // Força um reflow para garantir que as transições CSS funcionem corretamente
    // ao mudar opacity e transform após o appendChild.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    toastElement.offsetHeight; 

    // Animação de entrada (fade in e slide para cima)
    requestAnimationFrame(() => {
      toastElement.style.opacity = '1';
      toastElement.style.transform = 'translateY(0)';
    });

    // Configura a remoção do toast após a duração especificada
    setTimeout(() => {
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translateY(20px)'; // Animação de saída
      // Espera a animação de saída terminar antes de remover o elemento do DOM
      setTimeout(() => {
        toastElement.remove();
      }, 300); // Deve ser igual à duração da transição CSS (0.3s)
    }, duration);
  }
}