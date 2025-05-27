<script lang="ts">
  import { onMount } from "svelte";
  import CollapsibleSection from "./CollapsibleSection.svelte";
  import ToggleSwitch from "./ToggleSwitch.svelte";
  import { Keyboard, Cpu, FileText, Eye, X, ListChecks } from "lucide-svelte";

  import {
    globalExtensionEnabledStore,
    moduleStatesStore,
    shortcutsOverallEnabledStore,
    aiFeaturesEnabledStore,
    aiCredentialsStore,
    type AiCredentials,
    aiProviderConfigStore,
    type AiProviderConfig,
    promptsStore,
    type PromptsConfig,
    collapsibleSectionsStateStore,
    type CollapsibleSectionsState,
    shortcutKeysStore,
    type ShortcutKeysConfig,
  } from "../storage";

  import { availableModules } from "../modules";

  /**
   * Component principal para o popup da extensão Omni Max.
   * Permite ao usuário configurar várias funcionalidades da extensão.
   */

  // Estados de controle da UI
  let isLoading = true;
  let hasPendingChanges = false;
  let showCredentialsModal = false;

  // Estados locais para os valores das configurações (sincronizados com os stores)
  let localGlobalEnabled: boolean;
  let localModuleStates: Record<string, boolean> = {};
  let localShortcutsOverallEnabled: boolean;
  let localAiFeaturesEnabled: boolean;
  let localAiCredentials: AiCredentials = { openaiApiKey: "" };
  let localAiProviderConfig: AiProviderConfig = {
    provider: "openai",
    model: "gpt-4o-mini",
  };
  let localPrompts: PromptsConfig = {
    summaryPrompt: "",
    improvementPrompt: "",
  };
  let localOpenSections: CollapsibleSectionsState;

  // Cópias dos estados iniciais para detectar mudanças
  let initialGlobalEnabled: boolean;
  let initialModuleStates: Record<string, boolean> = {};
  let initialShortcutsOverallEnabled: boolean;
  let initialAiFeaturesEnabled: boolean;
  let initialAiCredentials: AiCredentials = { openaiApiKey: "" };
  let initialAiProviderConfig: AiProviderConfig = {
    provider: "openai",
    model: "gpt-4o-mini",
  };
  let initialPrompts: PromptsConfig = {
    summaryPrompt: "",
    improvementPrompt: "",
  };
  let initialOpenSections: CollapsibleSectionsState;

  // Filtros para categorizar os módulos nas seções da UI
  const generalModules = availableModules.filter((m) =>
    ["layoutCorrection", "messageTemplates", "templateProcessor"].includes(
      m.id,
    ),
  );
  const shortcutModules = availableModules.filter((m) =>
    ["shortcutCopyName", "shortcutCopyCPF"].includes(m.id),
  );
  const aiModules = availableModules.filter((m) =>
    ["aiChatSummary", "aiResponseReview"].includes(m.id),
  );

  let localShortcutKeys: ShortcutKeysConfig = {
    // Boa prática inicializar com a estrutura esperada
    shortcutCopyName: "Z", // Default visual antes do onMount
    shortcutCopyCPF: "X", // Default visual antes do onMount
  };

  let initialShortcutKeys: ShortcutKeysConfig = {
    // Boa prática inicializar
    shortcutCopyName: "Z",
    shortcutCopyCPF: "X",
  };
  // Handler para mudança da tecla de atalho (exemplo para um módulo)
  function handleShortcutKeyChange(moduleId: string, event: Event) {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value.toUpperCase();

    if (value.length > 1) {
      value = value.charAt(value.length - 1); // Pega apenas o último caractere digitado
    }

    if (value === "" || /^[A-Z0-9]$/.test(value)) {
      // Permite letras ou números
      // Para garantir reatividade no Svelte ao modificar propriedades de objeto:
      localShortcutKeys = {
        ...localShortcutKeys,
        [moduleId]: value,
      };
      markChanged();
    } else {
      // Reverte para o valor anterior se inválido, para o input refletir
      inputElement.value = localShortcutKeys[moduleId] || "";
    }
  }

  /**
   * @description Inicializa os estados locais do componente ao ser montado,
   * subscrevendo aos Svelte stores para obter os valores persistidos.
   * Também armazena os estados iniciais para detecção de mudanças.
   */
  onMount(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      globalExtensionEnabledStore.subscribe((val) => {
        localGlobalEnabled = val;
        initialGlobalEnabled = val;
      }),
    );
    unsubs.push(
      moduleStatesStore.subscribe((val) => {
        localModuleStates = { ...val };
        initialModuleStates = { ...val };
        for (const module of availableModules) {
          if (localModuleStates[module.id] === undefined) {
            localModuleStates[module.id] = module.defaultEnabled;
            initialModuleStates[module.id] = module.defaultEnabled;
          }
        }
      }),
    );
    unsubs.push(
      shortcutsOverallEnabledStore.subscribe((val) => {
        localShortcutsOverallEnabled = val;
        initialShortcutsOverallEnabled = val;
      }),
    );
    unsubs.push(
      shortcutKeysStore.subscribe((val) => {
        localShortcutKeys = { ...val }; // Carrega do store
        initialShortcutKeys = { ...val }; // Define o estado inicial para comparação
        // Garante que as chaves para os módulos de atalho existem, se não vierem do storage
        for (const module of shortcutModules) {
          if (localShortcutKeys[module.id] === undefined) {
            // Se não houver valor salvo, pega do default do store ou define um aqui
            const defaultKey =
              (shortcutKeysStore as any).initialValue?.[module.id] ||
              (module.id === "shortcutCopyName" ? "X" : "C");
            localShortcutKeys[module.id] = defaultKey;
            initialShortcutKeys[module.id] = defaultKey;
          }
        }
      }),
    );
    unsubs.push(
      aiFeaturesEnabledStore.subscribe((val) => {
        localAiFeaturesEnabled = val;
        initialAiFeaturesEnabled = val;
      }),
    );
    unsubs.push(
      aiCredentialsStore.subscribe((val) => {
        localAiCredentials = { ...val };
        initialAiCredentials = { ...val };
      }),
    );
    unsubs.push(
      aiProviderConfigStore.subscribe((val) => {
        localAiProviderConfig = { ...val };
        initialAiProviderConfig = { ...val };
      }),
    );
    unsubs.push(
      promptsStore.subscribe((val) => {
        localPrompts = { ...val };
        initialPrompts = { ...val };
      }),
    );
    unsubs.push(
      collapsibleSectionsStateStore.subscribe((val) => {
        localOpenSections = { ...val };
        initialOpenSections = { ...val };
      }),
    );

    isLoading = false;

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  });

  /**
   * @description Marca que existem alterações pendentes a serem salvas,
   * habilitando o botão "Aplicar Alterações".
   */
  function markChanged() {
    hasPendingChanges = true;
  }

  /**
   * @description Alterna o estado de visibilidade (aberto/fechado) de uma seção colapsável.
   * Implementa o comportamento de "acordeão", onde apenas uma seção pode
   * estar aberta por vez (ou todas fechadas).
   * @param sectionKeyToToggle A chave da seção que teve o toggle clicado.
   */
  function toggleSectionCollapse(
    sectionKeyToToggle: keyof CollapsibleSectionsState,
  ) {
    if (localOpenSections) {
      const isCurrentlyOpen = localOpenSections[sectionKeyToToggle];

      // Cria um novo estado base com todas as seções fechadas
      const newOpenState: CollapsibleSectionsState = {
        modules: false,
        shortcuts: false,
        ai: false,
        prompts: false,
      };

      // Se a seção clicada não estava aberta, abre-a.
      // Se estava aberta, ela será fechada (e todas as outras permanecem fechadas).
      if (!isCurrentlyOpen) {
        newOpenState[sectionKeyToToggle] = true;
      }
      // Se estava aberta e foi clicada, newOpenState[sectionKeyToToggle] continuará false, efetivamente fechando-a.

      localOpenSections = newOpenState;
      // markChanged(); // Mudança no estado das seções também é uma alteração a ser aplicada.
    }
  }

  /**
   * @description Salva todas as configurações locais modificadas pelo usuário nos Svelte stores,
   * o que por sua vez aciona a persistência no chrome.storage.sync.
   * Reseta os estados iniciais para refletir as novas configurações salvas.
   * (A lógica de recarregar a página da plataforma será adicionada posteriormente).
   */
  function applyChanges() {
    globalExtensionEnabledStore.set(localGlobalEnabled);
    moduleStatesStore.set({ ...localModuleStates });
    shortcutsOverallEnabledStore.set(localShortcutsOverallEnabled);
    shortcutKeysStore.set({ ...localShortcutKeys });
    aiFeaturesEnabledStore.set(localAiFeaturesEnabled);
    aiCredentialsStore.set({ ...localAiCredentials });
    aiProviderConfigStore.set({ ...localAiProviderConfig });
    promptsStore.set({ ...localPrompts });
    collapsibleSectionsStateStore.set({ ...localOpenSections });

    initialGlobalEnabled = localGlobalEnabled;
    initialModuleStates = { ...localModuleStates };
    initialShortcutsOverallEnabled = localShortcutsOverallEnabled;
    initialShortcutKeys = { ...localShortcutKeys };
    initialAiFeaturesEnabled = localAiFeaturesEnabled;
    initialAiCredentials = { ...localAiCredentials };
    initialAiProviderConfig = { ...localAiProviderConfig };
    initialPrompts = { ...localPrompts };
    initialOpenSections = { ...localOpenSections };

    hasPendingChanges = false;
    alert("Alterações aplicadas! (Lógica de reload da página pendente)");
    // TODO: Adicionar lógica de reload da página aqui (requer permissão "tabs")
  }

  const modelOptions: Record<string, string[]> = {
    openai: ["gpt-4", "gpt-4o-mini", "gpt-4-turbo", "gpt-4o"],
    gemini: ["gemini-1.0-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
    anthropic: [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
  };
</script>

<div class="omni-max-popup-container-fixed-layout">
  <div class="popup-header-fixed">
    <div class="header-title-group">
      <h1>Omni Max</h1>
      <p>Assistente para Matrix Go</p>
    </div>
    <div class="header-global-toggle">
      <ToggleSwitch
        label=""
        enabled={localGlobalEnabled}
        onChange={(val) => {
          localGlobalEnabled = val;
          markChanged();
        }}
      />
      <span
        class="global-status-indicator {localGlobalEnabled
          ? 'active'
          : 'inactive'}"
      >
        {localGlobalEnabled ? "Ativa" : "Desativada"}
      </span>
    </div>
  </div>

  <div class="popup-scrollable-content">
    {#if isLoading}
      <p class="loading-text">Carregando configurações...</p>
    {:else}
      <CollapsibleSection
        title="Módulos Gerais"
        icon={ListChecks}
        isOpen={localOpenSections?.modules}
        onToggle={() => toggleSectionCollapse("modules")}
      >
        <div class="section-item-space">
          {#each generalModules as module (module.id)}
            <div class="module-item-container">
              <span class="module-name-with-tooltip" title={module.description}>
                {module.name}
              </span>
              <ToggleSwitch
                enabled={localModuleStates[module.id]}
                onChange={(val) => {
                  localModuleStates[module.id] = val;
                  markChanged();
                }}
                disabled={!localGlobalEnabled}
              />
            </div>
          {/each}
          {#if generalModules.length === 0}
            <p class="placeholder-text">Nenhum módulo geral configurado.</p>
          {/if}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Atalhos de Teclado"
        icon={Keyboard}
        isOpen={localOpenSections?.shortcuts}
        onToggle={() => toggleSectionCollapse("shortcuts")}
      >
        <div class="section-item-space">
          <ToggleSwitch
            label="Habilitar Todos os Atalhos"
            enabled={localShortcutsOverallEnabled}
            onChange={(val) => {
              localShortcutsOverallEnabled = val;
              markChanged();
            }}
            disabled={!localGlobalEnabled}
          />
          {#if localShortcutsOverallEnabled && localGlobalEnabled}
            {#each shortcutModules as module (module.id)}
              <div class="shortcut-definition-item">
                <span class="shortcut-module-label" title={module.description}>
                  {module.name}
                </span>
                <div class="shortcut-controls-improved">
                  <ToggleSwitch
                    enabled={localModuleStates[module.id]}
                    onChange={(val) => {
                      localModuleStates[module.id] = val;
                      markChanged();
                    }}
                    disabled={!localGlobalEnabled ||
                      !localShortcutsOverallEnabled}
                  />
                  <span class="shortcut-prefix">Ctrl + Shift +</span>
                  <input
                    type="text"
                    class="shortcut-key-input-editable"
                    value={localShortcutKeys[module.id] || ""}
                    on:input={(event) =>
                      handleShortcutKeyChange(module.id, event)}
                    maxlength="1"
                    placeholder={localShortcutKeys[module.id] ||
                      (module.id === "shortcutCopyName"
                        ? "X"
                        : module.id === "shortcutCopyCPF"
                          ? "C"
                          : "?")}
                    disabled={!localGlobalEnabled ||
                      !localShortcutsOverallEnabled ||
                      !localModuleStates[module.id]}
                  />
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Configurações de IA"
        icon={Cpu}
        isOpen={localOpenSections?.ai}
        onToggle={() => toggleSectionCollapse("ai")}
      >
        <div class="section-item-space">
          <ToggleSwitch
            label="Habilitar Todas as Funções de IA"
            enabled={localAiFeaturesEnabled}
            onChange={(val) => {
              localAiFeaturesEnabled = val;
              markChanged();
            }}
            disabled={!localGlobalEnabled}
          />
          {#if localAiFeaturesEnabled && localGlobalEnabled}
            <div class="input-group">
              <label for="aiProvider">Provedor de IA</label>
              <select
                id="aiProvider"
                class="select-field"
                bind:value={localAiProviderConfig.provider}
                on:change={() => {
                  markChanged();
                  localAiProviderConfig.model =
                    modelOptions[
                      localAiProviderConfig.provider
                    ][0]; /* Reseta modelo ao mudar provedor */
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div class="input-group">
              <label for="aiModel">Modelo</label>
              <select
                id="aiModel"
                class="select-field"
                bind:value={localAiProviderConfig.model}
                on:change={markChanged}
              >
                {#if localAiProviderConfig.provider && modelOptions[localAiProviderConfig.provider]}
                  {#each modelOptions[localAiProviderConfig.provider] as m (m)}
                    <option value={m}>{m}</option>
                  {/each}
                {/if}
              </select>
            </div>
            <button
              class="button-primary full-width"
              on:click={() => (showCredentialsModal = true)}
            >
              Gerenciar Credenciais ({localAiProviderConfig.provider
                ? localAiProviderConfig.provider.charAt(0).toUpperCase() +
                  localAiProviderConfig.provider.slice(1)
                : ""})
            </button>
            <hr class="sub-separator" />
            <p class="section-subtitle">Módulos de IA Individuais:</p>
            {#each aiModules as module (module.id)}
              <div class="module-item-container">
                <span
                  class="module-name-with-tooltip"
                  title={module.description}
                >
                  {module.name}
                </span>
                <ToggleSwitch
                  enabled={localModuleStates[module.id]}
                  onChange={(val) => {
                    localModuleStates[module.id] = val;
                    markChanged();
                  }}
                  disabled={!localGlobalEnabled || !localAiFeaturesEnabled}
                />
              </div>
            {/each}
            {#if aiModules.length === 0}
              <p class="placeholder-text">
                Nenhuma funcionalidade de IA configurada.
              </p>
            {/if}
          {:else if !localGlobalEnabled}
            <p class="placeholder-text">Extensão global desabilitada.</p>
          {:else}
            <p class="placeholder-text">Funções de IA desabilitadas.</p>
          {/if}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Prompts Customizáveis"
        icon={FileText}
        isOpen={localOpenSections?.prompts}
        onToggle={() => toggleSectionCollapse("prompts")}
      >
        <div class="section-item-space">
          {#if !localGlobalEnabled || !localAiFeaturesEnabled}
            <p class="placeholder-text">
              Prompts disponíveis quando a extensão e as funções de IA estiverem
              habilitadas.
            </p>
          {:else}
            <div class="input-group">
              <label for="summaryPrompt">Prompt de Resumo</label>
              <textarea
                id="summaryPrompt"
                class="textarea-field"
                rows="3"
                placeholder="Prompt para resumir atendimentos..."
                bind:value={localPrompts.summaryPrompt}
                on:input={markChanged}
              ></textarea>
            </div>
            <div class="input-group">
              <label for="improvementPrompt"
                >Prompt de Melhoria de Resposta</label
              >
              <textarea
                id="improvementPrompt"
                class="textarea-field"
                rows="3"
                placeholder="Prompt para melhorar respostas..."
                bind:value={localPrompts.improvementPrompt}
                on:input={markChanged}
              ></textarea>
            </div>
            <button class="button-secondary full-width icon-button">
              <Eye size={16} /> Testar Prompt (Funcionalidade futura)
            </button>
          {/if}
        </div>
      </CollapsibleSection>
    {/if}
  </div>
  <div class="actions-footer-fixed">
    <button
      class="apply-button"
      on:click={applyChanges}
      disabled={!hasPendingChanges || isLoading}
    >
      Aplicar Alterações
    </button>
  </div>

  {#if showCredentialsModal}
    <div
      class="modal-overlay"
      role="button"
      tabindex="0"
      aria-label="Fechar modal ao clicar fora"
      on:click|self={() => (showCredentialsModal = false)}
      on:keydown|self={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showCredentialsModal = false;
        } else if (event.key === "Escape") {
          showCredentialsModal = false;
        }
      }}
    >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credentials-modal-title"
        on:click|stopPropagation
      >
        <div class="modal-header">
          <h3>
            Credenciais: {localAiProviderConfig.provider
              ? localAiProviderConfig.provider.charAt(0).toUpperCase() +
                localAiProviderConfig.provider.slice(1)
              : "IA"}
          </h3>
          <button
            class="close-button"
            on:click={() => (showCredentialsModal = false)}
            ><X size={20} /></button
          >
        </div>
        <div class="modal-body">
          {#if localAiProviderConfig.provider === "openai"}
            <div class="input-group">
              <label for="openaiApiKey">OpenAI API Key</label>
              <input
                type="password"
                id="openaiApiKey"
                class="input-field"
                bind:value={localAiCredentials.openaiApiKey}
                on:input={markChanged}
                placeholder="sk-..."
              />
            </div>
          {:else if localAiProviderConfig.provider === "gemini"}
            <div class="input-group">
              <label for="geminiApiKey">Google Gemini API Key</label>
              <input
                type="password"
                id="geminiApiKey"
                class="input-field"
                bind:value={localAiCredentials.geminiApiKey}
                on:input={markChanged}
                placeholder="Seu Gemini API Key..."
              />
            </div>
          {:else if localAiProviderConfig.provider === "anthropic"}
            <div class="input-group">
              <label for="anthropicApiKey">Anthropic API Key</label>
              <input
                type="password"
                id="anthropicApiKey"
                class="input-field"
                bind:value={localAiCredentials.anthropicApiKey}
                on:input={markChanged}
                placeholder="Seu Anthropic API Key..."
              />
            </div>
          {:else}
            <p>
              Nenhum provedor de IA selecionado ou configuração de credenciais
              não implementada para {localAiProviderConfig.provider}.
            </p>
          {/if}
        </div>
        <div class="modal-footer">
          <button
            class="button-secondary"
            on:click={() => (showCredentialsModal = false)}>Cancelar</button
          >
          <button
            class="button-primary"
            on:click={() => {
              showCredentialsModal = false; /* markChanged() já foi chamado nos inputs do modal */
            }}>OK</button
          >
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Estilos Globais do Popup e Layout Fixo */
  .omni-max-popup-container-fixed-layout {
    display: flex;
    flex-direction: column;
    width: 380px; /* Aumentei um pouco para acomodar melhor o conteúdo */
    max-height: 580px; /* Altura máxima do popup do Chrome é ~600px */
    overflow: hidden;
    background-color: #f4f6f8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    font-size: 14px;
    color: #333;
    border-radius: 0.375rem; /* Para arredondar o popup inteiro */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .popup-header-fixed {
    display: flex;
    justify-content: space-between;
    align-items: center;
    /* Outros estilos do header que você já tem (background, color, padding, etc.) */
    flex-shrink: 0;
    background: linear-gradient(to right, #a9276f, #d02125, #d6621c);
    color: white;
    padding: 12px 16px; /* Ajuste o padding se necessário */
  }
  .header-title-group h1 {
    font-size: 1.1rem; /* Ajustado */
    font-weight: 600;
    margin: 0;
    line-height: 1.2;
  }
  .header-title-group p {
    font-size: 0.75rem; /* Ajustado */
    opacity: 0.85;
    margin: 2px 0 0;
    line-height: 1.2;
  }
  .header-global-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .global-status-indicator {
    /* Similar ao status-indicator mas para o header */
    padding: 3px 8px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    background-color: rgba(255, 255, 255, 0.2); /* Fundo sutil */
  }
  .global-status-indicator.active {
    background-color: rgba(
      255,
      255,
      255,
      0.25
    ); /* Mantém um fundo claro para contraste no header escuro */
    color: #fff; /* Texto branco, talvez com uma borda sutil se necessário */
    /* Ou, se quiser usar uma das cores sólidas e garantir contraste: */
    /* background-color: #FFFFFF; */
    /* color: #a9276f; */ /* Texto com a cor do tema */
  }
  .global-status-indicator.inactive {
    background-color: rgba(0, 0, 0, 0.2);
    color: #f0f0f0;
  }

  .popup-scrollable-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .loading-text {
    text-align: center;
    padding: 20px;
    color: #555;
  }

  .actions-footer-fixed {
    flex-shrink: 0;
    background-color: #f4f6f8;
    padding: 12px 16px;
    border-top: 1px solid #e0e0e0;
    text-align: right;
  }
  .apply-button {
    padding: 10px 20px; /* Mantive o padding que estava no seu arquivo completo */
    /* Aplicar gradiente como background-image */
    background-image: linear-gradient(to right, #a9276f, #d02125, #d6621c);
    /* Cor de fallback caso o gradiente não seja suportado (raro hoje em dia) */
    background-color: #a9276f;
    color: white;
    border: none;
    border-radius: 0.375rem; /* 6px */
    font-weight: 500;
    cursor: pointer;
    font-size: 0.9em;
    transition:
      filter 0.2s ease,
      opacity 0.2s ease; /* Transição para hover e disabled */
  }

  .apply-button:hover:not(:disabled) {
    filter: brightness(110%);
    /* Outras opções para hover:
     filter: brightness(90%); /* Levemente mais escuro */
    /* box-shadow: 0 2px 8px rgba(0,0,0,0.2); /* Uma sombra sutil */
  }

  .apply-button:disabled {
    background-image: none; /* ESSENCIAL: Remove a imagem de gradiente */
    background-color: #bdc3c7; /* Cor sólida cinza para o estado desabilitado */
    color: #7f8c8d; /* Cor do texto mais escura para contraste no cinza claro */
    cursor: not-allowed;
    opacity: 0.65; /* Reduz a opacidade para indicar visualmente que está desabilitado */
  }

  /* Estilos para Itens dentro das Seções */
  .section-item-space > div:not(:last-child),
  .section-item-space > button:not(:last-child),
  .section-item-space > .shortcut-definition-item:not(:last-child),
  .section-item-space > .module-item-container:not(:last-child),
  .section-item-space > .input-group:not(:last-child),
  .section-item-space > .placeholder-text:not(:last-child) {
    margin-bottom: 16px;
  }

  .module-item-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .module-name-with-tooltip {
    flex-grow: 1;
    margin-right: 8px; /* Inverti o margin para ficar antes do toggle */
    font-size: 0.9em;
    font-weight: 500;
    order: -1; /* Faz o nome vir antes do toggle no flex */
    cursor: default; /* Para mostrar que o tooltip é no texto */
  }

  /* Atalhos */
  .shortcut-definition-item {
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #e0e0e0;
  }
  .shortcut-definition-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .shortcut-module-label {
    display: block;
    font-weight: 500;
    font-size: 0.9em;
    margin-bottom: 8px;
    color: #333;
    cursor: default;
  }
  .shortcut-controls-improved {
    display: flex;
    align-items: center;
    gap: 8px; /* Espaço entre os elementos */
  }
  .shortcut-prefix {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
      monospace;
    font-size: 0.85em;
    color: #555;
  }
  .shortcut-key-input-editable {
    width: 40px; /* Largura para uma letra */
    height: 30px;
    text-align: center;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
      monospace;
    font-size: 0.9em;
    font-weight: bold;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem; /* rounded-sm ou md */
    padding: 4px;
    box-sizing: border-box;
  }
  .shortcut-key-input-editable:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    outline: none;
  }

  /* Inputs, Selects, Textareas */
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
  .input-field,
  .select-field,
  .textarea-field {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    box-sizing: border-box;
    background-color: white;
  }
  .input-field:focus,
  .select-field:focus,
  .textarea-field:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); /* Sombra mais sutil */
  }
  .textarea-field {
    min-height: 70px;
    resize: vertical;
  }

  /* Botões Genéricos */
  .button-primary,
  .button-secondary {
    padding: 8px 16px;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease;
    border: 1px solid transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.875rem;
  }
  .button-primary {
    background-color: #3b82f6;
    color: white;
  }
  .button-primary:hover:not(:disabled) {
    background-color: #2563eb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .button-secondary {
    background-color: #e5e7eb;
    color: #374151;
  }
  .button-secondary:hover:not(:disabled) {
    background-color: #d1d5db;
  }
  .full-width {
    width: 100%;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .modal-content {
    background-color: white;
    padding: 20px;
    border-radius: 0.5rem;
    width: 90%;
    max-width: 340px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }
  .modal-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
  .close-button {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
  }
  .close-button:hover {
    color: #4b5563;
  }
  .modal-body > .input-group:not(:last-child) {
    margin-bottom: 16px;
  }
  .modal-footer {
    display: flex;
    gap: 8px;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid #eee;
  }
  .modal-footer button {
    flex: 1;
  }

  /* Outros */
  .placeholder-text {
    font-style: italic;
    color: #777;
    text-align: center;
    padding: 10px 0;
  }
  .sub-separator {
    border: none;
    border-top: 1px dashed #e0e0e0;
    margin: 16px 0;
  }
  .section-subtitle {
    font-size: 0.9em;
    font-weight: 500;
    color: #444;
    margin-top: 16px;
    margin-bottom: 10px;
  }
</style>
