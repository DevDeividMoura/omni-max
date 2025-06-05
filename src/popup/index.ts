/**
 * @file src/popup/index.ts
 * @description Initializes and mounts the Svelte component for the browser extension's popup.
 * It ensures the component is rendered after the DOM is fully loaded.
 */
import { mount } from 'svelte';
import OmniMaxPopup from '../components/OmniMaxPopup.svelte';

/**
 * Renders the main Svelte component (`OmniMaxPopup`) into the designated target element in the popup's HTML.
 * If the target element is not found, an error is logged to the console.
 */
function render(): void {
  const target = document.getElementById('app');
  if (target) {
    target.innerHTML = ''; // Clear any previous content
    mount(OmniMaxPopup, { target }); // Mount the Svelte component
  } else {
    console.error("Target element #app not found in popup.html");
  }
}

/**
 * Ensures the render function is called only after the DOM is fully loaded.
 * If the DOM is already loaded ('interactive' or 'complete'), it renders immediately.
 * Otherwise, it waits for the 'DOMContentLoaded' event.
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}