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
  import { _ } from "svelte-i18n";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import CollapsibleSection from "./CollapsibleSection.svelte";
  import ToggleSwitch from "./ToggleSwitch.svelte";
  import {
    Keyboard,
    Cpu,
    FileText,
    ListChecks,
    XCircle,
    Info,
  } from "lucide-svelte";

  import {
    PROVIDER_METADATA_LIST,
    PROVIDER_METADATA_MAP,
    type ProviderMetadata,
  } from "../ai/providerMetadata";

  import { AIServiceManager } from "../ai/AIServiceManager";

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

  import {
    defaultStorageAdapter,
    type IStorageAdapter,
  } from "../storage/IStorageAdapter";

  import { availableModules, type Module } from "../modules";
  import GithubMarkIcon from "./icons/GithubMarkIcon.svelte";

  // --- UI Control States ---
  let isLoading: boolean = true;
  let hasPendingChanges: boolean = false;
  let showCredentialsModal: boolean = false;

  // --- Local Copies of Stored Settings ---
  let localGlobalEnabled: boolean = get(globalExtensionEnabledStore);
  let localModuleStates: Record<string, boolean> = JSON.parse(
    JSON.stringify(get(moduleStatesStore)),
  );
  let localShortcutsOverallEnabled: boolean = get(shortcutsOverallEnabledStore);
  let localAiFeaturesEnabled: boolean = get(aiFeaturesEnabledStore);
  let localAiCredentials: AiCredentials = JSON.parse(
    JSON.stringify(get(aiCredentialsStore)),
  );
  let localAiProviderConfig: AiProviderConfig = JSON.parse(
    JSON.stringify(get(aiProviderConfigStore)),
  );
  let localPrompts: PromptsConfig = JSON.parse(
    JSON.stringify(get(promptsStore)),
  );
  let localOpenSections: CollapsibleSectionsState = JSON.parse(
    JSON.stringify(get(collapsibleSectionsStateStore)),
  );
  let localShortcutKeys: ShortcutKeysConfig = JSON.parse(
    JSON.stringify(get(shortcutKeysStore)),
  );

  let modelList: string[] = [];
  let loadingModels = false;
  let modelError: string | null = null;

  let initialGlobalEnabled: boolean;
  let initialModuleStates: Record<string, boolean>;
  let initialShortcutsOverallEnabled: boolean;
  let initialAiFeaturesEnabled: boolean;
  let initialAiCredentials: AiCredentials;
  let initialAiProviderConfig: AiProviderConfig;
  let initialPrompts: PromptsConfig;
  let initialOpenSections: CollapsibleSectionsState;
  let initialShortcutKeys: ShortcutKeysConfig;

  const generalModules: Module[] = availableModules.filter(
    (m) =>
      ["layoutCorrection", "templateProcessor"].includes(m.id) &&
      m.released !== false,
  );
  const shortcutModules: Module[] = availableModules.filter(
    (m) =>
      [
        "shortcutCopyName",
        "shortcutCopyDocumentNumber",
        "shortcutServiceOrderTemplate",
      ].includes(m.id) && m.released !== false,
  );
  const aiModules: Module[] = availableModules.filter(
    (m) =>
      ["aiChatSummary", "aiResponseReview"].includes(m.id) &&
      m.released !== false,
  );
  let promotableAiModules: Module[];
  $: promotableAiModules = aiModules.filter(
    (m) => m.promptSettings && m.released !== false,
  );

  const aiManager = new AIServiceManager();

  /**
   * Fetches the list of available AI models from the selected provider.
   * Updates modelList, loadingModels, and modelError states.
   * This function relies on AIServiceManager to throw an error if essential
   * credentials for the selected provider are missing.
   */
  async function refreshModelList() {
    // Ensure AIServiceManager uses the most current UI selections by temporarily updating stores.

    modelError = null;
    let newModelList: string[] = [];
    loadingModels = true;

    const previouslySelectedModel = localAiProviderConfig.model;

    try {
      await aiProviderConfigStore.set(localAiProviderConfig);
      await aiCredentialsStore.set(localAiCredentials);

      console.log(
        "refreshModelList: Fetching models with creds:",
        JSON.stringify(localAiCredentials),
        "and provider config:",
        JSON.stringify(localAiProviderConfig),
      );
      newModelList = await aiManager.listModels();
      // Successfully fetched models (or an empty list if provider has none)
      modelList = newModelList; // Update the main model list with the new list

      if (modelList.length === 0) {
        // No error thrown, but list is empty (e.g. Ollama has no models installed)
        modelError =
          "Nenhum modelo encontrado para este provedor. Verifique a URL (Ollama) ou se há modelos disponíveis.";
        if (previouslySelectedModel) {
          localAiProviderConfig.model = ""; // Clear model if list is genuinely empty
          markChanged();
          console.log(
            "refreshModelList: Successfully fetched an empty model list. Cleared selected model.",
          );
        }
      } else {
        // Models were successfully fetched and list is not empty
        if (
          previouslySelectedModel &&
          !modelList.includes(previouslySelectedModel)
        ) {
          localAiProviderConfig.model = ""; // Old model not in new list, clear it
          markChanged();
          console.log(
            "refreshModelList: Previously selected model not in new list. Cleared selected model.",
          );
        }
        // If previouslySelectedModel IS in modelList, it remains selected, no action needed.
        // If no model was previously selected, user will pick one, no action needed here.
      }
    } catch (err: any) {
      modelError =
        err.message ||
        "Falha ao carregar modelos. Verifique as credenciais e o acesso ao provedor.";
      modelList = []; // Ensure list is empty on any error from aiManager
      console.error(
        "refreshModelList: Error caught from aiManager:",
        modelError,
      );
      // DO NOT CLEAR localAiProviderConfig.model here if the error might be transient (e.g. "Missing credentials" due to timing).
      // The UI will show the error, the select will be empty/disabled.
      // If the selected model was valid before this transient error, it should remain selected in the config.
      // When the error is resolved (e.g. on next interaction), a successful refreshModelList will validate it.
    } finally {
      loadingModels = false;
    }
  }

  onMount(() => {
    const unsubs: (() => void)[] = [];

    // Subscreve para atualizar as variáveis locais `local*`
    // E marca `hasPendingChanges` APÓS o carregamento inicial
    // O valor inicial síncrono já foi pego acima. As subscrições irão pegar
    // os valores atualizados do storage quando o persistentStore os carregar.
    unsubs.push(
      globalExtensionEnabledStore.subscribe((v) => {
        localGlobalEnabled = v;
        if (!isLoading) markChanged();
      }),
    );
    unsubs.push(
      moduleStatesStore.subscribe((v) => {
        localModuleStates = JSON.parse(JSON.stringify(v));
        if (!isLoading) markChanged();
      }),
    );
    unsubs.push(
      shortcutsOverallEnabledStore.subscribe((v) => {
        localShortcutsOverallEnabled = v;
        if (!isLoading) markChanged();
      }),
    );
    unsubs.push(
      aiFeaturesEnabledStore.subscribe((v) => {
        const prevAiFeaturesEnabled = localAiFeaturesEnabled;
        localAiFeaturesEnabled = v;
        if (!isLoading) {
          markChanged();
          if (prevAiFeaturesEnabled !== localAiFeaturesEnabled) {
            if (localAiFeaturesEnabled && localGlobalEnabled) {
              refreshModelList();
            } else {
              modelList = [];
              modelError = localGlobalEnabled
                ? "Recursos de IA desabilitados."
                : "Extensão desabilitada.";
              if (localAiProviderConfig.model) localAiProviderConfig.model = "";
            }
          }
        }
      }),
    );
    unsubs.push(
      aiCredentialsStore.subscribe((v) => {
        localAiCredentials = JSON.parse(JSON.stringify(v));
        if (!isLoading) markChanged();
      }),
    );
    unsubs.push(
      aiProviderConfigStore.subscribe((v) => {
        localAiProviderConfig = JSON.parse(JSON.stringify(v));
        if (!isLoading) markChanged();
      }),
    );
    unsubs.push(
      promptsStore.subscribe((v) => {
        localPrompts = JSON.parse(JSON.stringify(v));
        if (!isLoading) markChanged();
      }),
    );
    unsubs.push(
      collapsibleSectionsStateStore.subscribe((v) => {
        localOpenSections = JSON.parse(JSON.stringify(v));
        if (!isLoading) markChanged();
      }),
    );
    unsubs.push(
      shortcutKeysStore.subscribe((v) => {
        localShortcutKeys = JSON.parse(JSON.stringify(v));
        if (!isLoading) markChanged();
      }),
    );

    // Espera um tempo para as stores carregarem do chrome.storage
    setTimeout(() => {
      // Captura os valores locais (que foram atualizados pelas stores com os dados do storage, ou mantiveram os defaults)
      // como os valores iniciais para o "Descartar".
      initialGlobalEnabled = localGlobalEnabled;
      initialModuleStates = JSON.parse(JSON.stringify(localModuleStates));
      initialShortcutsOverallEnabled = localShortcutsOverallEnabled;
      initialAiFeaturesEnabled = localAiFeaturesEnabled;
      initialAiCredentials = JSON.parse(JSON.stringify(localAiCredentials));
      initialAiProviderConfig = JSON.parse(
        JSON.stringify(localAiProviderConfig),
      );
      initialPrompts = JSON.parse(JSON.stringify(localPrompts));
      initialOpenSections = JSON.parse(JSON.stringify(localOpenSections));
      initialShortcutKeys = JSON.parse(JSON.stringify(localShortcutKeys));

      isLoading = false;
      hasPendingChanges = false;

      console.log("OmniMaxPopup: Initial states captured.", {
        initialAiCredentials: { ...initialAiCredentials },
      });

      if (localGlobalEnabled && localAiFeaturesEnabled) {
        refreshModelList();
      } else if (!localGlobalEnabled || !localAiFeaturesEnabled) {
        modelList = [];
        modelError = localGlobalEnabled
          ? "Recursos de IA desabilitados."
          : "Extensão desabilitada.";
      }
    }, 350);

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  });

  function markChanged(): void {
    if (!isLoading) {
      hasPendingChanges = true;
    }
  }

  function toggleSectionCollapse(
    sectionKeyToToggle: keyof CollapsibleSectionsState,
  ): void {
    if (localOpenSections) {
      const isCurrentlyOpen = localOpenSections[sectionKeyToToggle];
      const newOpenState: CollapsibleSectionsState = {
        modules: false,
        shortcuts: false,
        ai: false,
        prompts: false,
      };
      if (!isCurrentlyOpen) {
        newOpenState[sectionKeyToToggle] = true;
      }
      localOpenSections = newOpenState;
      markChanged();
    }
  }

  function handleShortcutKeyChange(moduleId: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value.toUpperCase();
    if (value.length > 1) value = value.charAt(value.length - 1);
    if (value === "" || /^[A-Z0-9]$/.test(value)) {
      localShortcutKeys = { ...localShortcutKeys, [moduleId]: value };
      markChanged();
    } else {
      inputElement.value = localShortcutKeys[moduleId] || "";
    }
  }

  async function applyChanges(): Promise<void> {
    if (isLoading) return;

    // Validação da configuração da IA
    if (localAiFeaturesEnabled && localGlobalEnabled) {
      const isStateMessage =
        modelError === "Recursos de IA desabilitados." ||
        modelError === "Extensão desabilitada.";

      // Verifica se modelError é uma string (não nulo) e não é uma mensagem de estado informativa.
      if (typeof modelError === "string" && !isStateMessage) {
        // Agora modelError é definitivamente uma string de erro de configuração
        if (modelList.length === 0) {
          // E impediu o carregamento de modelos
          alert(
            `Erro na configuração de IA: ${modelError}. Por favor, corrija antes de salvar.`,
          );
          // Checagem segura de toLowerCase após confirmar que modelError é uma string
          if (
            modelError.toLowerCase().includes("credenciais") ||
            modelError.toLowerCase().includes("chave")
          ) {
            showCredentialsModal = true;
          }
          return; // Impede o salvamento
        }
      }

      // Se não há erro impeditivo (ou o erro é apenas de estado),
      // mas nenhum modelo foi selecionado
      if (!localAiProviderConfig.model) {
        alert(
          "Configuração de IA incompleta: Por favor, selecione um modelo de IA.",
        );
        const modelSelect = document.getElementById(
          "aiModel",
        ) as HTMLSelectElement | null;
        if (modelSelect) modelSelect.focus();
        return; // Impede o salvamento
      }
    }

    const adapter: IStorageAdapter = defaultStorageAdapter;
    await Promise.all([
      adapter.set("omniMaxGlobalEnabled", localGlobalEnabled),
      adapter.set("omniMaxModuleStates", { ...localModuleStates }),
      adapter.set(
        "omniMaxShortcutsOverallEnabled",
        localShortcutsOverallEnabled,
      ),
      adapter.set("omniMaxShortcutKeys", { ...localShortcutKeys }),
      adapter.set("omniMaxAiFeaturesEnabled", localAiFeaturesEnabled),
      adapter.set("omniMaxAiCredentials", { ...localAiCredentials }),
      adapter.set("omniMaxAiProviderConfig", { ...localAiProviderConfig }), // Save the potentially updated model
      adapter.set("omniMaxPrompts", { ...localPrompts }),
      adapter.set("omniMaxCollapsibleSectionsState", { ...localOpenSections }),
    ]);

    initialGlobalEnabled = localGlobalEnabled;
    initialModuleStates = JSON.parse(JSON.stringify(localModuleStates));
    initialShortcutsOverallEnabled = localShortcutsOverallEnabled;
    initialAiFeaturesEnabled = localAiFeaturesEnabled;
    initialAiCredentials = JSON.parse(JSON.stringify(localAiCredentials));
    initialAiProviderConfig = JSON.parse(JSON.stringify(localAiProviderConfig));
    initialPrompts = JSON.parse(JSON.stringify(localPrompts));
    initialOpenSections = JSON.parse(JSON.stringify(localOpenSections));
    initialShortcutKeys = JSON.parse(JSON.stringify(localShortcutKeys));

    hasPendingChanges = false;
    alert("Configurações aplicadas com sucesso!");

    window.close();
  }

  function discardChanges(): void {
    if (isLoading) return;
    localGlobalEnabled = initialGlobalEnabled;
    localModuleStates = JSON.parse(JSON.stringify(initialModuleStates));
    localShortcutsOverallEnabled = initialShortcutsOverallEnabled;
    localAiFeaturesEnabled = initialAiFeaturesEnabled;
    localAiCredentials = JSON.parse(JSON.stringify(initialAiCredentials));
    localAiProviderConfig = JSON.parse(JSON.stringify(initialAiProviderConfig));
    localPrompts = JSON.parse(JSON.stringify(initialPrompts));
    localOpenSections = JSON.parse(JSON.stringify(initialOpenSections));
    localShortcutKeys = JSON.parse(JSON.stringify(initialShortcutKeys));

    console.log("OmniMaxPopup: Changes discarded. Restored AI creds:", {
      ...localAiCredentials,
    });

    hasPendingChanges = false;
    // After discarding, refresh model list to match the reverted settings
    if (localAiFeaturesEnabled && localGlobalEnabled) {
      refreshModelList();
    } else {
      modelList = [];
      modelError = null;
    }
  }

  // Variável reativa para os metadados do provedor selecionado
  let selectedProviderMetadata: ProviderMetadata | undefined;
  $: selectedProviderMetadata = PROVIDER_METADATA_MAP.get(
    localAiProviderConfig.provider,
  );

  // Ajuste no on:change do select de provedor para usar o defaultModel do metadado, se houver
  function handleProviderChange() {
    markChanged();
    const currentMeta = PROVIDER_METADATA_MAP.get(
      localAiProviderConfig.provider,
    );
    localAiProviderConfig.model = currentMeta?.defaultModel || ""; // Usa defaultModel do metadado ou vazio
    refreshModelList();
  }

  // No botão "Cancelar" do modal de credenciais:
  function handleCancelCredentialsModal() {
    if (selectedProviderMetadata && initialAiCredentials) {
      // Reverte apenas as credenciais relevantes para o provedor atual
      if (selectedProviderMetadata.apiKeySettings?.credentialKey) {
        const key = selectedProviderMetadata.apiKeySettings.credentialKey;
        (localAiCredentials as any)[key] = initialAiCredentials[key];
      }
      if (selectedProviderMetadata.baseUrlSettings?.credentialKey) {
        const key = selectedProviderMetadata.baseUrlSettings.credentialKey;
        (localAiCredentials as any)[key] = initialAiCredentials[key];
      }
      // Força a reatividade do objeto se necessário, ou se estiver usando $state,
      // Svelte 5 deve lidar com isso. Para Svelte < 5:
      localAiCredentials = { ...localAiCredentials };
    }
    showCredentialsModal = false;
    // A lógica para verificar hasPendingChanges ao cancelar pode ser complexa,
    // é mais simples deixar o usuário clicar em "Descartar" principal se quiser reverter tudo.
  }
</script>

<div class="omni-max-popup-container-fixed-layout">
  <div class="popup-header-fixed">
    <div class="header-title-group">
      <h1>{$_('popup.header.title')}</h1>
      <p>{$_("popup.header.subtitle")}</p>
    </div>
    <div class="header-controls">
      <div class="header-global-toggle">
        <ToggleSwitch
          label=""
          enabled={localGlobalEnabled}
          onChange={(val) => {
            localGlobalEnabled = val;
            markChanged();
            if (val && localAiFeaturesEnabled)
              refreshModelList(); // Refresh if enabling
            else if (!val) {
              modelList = [];
              modelError = "Extension is disabled.";
            }
          }}
          ariaLabel="Habilitar ou desabilitar toda a extensão Omni Max"
        />
        <span
          class="global-status-indicator {localGlobalEnabled
            ? 'active'
            : 'inactive'}"
        >
          {localGlobalEnabled ? $_('popup.header.active') : $_('popup.header.inactive')}
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
        title={$_('popup.modules.general_section_title')}
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
              // Refresh model list or clear it based on the new state
              if (val && localGlobalEnabled) {
                refreshModelList();
              } else {
                modelList = [];
                modelError = "AI features are disabled.";
                localAiProviderConfig.model = ""; // Clear selected model
              }
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
                on:change={handleProviderChange}
              >
                {#each PROVIDER_METADATA_LIST as providerMeta (providerMeta.id)}
                  <option value={providerMeta.id}
                    >{providerMeta.displayName}</option
                  >
                {/each}
              </select>
            </div>

            <div class="input-group">
              <label for="aiModel">Modelo</label>
              <select
                id="aiModel"
                class="select-field"
                bind:value={localAiProviderConfig.model}
                on:change={() => markChanged()}
                disabled={loadingModels ||
                  (modelList.length === 0 && !modelError && !loadingModels) ||
                  !!modelError}
              >
                {#if loadingModels}
                  <option value="" disabled selected>Carregando modelos…</option
                  >
                {:else if modelError}
                  <option value="" disabled selected
                    >{modelError.length > 40
                      ? modelError.substring(0, 37) + "..."
                      : modelError}</option
                  >
                {:else if modelList.length === 0}
                  <option value="" disabled selected
                    >Nenhum modelo (verifique credenciais)</option
                  >
                {:else}
                  <option
                    value=""
                    selected={!localAiProviderConfig.model ||
                      !modelList.includes(localAiProviderConfig.model)}
                    disabled>Selecione um modelo</option
                  >
                  {#each modelList as m (m)}
                    <option
                      value={m}
                      selected={m === localAiProviderConfig.model}>{m}</option
                    >
                  {/each}
                {/if}
              </select>
              {#if modelError && !loadingModels}
                <p
                  class="popup-error-text"
                  style="font-size: 0.8em; color: var(--color-error, red); margin-top: 4px;"
                >
                  {modelError}
                </p>
              {:else if !loadingModels && modelList.length === 0 && !modelError}
                <p
                  class="popup-info-text"
                  style="font-size: 0.8em; color: var(--color-text-secondary, #555); margin-top: 4px;"
                >
                  Para listar modelos, adicione as credenciais no modal abaixo e
                  salve.
                </p>
              {/if}
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
          {:else if promotableAiModules.length > 0}
            {#each promotableAiModules as module (module.id)}
              {@const promptKey = module.promptSettings!.configKey}
              {@const promptLabel = module.promptSettings!.label}
              {@const promptPlaceholder = module.promptSettings!.placeholder}
              <div class="input-group">
                <label for={promptKey}>{promptLabel}</label>
                <textarea
                  id={promptKey}
                  class="textarea-field"
                  rows="3"
                  placeholder={promptPlaceholder}
                  bind:value={localPrompts[promptKey]}
                  on:input={markChanged}
                ></textarea>
              </div>
            {/each}
          {:else}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Nenhuma configuração de
              prompt disponível para as funcionalidades de IA ativas.
            </p>
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
    {$_('popup.footer.made_with_love')}
    <a
      href="https://github.com/DevDeividMoura"
      target="_blank"
      rel="noopener noreferrer"
    >
      @DevDeividMoura
    </a>
  </div>

  {#if showCredentialsModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="credentials-modal-title">
            Credenciais: {selectedProviderMetadata?.displayName ||
              localAiProviderConfig.provider}
          </h3>
        </div>
        <div class="modal-body">
          {#if selectedProviderMetadata}
            {#if selectedProviderMetadata.apiKeySettings}
              {@const settings = selectedProviderMetadata.apiKeySettings}
              <div class="input-group">
                <label for={settings.credentialKey}>{settings.label}</label>
                <input
                  type={settings.inputType || "password"}
                  id={settings.credentialKey}
                  class="input-field"
                  bind:value={localAiCredentials[settings.credentialKey]}
                  on:input={() => markChanged()}
                  placeholder={settings.placeholder || ""}
                  autocomplete="new-password"
                />
              </div>
            {/if}
            {#if selectedProviderMetadata.baseUrlSettings}
              {@const settings = selectedProviderMetadata.baseUrlSettings}
              <div class="input-group">
                <label for={settings.credentialKey}>{settings.label}</label>
                <input
                  type={settings.inputType || "text"}
                  id={settings.credentialKey}
                  class="input-field"
                  bind:value={localAiCredentials[settings.credentialKey]}
                  on:input={() => markChanged()}
                  placeholder={settings.placeholder || ""}
                  autocomplete="off"
                />
              </div>
            {/if}
            {#if selectedProviderMetadata.documentationLink}
              <p style="font-size:0.8em; margin-top: 12px; text-align: center;">
                <a
                  href={selectedProviderMetadata.documentationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: var(--color-primary, #a9276f);"
                >
                  Como obter {selectedProviderMetadata.apiKeySettings?.label ||
                    selectedProviderMetadata.baseUrlSettings?.label}?
                </a>
              </p>
            {/if}
            {#if selectedProviderMetadata.credentialType === "none"}
              <p class="placeholder-text">
                Este provedor não requer credenciais adicionais.
              </p>
            {/if}
          {:else}
            <p class="placeholder-text">
              <Info size={16} class="placeholder-icon" /> Selecione um provedor de
              IA válido.
            </p>
          {/if}
        </div>
        <div class="modal-footer">
          <button
            class="button-secondary"
            on:click={handleCancelCredentialsModal}
          >
            Cancelar
          </button>
          <button
            class="button-primary"
            on:click={() => {
              showCredentialsModal = false;
              markChanged();
              refreshModelList();
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
    max-height: 580px; /* Or your preferred max height */
    min-height: 400px; /* Ensure it doesn't collapse too much */
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
    display: flex;
    align-items: center;
    gap: 12px;
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
    color: white;
    display: inline-flex;
    align-items: center;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }
  .github-link-header:hover {
    opacity: 1;
  }

  .github-link-header svg {
    stroke-width: 2px;
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
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
    background-color: #f9fafb;
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
  }
  .apply-button,
  .discard-button {
    padding: 8px 16px;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    font-size: 0.875rem;
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
    margin-right: 8px;
    font-size: 0.9em;
    font-weight: 500;
    cursor: help;
  }

  .shortcut-definition-item {
    padding-bottom: 12px;
    border-bottom: 1px dashed #e5e7eb;
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
    color: #374151;
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
    color: #4b5563;
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
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    padding: 4px;
    box-sizing: border-box;
  }
  .shortcut-key-input-editable:focus {
    border-color: #a9276f;
    box-shadow: 0 0 0 2px rgba(169, 39, 111, 0.2);
    outline: none;
  }
  .shortcut-key-input-editable:disabled {
    background-color: #f3f4f6;
    color: #9ca3af;
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
    color: #1f2937;
  }
  .input-field:focus,
  .select-field:focus,
  .textarea-field:focus {
    outline: none;
    border-color: #a9276f;
    box-shadow: 0 0 0 2px rgba(169, 39, 111, 0.2);
  }
  .textarea-field {
    min-height: 70px;
    resize: vertical;
  }
  .select-field[disabled] {
    /* More specific selector for disabled select */
    background-color: #f3f4f6 !important; /* Ensure override */
    color: #9ca3af !important;
    cursor: not-allowed;
  }
  .select-field option[disabled] {
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
    background-color: #a9276f;
    color: white;
  }
  .button-primary:hover:not(:disabled) {
    filter: brightness(110%);
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

  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
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
    border-bottom: 1px solid #e5e7eb;
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
    line-height: 1;
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
    border-top: 1px solid #e5e7eb;
    justify-content: flex-end;
  }
  .modal-footer button {
    min-width: 80px;
  }

  .sub-separator {
    border: none;
    border-top: 1px dashed #e5e7eb;
    margin: 20px 0;
  }
  .section-subtitle {
    font-size: 0.95em;
    font-weight: 500;
    color: #374151;
    margin-top: 16px;
    margin-bottom: 12px;
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

  .popup-error-text {
    font-size: 0.8em;
    color: red; /* Ensure high visibility for errors */
    margin-top: 4px;
  }
  .popup-info-text {
    font-size: 0.8em;
    color: #555; /* A neutral, informative color */
    margin-top: 4px;
  }
</style>
