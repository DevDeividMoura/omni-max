/**
 * @file src/popup/index.ts
 * @description Initializes and mounts the Svelte component for the browser extension's popup.
 * It ensures the component is rendered after the DOM is fully loaded.
 */
import { mount } from 'svelte';
import { initializeI18n } from '../i18n';
import OmniMaxPopup from '../components/OmniMaxPopup.svelte';

/**
 * Renders the main Svelte component (`OmniMaxPopup`) into the designated target element in the popup's HTML.
 * If the target element is not found, an error is logged to the console.
 */
async function render(): Promise<void> {
  const target = document.getElementById('app');
  if (!target) {
    console.error("Target element #app not found in popup.html");
    return;
  }

  try {
    // Inicializa o i18n e só prossegue quando todas as traduções estiverem prontas
    await initializeI18n();

    // Limpa conteúdo anterior, caso exista, e monta o popup
    target.innerHTML = '';
    mount(OmniMaxPopup, { target });
  } catch (error) {
    console.error("Erro ao inicializar i18n:", error);
  }
}


/**
 * Ensures the render function is called only after the DOM is fully loaded.
 * If the DOM is already loaded ('interactive' or 'complete'), it renders immediately.
 * Otherwise, it waits for the 'DOMContentLoaded' event.
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void render();
  });
} else {
  void render();
}