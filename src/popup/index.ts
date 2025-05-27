// src/popup/index.ts
import { mount } from 'svelte';
import OmniMaxPopup from '../components/OmniMaxPopup.svelte'; // ATUALIZADO

function render() {
  const target = document.getElementById('app');
  if (target) {
    target.innerHTML = ''; // Limpa conteúdo anterior
    mount(OmniMaxPopup, { target }); // MONTA O NOVO POPUP
  } else {
    console.error("Target element #app not found in popup.html");
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}