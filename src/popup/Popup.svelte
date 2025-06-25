<script lang="ts">
  /**
   * Popup.svelte
   *
   * Main UI for the extension's browser action popup.
   * Allows the user to configure the allowed origin for the sidepanel.
   */
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { _ } from "svelte-i18n";
  import { platformConfigStore } from "../storage/stores";
  import extensionIcon from "../assets/icons/icon-48.png";
  import GithubMarkIcon from "../shared/components/icons/GithubMarkIcon.svelte";

  let localOrigin: string = "";
  let statusMessage: string = "";

  onMount(() => {
    setTimeout(() => {
      localOrigin = get(platformConfigStore).allowedOrigin;
    }, 50);
  });

  async function handleSave() {
    // Validação simples
    if (!localOrigin || !localOrigin.startsWith("http")) {
      statusMessage = $_("popup.errors.invalid_origin");
      setTimeout(() => (statusMessage = ""), 3000);
      return;
    }

    try {
    const url = new URL(localOrigin);
    const sanitizedOrigin = url.origin;
    
    await platformConfigStore.set({ allowedOrigin: sanitizedOrigin });
    console.log("Allowed origin saved:", sanitizedOrigin);
    statusMessage = $_('popup.alerts.save_success_reloading');

    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // A verificação externa ainda é útil para o caso de não haver aba ativa.
    if (currentTab) {
      setTimeout(async () => {
        // CORREÇÃO 1: Adicionar uma verificação de segurança para o ID e windowId da aba DENTRO do setTimeout.
        // Isso garante ao TypeScript que os valores não são 'undefined' no momento da execução.
        if (currentTab.id && currentTab.windowId) {
          
          chrome.tabs.reload(currentTab.id);
          
          // CORREÇÃO 2: Adicionar o 'windowId' obrigatório do objeto da aba na chamada de open().
          console.log(`[Popup] Habilitando para a aba ${currentTab.id} (Origem e Caminho válidos)`);
          await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
          await chrome.sidePanel.setOptions({
            tabId: currentTab.id,
            path: 'src/sidepanel/sidepanel.html',
            enabled: true
          });
          chrome.sidePanel.open({ 
            tabId: currentTab.id,
            windowId: currentTab.windowId 
          });
          
          window.close();
        }
      }, 1500);
    } else {
       // Se não encontrar a aba, apenas fecha o popup após o delay
       setTimeout(() => window.close(), 1500);
    }
    } catch (error) {
      statusMessage = $_("popup.errors.save_failed");
      console.error("Error saving allowed origin:", error);
      setTimeout(() => (statusMessage = ""), 3000);
    }
  }
</script>

<div class="omni-max-popup-container">
  <div class="popup-header">
    <div class="header-title-group">
      <img src={extensionIcon} alt="Omni Max Logo" class="header-logo" />
      <div class="header-text-wrapper">
        <h1>{$_("popup.header.title")}</h1>
        <p>{$_("popup.header.subtitle")}</p>
      </div>
    </div>
    <div class="header-controls">
      <a
        href="https://github.com/DevDeividMoura/omni-max"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link-header"
        title={$_("popup.header.repo_tooltip")}
      >
        <GithubMarkIcon
          size={20}
          className="github-svg-icon"
          title={$_("popup.header.repo_tooltip")}
        />
      </a>
    </div>
  </div>

  <main class="popup-content">
    <div class="input-group">
      <label for="allowed-origin">{$_("popup.content.allowed_origin_label")}</label>
      <p class="input-description">{$_("popup.content.allowed_origin_description")}</p>
      <input
        type="text"
        id="allowed-origin"
        class="input-field"
        placeholder={$_("popup.content.allowed_origin_placeholder")}
        bind:value={localOrigin}
        on:keydown={(e) => e.key === "Enter" && handleSave()}
      />
    </div>

    {#if statusMessage}
      <p class="status-message">{statusMessage}</p>
    {/if}
  </main>

  <div class="actions-footer">
    <button
      class="apply-button"
      on:click={handleSave}
      title={$_("popup.buttons.save_tooltip")}
    >
      {$_("popup.buttons.save")}
    </button>
  </div>

  <div class="app-credits-footer">
    {$_("popup.footer.made_with_love")}
    <a
      href="https://github.com/DevDeividMoura"
      target="_blank"
      rel="noopener noreferrer"
    >
      @DevDeividMoura
    </a>
  </div>
</div>

<style>
  /* Usando os mesmos nomes de classe para reutilizar estilos */
  .omni-max-popup-container {
    width: 300px;
    display: flex;
    flex-direction: column;
    background-color: #f4f6f8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    font-size: 14px;
    color: #333;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(to right, #a9276f, #d02125, #d6621c);
    color: white;
    padding: 12px 16px;
  }
  .header-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .header-logo {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .header-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .github-link-header {
    color: white;
    display: inline-flex;
    align-items: center;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .github-link-header:hover {
    opacity: 1;
  }

  .github-link-header :global(svg) {
    /* Example of using :global() on a nested element */
    stroke-width: 2px;
  }

  .header-text-wrapper h1 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.2;
  }
  .header-text-wrapper p {
    font-size: 0.75rem;
    opacity: 0.9;
    margin: 2px 0 0;
    line-height: 1.2;
  }

  .popup-content {
    padding: 16px;
  }
  .input-group {
    margin-bottom: 12px;
  }
  .input-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
  }
  .input-description {
    font-size: 0.8rem;
    color: #6b7280;
    margin: -2px 0 8px 0;
  }
  .input-field {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    box-sizing: border-box;
  }
  .input-field:focus {
    outline: none;
    border-color: #a9276f;
    box-shadow: 0 0 0 2px rgba(169, 39, 111, 0.2);
  }

  .status-message {
    text-align: center;
    font-size: 0.85em;
    padding: 8px;
    margin-top: 8px;
    border-radius: 4px;
    background-color: #e5e7eb;
    color: #1f2937;
  }

  .actions-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0 16px 12px 16px;
  }
  .apply-button {
    width: 100%;
    padding: 8px 16px;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    background-image: linear-gradient(to right, #a9276f, #d02125, #d6621c);
  }
  .apply-button:hover {
    filter: brightness(110%);
  }
  .app-credits-footer {
    padding: 8px 16px;
    text-align: center;
    font-size: 0.75em;
    color: #7f8c8d;
    background-color: #f4f6f8;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
  }

  .app-credits-footer a {
    color: #a9276f;
    text-decoration: none;
    font-weight: 500;
  }

  .app-credits-footer a:hover {
    text-decoration: underline;
  }
</style>
