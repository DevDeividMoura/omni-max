<script lang="ts">
  /**
   * OmniMaxPopup.svelte
   * Main UI component for the Omni Max Chrome extension's popup.
   * It allows users to configure global settings, enable/disable individual modules,
   * manage AI provider settings, customize prompts, and set keyboard shortcuts.
   * State is loaded from and saved to persistent storage via Svelte stores.
   *
   * @component
   */
  import { onMount, createEventDispatcher } from "svelte";
  import CollapsibleSection from "./CollapsibleSection.svelte";
  import ToggleSwitch from "./ToggleSwitch.svelte";
  import {
    Keyboard,
    Cpu,
    FileText,
    ListChecks,
    XCircle,
    Info,
    Github,
  } from "lucide-svelte";

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

  import { availableModules, type Module } from "../modules"; // Import Module type
    import GithubMarkIcon from "./icons/GithubMarkIcon.svelte";

  const dispatch = createEventDispatcher();

  // --- UI Control States ---
  /** Indicates if the component is currently loading initial settings. */
  let isLoading: boolean = true;
  /** Tracks if there are any unsaved changes made by the user. */
  let hasPendingChanges: boolean = false;
  /** Controls the visibility of the AI credentials management modal. */
  let showCredentialsModal: boolean = false;

  // --- Local Copies of Stored Settings ---
  // These are bound to UI elements and synced with stores on "Apply Changes".
  let localGlobalEnabled: boolean;
  let localModuleStates: Record<string, boolean> = {};
  let localShortcutsOverallEnabled: boolean;
  let localAiFeaturesEnabled: boolean;
  let localAiCredentials: AiCredentials = { openaiApiKey: "" }; // Initialize structure
  let localAiProviderConfig: AiProviderConfig = {
    provider: "openai",
    model: "gpt-4o-mini",
  };
  let localPrompts: PromptsConfig = {
    summaryPrompt: "",
    improvementPrompt: "",
  };
  let localOpenSections: CollapsibleSectionsState = {
    modules: false,
    shortcuts: false,
    ai: false,
    prompts: false,
  };
  let localShortcutKeys: ShortcutKeysConfig = {};

  // --- Initial States for Change Detection ---
  // Snapshots of settings when the component loads, used to detect `hasPendingChanges`.
  let initialGlobalEnabled: boolean;
  let initialModuleStates: Record<string, boolean>;
  let initialShortcutsOverallEnabled: boolean;
  let initialAiFeaturesEnabled: boolean;
  let initialAiCredentials: AiCredentials;
  let initialAiProviderConfig: AiProviderConfig;
  let initialPrompts: PromptsConfig;
  let initialOpenSections: CollapsibleSectionsState;
  let initialShortcutKeys: ShortcutKeysConfig;

  // --- Derived Data for UI ---
  /** Modules categorized as 'general' for UI grouping. */
  const generalModules: Module[] = availableModules.filter(
    (m) => ["layoutCorrection", "templateProcessor"].includes(m.id), // "messageTemplates" was in your filter but not in availableModules, removed for now.
  );
  /** Modules categorized as 'shortcuts' for UI grouping. */
  const shortcutModules: Module[] = availableModules.filter((m) =>
    ["shortcutCopyName", "shortcutCopyDocumentNumber"].includes(m.id),
  );
  /** Modules categorized as 'AI features' for UI grouping. */
  const aiModules: Module[] = availableModules.filter((m) =>
    ["aiChatSummary", "aiResponseReview"].includes(m.id),
  );

  /** Available AI models grouped by provider. */
  const modelOptions: Record<string, string[]> = {
    openai: ["gpt-4", "gpt-4o-mini", "gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"],
    gemini: ["gemini-1.0-pro", "gemini-1.5-pro", "gemini-1.5-flash"], // Placeholder, ensure these are valid for your use case
    anthropic: [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
  };

  // --- Component Lifecycle & Initialization ---
  /**
   * Subscribes to all relevant Svelte stores upon component mounting.
   * Initializes local state variables with values from storage and
   * sets up initial state snapshots for change detection.
   * Ensures default values are applied for any new modules or settings.
   * @private
   */
  onMount(() => {
    const unsubs: (() => void)[] = [];
    let isFirstSubscriptionCall = true; // Flag to set initial values only once if multiple subscriptions fire rapidly

    const setupInitialValue = <T,>(
      value: T,
      initialSetter: (val: T) => void,
      localSetter: (val: T) => void,
    ) => {
      localSetter(JSON.parse(JSON.stringify(value))); // Deep copy for objects/arrays
      if (isFirstSubscriptionCall) {
        initialSetter(JSON.parse(JSON.stringify(value)));
      }
    };

    unsubs.push(
      globalExtensionEnabledStore.subscribe((val) =>
        setupInitialValue(
          val,
          (v) => (initialGlobalEnabled = v),
          (v) => (localGlobalEnabled = v),
        ),
      ),
    );
    unsubs.push(
      shortcutsOverallEnabledStore.subscribe((val) =>
        setupInitialValue(
          val,
          (v) => (initialShortcutsOverallEnabled = v),
          (v) => (localShortcutsOverallEnabled = v),
        ),
      ),
    );
    unsubs.push(
      aiFeaturesEnabledStore.subscribe((val) =>
        setupInitialValue(
          val,
          (v) => (initialAiFeaturesEnabled = v),
          (v) => (localAiFeaturesEnabled = v),
        ),
      ),
    );
    unsubs.push(
      aiCredentialsStore.subscribe((val) =>
        setupInitialValue(
          val || { openaiApiKey: "" },
          (v) => (initialAiCredentials = v),
          (v) => (localAiCredentials = v),
        ),
      ),
    );
    unsubs.push(
      aiProviderConfigStore.subscribe((val) =>
        setupInitialValue(
          val || { provider: "openai", model: "gpt-4o-mini" },
          (v) => (initialAiProviderConfig = v),
          (v) => (localAiProviderConfig = v),
        ),
      ),
    );
    unsubs.push(
      promptsStore.subscribe((val) =>
        setupInitialValue(
          val || { summaryPrompt: "", improvementPrompt: "" },
          (v) => (initialPrompts = v),
          (v) => (localPrompts = v),
        ),
      ),
    );
    unsubs.push(
      collapsibleSectionsStateStore.subscribe((val) =>
        setupInitialValue(
          val || {
            modules: false,
            shortcuts: false,
            ai: false,
            prompts: false,
          },
          (v) => (initialOpenSections = v),
          (v) => (localOpenSections = v),
        ),
      ),
    );

    unsubs.push(
      moduleStatesStore.subscribe((storedStates) => {
        const currentLocal: Record<string, boolean> = {};
        const currentInitial: Record<string, boolean> = {};
        for (const module of availableModules) {
          currentLocal[module.id] =
            storedStates[module.id] ?? module.defaultEnabled;
          if (isFirstSubscriptionCall) {
            currentInitial[module.id] =
              storedStates[module.id] ?? module.defaultEnabled;
          }
        }
        localModuleStates = currentLocal;
        if (isFirstSubscriptionCall) {
          initialModuleStates = currentInitial;
        }
      }),
    );

    unsubs.push(
      shortcutKeysStore.subscribe((storedKeys) => {
        const currentLocal: ShortcutKeysConfig = {};
        const currentInitial: ShortcutKeysConfig = {};
        const defaultShortcutValues =
          (shortcutKeysStore as any).initialValue || {}; // Accessing private initialValue; better to get defaults from module definition if possible

        for (const module of shortcutModules) {
          // Determine default key more robustly if possible, or hardcode as fallback
          let defaultKey = defaultShortcutValues[module.id];
          if (!defaultKey) {
            // Fallback if not in store's initial value
            if (module.id === "shortcutCopyName") defaultKey = "Z";
            else if (module.id === "shortcutCopyDocumentNumber")
              defaultKey = "X";
            else defaultKey = "?";
          }
          currentLocal[module.id] = storedKeys[module.id] ?? defaultKey;
          if (isFirstSubscriptionCall) {
            currentInitial[module.id] = storedKeys[module.id] ?? defaultKey;
          }
        }
        localShortcutKeys = currentLocal;
        if (isFirstSubscriptionCall) {
          initialShortcutKeys = currentInitial;
        }
      }),
    );

    isLoading = false;
    isFirstSubscriptionCall = false; // After all initial subscriptions might have run

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  });

  // --- Event Handlers & UI Logic ---
  /**
   * Marks that changes have been made to the settings, enabling the "Apply Changes" button.
   * @private
   */
  function markChanged(): void {
    hasPendingChanges = true;
  }

  /**
   * Toggles the open/closed state of a collapsible UI section.
   * Implements an "accordion" behavior where only one main section can be open at a time.
   * @param {keyof CollapsibleSectionsState} sectionKeyToToggle The key of the section to toggle.
   * @private
   */
  function toggleSectionCollapse(
    sectionKeyToToggle: keyof CollapsibleSectionsState,
  ): void {
    if (localOpenSections) {
      const isCurrentlyOpen = localOpenSections[sectionKeyToToggle];
      // Create a new state with all sections closed (for accordion behavior)
      const newOpenState: CollapsibleSectionsState = {
        modules: false,
        shortcuts: false,
        ai: false,
        prompts: false,
      };

      if (!isCurrentlyOpen) {
        newOpenState[sectionKeyToToggle] = true; // Open the clicked section
      }
      // If it was open, it remains closed in newOpenState.
      localOpenSections = newOpenState;
      markChanged(); // Persist accordion state changes
    }
  }

  /**
   * Handles changes to a shortcut key input field.
   * Validates the input to allow only single uppercase letters or numbers.
   * @param {string} moduleId The ID of the shortcut module being configured.
   * @param {Event} event The input event from the HTMLInputElement.
   * @private
   */
  function handleShortcutKeyChange(moduleId: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value.toUpperCase();

    if (value.length > 1) {
      value = value.charAt(value.length - 1); // Take only the last character entered
    }

    if (value === "" || /^[A-Z0-9]$/.test(value)) {
      // Allow empty (to clear) or single alphanumeric
      localShortcutKeys = { ...localShortcutKeys, [moduleId]: value };
      markChanged();
    } else {
      // Revert to the previous valid value if input is invalid
      inputElement.value = localShortcutKeys[moduleId] || "";
    }
  }

  /**
   * Saves all current local settings to their respective Svelte stores,
   * which triggers persistence to `chrome.storage.sync`.
   * Resets the `initial...` state variables to reflect the newly saved values
   * and disables the "Apply Changes" button.
   * @private
   */
  function applyChanges(): void {
    if (isLoading) return;

    globalExtensionEnabledStore.set(localGlobalEnabled);
    moduleStatesStore.set({ ...localModuleStates });
    shortcutsOverallEnabledStore.set(localShortcutsOverallEnabled);
    shortcutKeysStore.set({ ...localShortcutKeys });
    aiFeaturesEnabledStore.set(localAiFeaturesEnabled);
    aiCredentialsStore.set({ ...localAiCredentials });
    aiProviderConfigStore.set({ ...localAiProviderConfig });
    promptsStore.set({ ...localPrompts });
    collapsibleSectionsStateStore.set({ ...localOpenSections });

    // Update initial states to reflect saved changes
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
    alert(
      "Alterações aplicadas! A aba da plataforma Matrix Go será recarregada para aplicar todas as mudanças.",
    );

    // Reload active Matrix Go tabs
    chrome.tabs.query(
      { url: "https://vipmax.matrixdobrasil.ai/Painel/*" },
      (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.reload(tab.id);
          }
        }
      },
    );
    // Consider closing the popup after applying changes
    // window.close();
  }

  /**
   * Resets all local settings to their last saved (initial) values,
   * discarding any pending changes.
   * @private
   */
  function discardChanges(): void {
    if (isLoading) return;

    localGlobalEnabled = initialGlobalEnabled;
    localModuleStates = { ...initialModuleStates };
    localShortcutsOverallEnabled = initialShortcutsOverallEnabled;
    localShortcutKeys = { ...initialShortcutKeys };
    localAiFeaturesEnabled = initialAiFeaturesEnabled;
    localAiCredentials = { ...initialAiCredentials };
    localAiProviderConfig = { ...initialAiProviderConfig };
    localPrompts = { ...initialPrompts };
    localOpenSections = { ...initialOpenSections };

    hasPendingChanges = false;
    // alert("Alterações pendentes descartadas."); // Optional user feedback
  }
</script>

<div class="omni-max-popup-container-fixed-layout">
  <div class="popup-header-fixed">
    <div class="header-title-group">
      <h1>Omni Max</h1>
      <p>Assistente para Matrix Go</p>
    </div>
    <div class="header-controls">
      <div class="header-global-toggle">
        <ToggleSwitch
          label=""
          enabled={localGlobalEnabled}
          onChange={(val) => {
            localGlobalEnabled = val;
            markChanged();
          }}
          ariaLabel="Habilitar ou desabilitar toda a extensão Omni Max"
        />
        <span
          class="global-status-indicator {localGlobalEnabled
            ? 'active'
            : 'inactive'}"
        >
          {localGlobalEnabled ? "Ativa" : "Desativada"}
        </span>
      </div>
      <a
        href="https://github.com/DevDeividMoura/omni-max"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link-header"
        title="Ver repositório do Omni Max no GitHub"
      >

      <GithubMarkIcon size={20} className="github-svg-icon" />
      </a>
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
                  localModuleStates = {
                    ...localModuleStates,
                    [module.id]: val,
                  };
                  markChanged();
                }}
                disabled={!localGlobalEnabled}
                ariaLabel={`Ativar ou desativar ${module.name}`}
              />
            </div>
          {:else}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Nenhum módulo geral configurado.
            </p>
          {/each}
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
            ariaLabel="Ativar ou desativar globalmente todos os atalhos de teclado"
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
                      localModuleStates = {
                        ...localModuleStates,
                        [module.id]: val,
                      };
                      markChanged();
                    }}
                    disabled={!localGlobalEnabled ||
                      !localShortcutsOverallEnabled}
                    ariaLabel={`Ativar ou desativar o atalho ${module.name}`}
                  />
                  <span class="shortcut-prefix" aria-hidden="true"
                    >Ctrl + Shift +</span
                  >
                  <input
                    type="text"
                    class="shortcut-key-input-editable"
                    value={localShortcutKeys[module.id] || ""}
                    on:input={(event) =>
                      handleShortcutKeyChange(module.id, event)}
                    maxlength="1"
                    placeholder="Tecla"
                    aria-label={`Tecla para ${module.name}`}
                    disabled={!localGlobalEnabled ||
                      !localShortcutsOverallEnabled ||
                      !localModuleStates[module.id]}
                  />
                </div>
              </div>
            {/each}
          {:else if !localGlobalEnabled}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Habilite a extensão para
              configurar atalhos.
            </p>
          {:else if !localShortcutsOverallEnabled}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Habilite "Todos os Atalhos"
              para configurar individualmente.
            </p>
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
            ariaLabel="Ativar ou desativar globalmente todas as funcionalidades de Inteligência Artificial"
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
                    modelOptions[localAiProviderConfig.provider]?.[0] || ""; // Reset model
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
                disabled={!modelOptions[localAiProviderConfig.provider]?.length}
              >
                {#if localAiProviderConfig.provider && modelOptions[localAiProviderConfig.provider]}
                  {#each modelOptions[localAiProviderConfig.provider] as modelName (modelName)}
                    <option value={modelName}>{modelName}</option>
                  {/each}
                {:else}
                  <option value="" disabled selected
                    >Selecione um provedor primeiro</option
                  >
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
                : "IA"})
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
                    localModuleStates = {
                      ...localModuleStates,
                      [module.id]: val,
                    };
                    markChanged();
                  }}
                  disabled={!localGlobalEnabled || !localAiFeaturesEnabled}
                  ariaLabel={`Ativar ou desativar ${module.name}`}
                />
              </div>
            {:else}
              <p class="placeholder-text">
                <Info size={16} class="placeholder-icon" /> Nenhuma funcionalidade
                de IA configurada.
              </p>
            {/each}
          {:else if !localGlobalEnabled}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Habilite a extensão para
              usar IA.
            </p>
          {:else}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Habilite "Todas as Funções
              de IA" para configurar.
            </p>
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
              <Info size={16} class="placeholder-icon" /> Prompts disponíveis quando
              a extensão e as funções de IA estiverem habilitadas.
            </p>
          {:else}
            <div class="input-group">
              <label for="summaryPrompt">Prompt de Resumo</label>
              <textarea
                id="summaryPrompt"
                class="textarea-field"
                rows="3"
                placeholder="Ex: Resuma esta conversa de forma concisa, destacando o problema principal e a resolução."
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
                placeholder="Ex: Revise a seguinte resposta, tornando-a mais clara, empática e profissional..."
                bind:value={localPrompts.improvementPrompt}
                on:input={markChanged}
              ></textarea>
            </div>
          {/if}
        </div>
      </CollapsibleSection>
    {/if}
  </div>

  <div class="actions-footer-fixed">
    <button
      class="button-secondary discard-button"
      on:click={discardChanges}
      disabled={!hasPendingChanges || isLoading}
      title="Descartar alterações não salvas"
    >
      Descartar
    </button>
    <button
      class="apply-button"
      on:click={applyChanges}
      disabled={!hasPendingChanges || isLoading}
      title="Aplicar todas as alterações feitas"
    >
      Aplicar Alterações
    </button>
  </div>

  <div class="app-credits-footer">
    Feito com ❤️ por
    <a
      href="https://github.com/DevDeividMoura"
      target="_blank"
      rel="noopener noreferrer"
    >
      @DevDeividMoura
    </a>
  </div>

  {#if showCredentialsModal}
    <div
      class="modal-overlay"
      role="presentation"
      on:click|self={() => (showCredentialsModal = false)}
      on:keydown={(event) => {
        // Listen for Escape on the overlay itself
        if (event.key === "Escape") {
          showCredentialsModal = false;
        }
      }}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        class="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credentials-modal-title"
        on:click|stopPropagation
      >
        <div class="modal-header">
          <h3 id="credentials-modal-title">
            Credenciais: {localAiProviderConfig.provider
              ? localAiProviderConfig.provider.charAt(0).toUpperCase() +
                localAiProviderConfig.provider.slice(1)
              : "IA"}
          </h3>
          <button
            class="close-button"
            on:click={() => (showCredentialsModal = false)}
            aria-label="Fechar modal de credenciais"
            title="Fechar"><XCircle size={20} /></button
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
                autocomplete="off"
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
                autocomplete="off"
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
                autocomplete="off"
              />
            </div>
          {:else}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Provedor de IA não selecionado
              ou configuração de credenciais indisponível.
            </p>
          {/if}
        </div>
        <div class="modal-footer">
          <button
            class="button-secondary"
            on:click={() => {
              // Revert credentials for the current provider if user cancels
              if (localAiProviderConfig.provider === "openai")
                localAiCredentials.openaiApiKey =
                  initialAiCredentials.openaiApiKey;
              else if (localAiProviderConfig.provider === "gemini")
                localAiCredentials.geminiApiKey =
                  initialAiCredentials.geminiApiKey;
              else if (localAiProviderConfig.provider === "anthropic")
                localAiCredentials.anthropicApiKey =
                  initialAiCredentials.anthropicApiKey;
              showCredentialsModal = false;
              // Check if this revert actually removed the 'pending' status for credentials
              // This is a simplification; a more robust check would compare all credentials.
              if (
                JSON.stringify(localAiCredentials) ===
                JSON.stringify(initialAiCredentials)
              ) {
                // If no other changes, reset hasPendingChanges
                // This logic needs to be more comprehensive to be accurate
              }
            }}>Cancelar</button
          >
          <button
            class="button-primary"
            on:click={() => {
              showCredentialsModal = false; // markChanged() already called by input fields
            }}>OK</button
          >
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- svelte-ignore css-unused-selector -->
<style>
  /* Styles from your provided full version, slightly tidied */
  .omni-max-popup-container-fixed-layout {
    display: flex;
    flex-direction: column;
    width: 380px;
    max-height: 580px;
    overflow: hidden;
    background-color: #f4f6f8; /* Light gray background */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    font-size: 14px;
    color: #333; /* Default text color */
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .popup-header-fixed {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    background: linear-gradient(
      to right,
      #a9276f,
      #d02125,
      #d6621c
    ); /* Main gradient */
    color: white;
    padding: 12px 16px;
  }
  .header-controls {
    /* Novo wrapper */
    display: flex;
    align-items: center;
    gap: 12px; /* Espaço entre o toggle de status e o ícone do GitHub */
  }
  .header-title-group h1 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.2;
  }
  .header-title-group p {
    font-size: 0.75rem;
    opacity: 0.9;
    margin: 2px 0 0;
    line-height: 1.2;
  }
  .header-global-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .global-status-indicator {
    padding: 3px 8px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .global-status-indicator.active {
    background-color: rgba(255, 255, 255, 0.25);
    color: #fff;
  }
  .global-status-indicator.inactive {
    background-color: rgba(0, 0, 0, 0.2);
    color: #f0f0f0;
  }
  .github-link-header {
    color: white; /* Cor do ícone do GitHub */
    display: inline-flex; /* Para alinhar o ícone corretamente */
    align-items: center;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }
  .github-link-header:hover {
    opacity: 1;
  }
  .github-link-header svg {
    /* Ajuste fino se necessário */
    stroke-width: 2px; /* Pode ajustar a espessura do traço do ícone */
  }

  .popup-scrollable-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .popup-scrollable-content::-webkit-scrollbar {
    width: 8px;
  }
  .popup-scrollable-content::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 4px;
  }
  .popup-scrollable-content::-webkit-scrollbar-thumb:hover {
    background-color: #a8a8a8;
  }
  .popup-scrollable-content::-webkit-scrollbar-track {
    background-color: #f1f1f1;
  }

  .loading-text,
  .placeholder-text {
    text-align: center;
    padding: 20px 10px;
    color: #6b7280; /* gray-500 */
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .placeholder-icon {
    color: #9ca3af; /* gray-400 */
  }

  .actions-footer-fixed {
    display: flex;
    justify-content: flex-end; /* Align buttons to the right */
    gap: 8px; /* Space between buttons */
    flex-shrink: 0;
    background-color: #f9fafb; /* Slightly off-white background */
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb; /* border-gray-200 */
  }
  .apply-button,
  .discard-button {
    padding: 8px 16px; /* Adjusted padding */
    color: white;
    border: none;
    border-radius: 0.375rem; /* rounded-md */
    font-weight: 500;
    cursor: pointer;
    font-size: 0.875rem; /* text-sm */
    transition:
      filter 0.2s ease,
      opacity 0.2s ease;
  }
  .apply-button {
    background-image: linear-gradient(to right, #a9276f, #d02125, #d6621c);
    background-color: #a9276f; /* Fallback */
  }
  .discard-button {
    background-color: #6b7280; /* gray-500 */
  }

  .apply-button:hover:not(:disabled),
  .discard-button:hover:not(:disabled) {
    filter: brightness(115%);
  }
  .apply-button:disabled,
  .discard-button:disabled {
    background-image: none;
    background-color: #d1d5db; /* gray-300 */
    color: #9ca3af; /* gray-400 */
    cursor: not-allowed;
    opacity: 0.7;
  }

  .section-item-space > *:not(:last-child) {
    margin-bottom: 16px; /* Consistent spacing */
  }
  .module-item-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .module-name-with-tooltip {
    flex-grow: 1;
    margin-right: 8px;
    font-size: 0.9em;
    font-weight: 500;
    cursor: help; /* Indicate tooltip presence */
  }

  .shortcut-definition-item {
    padding-bottom: 12px; /* Slightly less padding */
    border-bottom: 1px dashed #e5e7eb; /* gray-200 */
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
    color: #374151; /* gray-700 */
    cursor: help;
  }
  .shortcut-controls-improved {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .shortcut-prefix {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
      monospace;
    font-size: 0.85em;
    color: #4b5563; /* gray-600 */
    white-space: nowrap;
  }
  .shortcut-key-input-editable {
    width: 40px;
    height: 30px;
    text-align: center;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
      monospace;
    font-size: 0.9em;
    font-weight: bold;
    border: 1px solid #d1d5db; /* gray-300 */
    border-radius: 0.25rem; /* rounded-sm */
    padding: 4px;
    box-sizing: border-box;
  }
  .shortcut-key-input-editable:focus {
    border-color: #a9276f; /* Primary color focus */
    box-shadow: 0 0 0 2px rgba(169, 39, 111, 0.2);
    outline: none;
  }
  .shortcut-key-input-editable:disabled {
    background-color: #f3f4f6; /* gray-100 */
    color: #9ca3af; /* gray-400 */
  }

  .input-group {
    margin-bottom: 12px;
  }
  .input-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151; /* gray-700 */
    margin-bottom: 4px;
  }
  .input-field,
  .select-field,
  .textarea-field {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db; /* gray-300 */
    border-radius: 0.375rem; /* rounded-md */
    font-size: 0.875rem;
    box-sizing: border-box;
    background-color: white;
    color: #1f2937; /* gray-800 */
  }
  .input-field:focus,
  .select-field:focus,
  .textarea-field:focus {
    outline: none;
    border-color: #a9276f; /* Primary color focus */
    box-shadow: 0 0 0 2px rgba(169, 39, 111, 0.2); /* Primary color shadow */
  }
  .textarea-field {
    min-height: 70px;
    resize: vertical;
  }
  .select-field[disabled] {
    background-color: #f3f4f6;
    color: #9ca3af;
  }

  .button-primary,
  .button-secondary {
    padding: 8px 16px;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      box-shadow 0.2s ease,
      filter 0.2s ease;
    border: 1px solid transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.875rem;
  }
  .button-primary {
    background-color: #a9276f; /* Primary color */
    color: white;
  }
  .button-primary:hover:not(:disabled) {
    filter: brightness(110%);
  }
  .button-secondary {
    background-color: #e5e7eb; /* gray-200 */
    color: #374151; /* gray-700 */
  }
  .button-secondary:hover:not(:disabled) {
    background-color: #d1d5db; /* gray-300 */
  }
  .full-width {
    width: 100%;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000; /* Ensure it's above other popup content */
  }
  .modal-content {
    background-color: white;
    padding: 20px;
    border-radius: 0.5rem; /* rounded-lg */
    width: 90%;
    max-width: 340px; /* Consistent with other popup width considerations */
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid #e5e7eb; /* gray-200 */
  }
  .modal-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937; /* gray-800 */
    margin: 0;
  }
  .close-button {
    background: none;
    border: none;
    color: #9ca3af; /* gray-400 */
    cursor: pointer;
    padding: 0; /* Remove default padding */
    line-height: 1; /* Ensure icon is centered */
  }
  .close-button:hover {
    color: #4b5563; /* gray-600 */
  }
  .modal-body > .input-group:not(:last-child) {
    margin-bottom: 16px;
  }
  .modal-footer {
    display: flex;
    gap: 8px;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid #e5e7eb; /* gray-200 */
    justify-content: flex-end;
  }
  .modal-footer button {
    min-width: 80px; /* Give buttons a decent minimum width */
  }

  .sub-separator {
    border: none;
    border-top: 1px dashed #e5e7eb; /* gray-200 */
    margin: 20px 0; /* More vertical space */
  }
  .section-subtitle {
    font-size: 0.95em; /* Slightly larger */
    font-weight: 500;
    color: #374151; /* gray-700 */
    margin-top: 16px;
    margin-bottom: 12px; /* More space below */
  }
  .app-credits-footer {
    padding: 8px 16px; /* Menor que o actions-footer */
    text-align: center;
    font-size: 0.75em; /* Pequeno */
    color: #7f8c8d; /* Cinza sutil */
    background-color: #f4f6f8; /* Mesma cor de fundo do popup principal */
    border-top: 1px solid #e0e0e0; /* Uma linha sutil de separação se o actions-footer-fixed não tiver borda inferior */
    flex-shrink: 0; /* Para não encolher */
    /* Se actions-footer-fixed já tiver border-top, talvez não precise aqui,
     ou ajuste o padding-top do actions-footer-fixed para 0 e coloque a borda aqui.
     Se actions-footer-fixed for sticky, este footer ficará abaixo dele. */
  }
  .app-credits-footer a {
    color: #a9276f; /* Usando uma das cores do seu tema */
    text-decoration: none;
    font-weight: 500;
  }
  .app-credits-footer a:hover {
    text-decoration: underline;
  }
</style>
