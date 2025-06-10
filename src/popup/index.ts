import { mount } from 'svelte';
import { initializeI18n } from '../i18n';

/**
 * Asks the active tab's content script for the page language.
 * @returns {Promise<string>} A promise that resolves with the detected locale.
 */
function getLanguageFromContentScript(): Promise<string> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Garante que temos uma aba ativa para onde enviar a mensagem
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'GET_PAGE_LANGUAGE' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[Popup] Could not connect to content script. Using fallback locale.', chrome.runtime.lastError.message);
              resolve('pt-BR');
            } else if (response && response.locale) {
              resolve(response.locale);
            } else {
              console.warn('[Popup] Received empty response from content script. Using fallback locale.');
              resolve('pt-BR');
            }
          }
        );
      } else {
        console.warn('[Popup] Could not find active tab. Using fallback locale.');
        resolve('pt-BR');
      }
    });
  });
}

/**
 * Main function to initialize the popup.
 */
async function render() {
  console.log('[Popup] Requesting page language from content script...');
  const locale = await getLanguageFromContentScript();
  const target = document.getElementById('app');
  
  // A inicialização do i18n só acontece DEPOIS que a promessa é resolvida.
  initializeI18n(locale);

  
  if (target) {
    target.innerHTML = ''; // Clear any previous content
    const { default: OmniMaxPopup } = await import('../components/OmniMaxPopup.svelte');
    mount(OmniMaxPopup, { target }); // Mount the Svelte component
  } else {
    console.error("Target element #app not found in popup.html");
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}