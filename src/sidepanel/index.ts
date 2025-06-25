chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Verificamos se a mensagem é um comando para fechar e se ela vem do nosso próprio background script.
  // A verificação `!sender.tab` é uma forma de garantir que a mensagem veio de um script de extensão, não de um content script.
  if (message.type === 'CLOSE_SIDE_PANEL' && !sender.tab) {
    console.log('Omni Max [Sidepanel] Comando para fechar recebido. Fechando a janela.');
    window.close();
  }
});


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
              console.warn('Omni Max [Sidepanel] Could not connect to content script. Using fallback locale.', chrome.runtime.lastError.message);
              resolve('pt-BR');
            } else if (response && response.locale) {
              resolve(response.locale);
            } else {
              console.warn('Omni Max [Sidepanel] Received empty response from content script. Using fallback locale.');
              resolve('pt-BR');
            }
          }
        );
      } else {
        console.warn('Omni Max [Sidepanel] Could not find active tab. Using fallback locale.');
        resolve('pt-BR');
      }
    });
  });
}

/**
 * Main function to initialize the sidepanel.
 */
async function render() {
  console.log('Omni Max [Sidepanel] Requesting page language from content script...');
  const locale = await getLanguageFromContentScript();
  const target = document.getElementById('app');
  
  // A inicialização do i18n só acontece DEPOIS que a promessa é resolvida.
  initializeI18n(locale);

  
  if (target) {
    target.innerHTML = ''; // Clear any previous content
    const { default: SettingsPanel } = await import('./SettingsSidepanel.svelte');
    mount(SettingsPanel, { target }); // Mount the Svelte component
  } else {
    console.error("Target element #app not found in sidepanel.html");
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}