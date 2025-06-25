<script context="module" lang="ts">
  import type { Readable } from "svelte/store";

  export type SettingsContextType = {
    personasStore: Writable<Persona[]>;
    // Funções (Handlers)
    markChanged: () => void;
    toggleSectionCollapse: (key: keyof CollapsibleSectionsState) => void;
    refreshModelList: () => Promise<void>;
    addNewPersona: () => void;
    editPersona: (persona: Persona) => void;
    deletePersona: (personaId: string) => void;
    handleAddDocument: () => Promise<void>;
    addNewDocument: () => void;
    handleDeleteDocument: (docId: number) => Promise<void>;
    handleProviderChange: () => void;
    handleShortcutKeyChange: (moduleId: string, event: Event) => void;

    // Stores Reativas
    localGlobalEnabledStore: Writable<boolean>;
    localModuleStatesStore: Writable<Record<string, boolean>>;
    localShortcutsOverallEnabledStore: Writable<boolean>;
    localAiFeaturesEnabledStore: Writable<boolean>;
    localAiCredentialsStore: Writable<AiCredentials>;
    localAiProviderConfigStore: Writable<AiProviderConfig>;
    localOpenSectionsStore: Writable<CollapsibleSectionsState>;
    localShortcutKeysStore: Writable<ShortcutKeysConfig>;
    personaDraftStore: Writable<Omit<Persona, "id"> & { id: string | null }>;

    knowledgeBaseDocuments: Writable<any[]>;
    newDocumentContent: Writable<string>;
    newDocumentSource: Writable<string>;
    chatModelList: Writable<string[]>;
    embeddingModelList: Writable<string[]>;
    isAiConfigValid: Readable<boolean>;
    loadingModels: Writable<boolean>;
    modelError: Writable<string | null>;

    // Dados Estáticos (não mudam após a inicialização)
    generalModules: Module[];
    shortcutModules: Module[];
    aiModules: Module[];
    PROVIDER_METADATA_LIST: ProviderMetadata[];
    AGENT_TOOLS_METADATA: any[];
    selectedProviderMetadata: ProviderMetadata | undefined;
    showCredentialsModal: Writable<boolean>;
    showKnowledgeBaseModal: Writable<boolean>;
  };
</script>

<script lang="ts">
  /**
   * SettingsSidepanel.svelte (Fully Reactive Refactor)
   *
   * This component acts as the main shell for the extension's settings UI.
   * All shared local state is now managed via Svelte stores to ensure
   * reactivity across child components through context.
   *
   * @component
   */
  import { _ } from "svelte-i18n";
  import { onMount, onDestroy, setContext } from "svelte";
  import { get, writable, derived } from "svelte/store";
  import type { Writable } from "svelte/store";

  import ToggleSwitch from "../shared/components/ToggleSwitch.svelte";
  import GeneralSettings from "./components/GeneralSettings.svelte";
  import ShortcutSettings from "./components/ShortcutSettings.svelte";
  import AiSettings from "./components/AiSettings.svelte";
  import PersonaSettings from "./components/PersonaSettings.svelte";
  import KnowledgeBase from "./components/KnowledgeBase.svelte";

  import KnowledgeBaseModal from "./components/modals/KnowledgeBaseModal.svelte";
  import CredentialsModal from "./components/modals/CredentialsModal.svelte";
  import PersonaModal from "./components/modals/PersonaModal.svelte";
  import GithubMarkIcon from "../shared/components/icons/GithubMarkIcon.svelte";
  import extensionIcon from "../assets/icons/icon-48.png";

  import {
    PROVIDER_METADATA_LIST,
    PROVIDER_METADATA_MAP,
    type ProviderMetadata,
  } from "../shared/providerMetadata";
  import { AGENT_TOOLS_METADATA } from "../background/agent/tools/toolMetadata";
  import {
    globalExtensionEnabledStore,
    moduleStatesStore,
    shortcutsOverallEnabledStore,
    aiFeaturesEnabledStore,
    aiCredentialsStore,
    type AiCredentials,
    aiProviderConfigStore,
    type AiProviderConfig,
    collapsibleSectionsStateStore,
    type CollapsibleSectionsState,
    shortcutKeysStore,
    type ShortcutKeysConfig,
    personasStore,
    type Persona,
  } from "../storage";
  import { availableModules, type Module } from "../modules";

  // --- UI Control Stores ---
  const isLoading = writable(true);
  const hasPendingChanges = writable(false);
  const showCredentialsModal = writable(false);
  const showPersonaModal = writable(false);
  const showKnowledgeBaseModal = writable(false);

  // --- All Local State as Svelte Stores for Reactivity ---
  const localGlobalEnabledStore = writable<boolean>(
    get(globalExtensionEnabledStore),
  );
  const localModuleStatesStore = writable<Record<string, boolean>>(
    JSON.parse(JSON.stringify(get(moduleStatesStore))),
  );
  const localShortcutsOverallEnabledStore = writable<boolean>(
    get(shortcutsOverallEnabledStore),
  );
  const localAiFeaturesEnabledStore = writable<boolean>(
    get(aiFeaturesEnabledStore),
  );
  const localAiCredentialsStore = writable<AiCredentials>(
    JSON.parse(JSON.stringify(get(aiCredentialsStore))),
  );
  const localAiProviderConfigStore = writable<AiProviderConfig>(
    JSON.parse(JSON.stringify(get(aiProviderConfigStore))),
  );
  const localOpenSectionsStore = writable<CollapsibleSectionsState>(
    JSON.parse(JSON.stringify(get(collapsibleSectionsStateStore))),
  );
  const localShortcutKeysStore = writable<ShortcutKeysConfig>(
    JSON.parse(JSON.stringify(get(shortcutKeysStore))),
  );
  const personaDraftStore = writable<
    Omit<Persona, "id"> & { id: string | null }
  >({
    id: null,
    name: "",
    description: "",
    prompt: "",
    tool_names: [],
  });

  // --- Component-Specific State Stores ---
  const knowledgeBaseDocuments = writable<any[]>([]);
  const newDocumentContent = writable("");
  const newDocumentSource = writable("");
  const chatModelList = writable<string[]>([]);
  const embeddingModelList = writable<string[]>([]);
  const loadingModels = writable(false);
  const modelError = writable<string | null>(null);

  // --- Initial State Snapshot for "Discard" ---
  let initialGlobalEnabled: boolean,
    initialModuleStates: Record<string, boolean>,
    initialShortcutsOverallEnabled: boolean,
    initialAiFeaturesEnabled: boolean,
    initialAiCredentials: AiCredentials,
    initialAiProviderConfig: AiProviderConfig,
    initialOpenSections: CollapsibleSectionsState,
    initialShortcutKeys: ShortcutKeysConfig;

  // --- Derived Data ---
  const releasedModules = availableModules.filter((m) => m.released !== false);
  const generalModules: Module[] = releasedModules.filter(
    (m) => m.category === "general",
  );
  const shortcutModules: Module[] = releasedModules.filter(
    (m) => m.category === "shortcut",
  );
  const aiModules: Module[] = releasedModules.filter(
    (m) => m.category === "ai",
  );

  let headerHeight = 0;
  let headerElement: HTMLDivElement;

  // --- Core Functions (Updated to use Stores) ---

  function markChanged(): void {
    if (!$isLoading) hasPendingChanges.set(true);
  }

  // Em <script lang="ts"> de SettingsSidepanel.svelte

  async function refreshModelList() {
    modelError.set(null);
    loadingModels.set(true);
    chatModelList.set([]);
    embeddingModelList.set([]);

    const providerId = get(localAiProviderConfigStore).provider;
    const credentials = get(localAiCredentialsStore);
    const providerMeta = PROVIDER_METADATA_MAP.get(providerId);

    // Validação prévia na UI (permanece a mesma)
    if (!providerMeta) {
      modelError.set("Invalid provider selected.");
      loadingModels.set(false);
      return;
    }
    const requiredApiKey = providerMeta.apiKeySettings?.credentialKey;
    if (requiredApiKey && !credentials[requiredApiKey]) {
      const errorMsg = $_("sidepanel.errors.ai.api_key_required", {
        values: { providerName: providerMeta.displayName },
      });
      modelError.set(errorMsg);
      loadingModels.set(false);
      return;
    }
    const requiredBaseUrl = providerMeta.baseUrlSettings?.credentialKey;
    if (requiredBaseUrl && !credentials[requiredBaseUrl]) {
      const errorMsg = $_("sidepanel.errors.ai.base_url_required", {
        values: { providerName: providerMeta.displayName },
      });
      modelError.set(errorMsg);
      loadingModels.set(false);
      return;
    }

    try {
      const [chatModelsRes, embeddingModelsRes] = await Promise.all([
        chrome.runtime.sendMessage({
          type: "listAvailableModels",
          provider: providerId,
          credentials,
          modelType: "chat",
        }),
        chrome.runtime.sendMessage({
          type: "listAvailableModels",
          provider: providerId,
          credentials,
          modelType: "embedding",
        }),
      ]);

      if (!chatModelsRes.success || !embeddingModelsRes.success) {
        throw new Error(
          chatModelsRes.error ||
            embeddingModelsRes.error ||
            "Failed to fetch models",
        );
      }

      const fetchedChatModels = chatModelsRes.models;
      const fetchedEmbeddingModels = embeddingModelsRes.models;

      chatModelList.set(fetchedChatModels);
      embeddingModelList.set(fetchedEmbeddingModels);

      if (
        fetchedChatModels.length === 0 &&
        fetchedEmbeddingModels.length === 0
      ) {
        modelError.set($_("sidepanel.errors.ai.no_models_found_provider"));
      }

      // --- LÓGICA DE SELEÇÃO DE MODELO PADRÃO (CORRIGIDA E DINÂMICA) ---

      // 1. Busca os modelos padrão dinamicamente a partir dos metadados do provedor atual.
      const defaultChatModel = providerMeta.defaultModel;
      const defaultEmbeddingModel = providerMeta.defaultEmbeddingModel;

      const currentConfig = get(localAiProviderConfigStore);
      let newModel = currentConfig.model;
      let newEmbeddingModel = currentConfig.embeddingModel;

      // 2. Se nenhum modelo de chat estiver selecionado E o modelo padrão existir na lista, selecione-o.
      if (
        !newModel &&
        defaultChatModel &&
        fetchedChatModels.includes(defaultChatModel)
      ) {
        newModel = defaultChatModel;
      }

      // 3. Se nenhum modelo de embedding estiver selecionado E o modelo padrão existir na lista, selecione-o.
      if (
        !newEmbeddingModel &&
        defaultEmbeddingModel &&
        fetchedEmbeddingModels.includes(defaultEmbeddingModel)
      ) {
        newEmbeddingModel = defaultEmbeddingModel;
      }

      // 4. Atualiza a store de configuração com os novos valores.
      localAiProviderConfigStore.update((cfg) => ({
        ...cfg,
        model: newModel,
        embeddingModel: newEmbeddingModel,
      }));
    } catch (err: any) {
      modelError.set(err.message);
    } finally {
      loadingModels.set(false);
    }
  }

  const isAiConfigValid = derived(
    [localAiFeaturesEnabledStore, localAiProviderConfigStore],
    ([$aiEnabled, $aiConfig]) => {
      // Se a IA não está habilitada, a configuração é sempre válida.
      if (!$aiEnabled) {
        return true;
      }
      // Se a IA está habilitada, todos os campos devem estar preenchidos.
      return !!(
        $aiConfig.provider &&
        $aiConfig.model &&
        $aiConfig.embeddingModel
      );
    },
  );

  function addNewPersona() {
    personaDraftStore.set({
      id: null,
      name: "",
      description: "",
      prompt: "",
      tool_names: [],
    });
    showPersonaModal.set(true);
  }

  function editPersona(persona: Persona) {
    personaDraftStore.set({ ...persona });
    showPersonaModal.set(true);
  }

  function savePersonaFromModal(
    personaToSave: Omit<Persona, "id"> & { id: string | null },
  ) {
    if (!personaToSave.name.trim() || !personaToSave.prompt.trim()) {
      alert($_("sidepanel.personas.validation_error"));
      return;
    }

    if (personaToSave.id) {
      personasStore.update((all) =>
        all.map((p) =>
          p.id === personaToSave.id ? { ...personaToSave, id: p.id } : p,
        ),
      );
    } else {
      const newPersona: Persona = {
        id: crypto.randomUUID(),
        name: personaToSave.name,
        description: personaToSave.description,
        prompt: personaToSave.prompt,
        tool_names: personaToSave.tool_names || [],
      };
      personasStore.update((all) => [...all, newPersona]);
    }

    showPersonaModal.set(false);
    markChanged();
  }

  function deletePersona(personaId: string) {
    const personaToDelete = get(personasStore).find((p) => p.id === personaId);
    if (!personaToDelete) return;

    if (
      window.confirm(
        $_("sidepanel.personas.confirm_delete_message", {
          values: { name: personaToDelete.name },
        }),
      )
    ) {
      personasStore.update((all) => all.filter((p) => p.id !== personaId));
      markChanged();
    }
  }

  async function loadKnowledgeBaseDocuments() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "getKnowledgeBaseDocuments",
      });
      if (response && response.success) {
        knowledgeBaseDocuments.set(response.documents);
      } else {
        console.error(
          "Failed to load documents from knowledge base:",
          response.error,
        );
        knowledgeBaseDocuments.set([]);
      }
    } catch (err) {
      console.error("Error calling loadKnowledgeBaseDocuments:", err);
    }
  }

  function addNewDocument() {
    // Futuramente, podemos resetar um "rascunho de documento" aqui.
    showKnowledgeBaseModal.set(true);
  }

  async function handleAddDocument() {
    if (!$newDocumentContent.trim()) return;
    const doc = {
      pageContent: $newDocumentContent,
      metadata: {
        source:
          $newDocumentSource.trim() ||
          `manual_entry_${new Date().toISOString()}`,
        addedAt: Date.now(),
      },
    };
    const response = await chrome.runtime.sendMessage({
      type: "addDocumentToKnowledgeBase",
      document: doc,
    });
    if (response && response.success) {
      newDocumentContent.set("");
      newDocumentSource.set("");
      await loadKnowledgeBaseDocuments();
    } else {
      alert("Failed to add document: " + (response.error || "Unknown error"));
    }
  }

  async function handleDeleteDocument(documentId: number) {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    const response = await chrome.runtime.sendMessage({
      type: "deleteDocumentFromKnowledgeBase",
      documentId,
    });
    if (response && response.success) {
      await loadKnowledgeBaseDocuments();
    } else {
      alert(
        "Failed to delete document: " + (response.error || "Unknown error"),
      );
    }
  }

  async function handleAddDocumentFromModal(document: {
    pageContent: string;
    metadata: any;
  }) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "addDocumentToKnowledgeBase",
        document,
      });

      if (response && response.success) {
        await loadKnowledgeBaseDocuments(); // Recarrega a lista
      } else {
        alert("Failed to add document: " + (response.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error adding document from modal:", err);
      alert("An unexpected error occurred while adding the document.");
    } finally {
      // CORREÇÃO: Adicione esta linha para fechar o modal após a tentativa de salvar.
      showKnowledgeBaseModal.set(false);
    }
  }

  function toggleSectionCollapse(
    sectionKeyToToggle: keyof CollapsibleSectionsState,
  ): void {
    const isCurrentlyOpen = $localOpenSectionsStore[sectionKeyToToggle];
    const allSectionsClosed: CollapsibleSectionsState = {
      modules: false,
      shortcuts: false,
      ai: false,
      personas: false,
      knowledgeBase: false,
    };
    localOpenSectionsStore.set({
      ...allSectionsClosed,
      [sectionKeyToToggle]: !isCurrentlyOpen,
    });
    markChanged();
  }

  function handleProviderChange() {
    markChanged();
    const currentMeta = PROVIDER_METADATA_MAP.get(
      $localAiProviderConfigStore.provider,
    );
    localAiProviderConfigStore.update((cfg) => ({
      ...cfg,
      model: currentMeta?.defaultModel || "",
    }));
    refreshModelList();
  }

  function handleCancelCredentialsModal() {
    localAiCredentialsStore.set(
      JSON.parse(JSON.stringify(initialAiCredentials)),
    );
    showCredentialsModal.set(false);
  }

  async function applyChanges(): Promise<void> {
    if ($isLoading) return;
    await Promise.all([
      globalExtensionEnabledStore.set($localGlobalEnabledStore),
      moduleStatesStore.set($localModuleStatesStore),
      shortcutsOverallEnabledStore.set($localShortcutsOverallEnabledStore),
      shortcutKeysStore.set($localShortcutKeysStore),
      aiFeaturesEnabledStore.set($localAiFeaturesEnabledStore),
      aiCredentialsStore.set($localAiCredentialsStore),
      aiProviderConfigStore.set($localAiProviderConfigStore),
      collapsibleSectionsStateStore.set($localOpenSectionsStore),
    ]);

    initialGlobalEnabled = $localGlobalEnabledStore;
    initialModuleStates = JSON.parse(JSON.stringify($localModuleStatesStore));
    initialShortcutsOverallEnabled = $localShortcutsOverallEnabledStore;
    initialAiFeaturesEnabled = $localAiFeaturesEnabledStore;
    initialAiCredentials = JSON.parse(JSON.stringify($localAiCredentialsStore));
    initialAiProviderConfig = JSON.parse(
      JSON.stringify($localAiProviderConfigStore),
    );
    initialOpenSections = JSON.parse(JSON.stringify($localOpenSectionsStore));
    initialShortcutKeys = JSON.parse(JSON.stringify($localShortcutKeysStore));

    hasPendingChanges.set(false);
    alert($_("sidepanel.alerts.changes_applied"));
  }

  function discardChanges(): void {
    if ($isLoading) return;
    localGlobalEnabledStore.set(initialGlobalEnabled);
    localModuleStatesStore.set(initialModuleStates);
    localShortcutsOverallEnabledStore.set(initialShortcutsOverallEnabled);
    localAiFeaturesEnabledStore.set(initialAiFeaturesEnabled);
    localAiCredentialsStore.set(initialAiCredentials);
    localAiProviderConfigStore.set(initialAiProviderConfig);
    localOpenSectionsStore.set(initialOpenSections);
    localShortcutKeysStore.set(initialShortcutKeys);

    hasPendingChanges.set(false);
    if ($localAiFeaturesEnabledStore && $localGlobalEnabledStore) {
      refreshModelList();
    } else {
      chatModelList.set([]);
      embeddingModelList.set([]);
      modelError.set(null);
    }
  }

  onMount(() => {
    if (headerElement) {
      headerHeight = headerElement.offsetHeight - 10;
      console.log("Header height set to:", headerHeight);
    }

    // 1. SINCRONIZAR: Define o valor das stores locais com base nas stores persistidas.
    // Isso garante que a UI sempre mostre o estado salvo mais recente.
    setTimeout(() => {
      localGlobalEnabledStore.set(get(globalExtensionEnabledStore));
      localModuleStatesStore.set(
        JSON.parse(JSON.stringify(get(moduleStatesStore))),
      );
      localShortcutsOverallEnabledStore.set(get(shortcutsOverallEnabledStore));
      localAiFeaturesEnabledStore.set(get(aiFeaturesEnabledStore));
      localAiCredentialsStore.set(
        JSON.parse(JSON.stringify(get(aiCredentialsStore))),
      );
      localAiProviderConfigStore.set(
        JSON.parse(JSON.stringify(get(aiProviderConfigStore))),
      );
      localOpenSectionsStore.set(
        JSON.parse(JSON.stringify(get(collapsibleSectionsStateStore))),
      );
      localShortcutKeysStore.set(
        JSON.parse(JSON.stringify(get(shortcutKeysStore))),
      );

      // 2. SNAPSHOT: Guarda o estado inicial para a função "Descartar Alterações".
      initialGlobalEnabled = get(localGlobalEnabledStore);
      initialModuleStates = JSON.parse(
        JSON.stringify(get(localModuleStatesStore)),
      );
      initialShortcutsOverallEnabled = get(localShortcutsOverallEnabledStore);
      initialAiFeaturesEnabled = get(localAiFeaturesEnabledStore);
      initialAiCredentials = JSON.parse(
        JSON.stringify(get(aiCredentialsStore)),
      );
      initialAiProviderConfig = JSON.parse(
        JSON.stringify(get(aiProviderConfigStore)),
      );
      initialOpenSections = JSON.parse(
        JSON.stringify(get(localOpenSectionsStore)),
      );
      initialShortcutKeys = JSON.parse(
        JSON.stringify(get(localShortcutKeysStore)),
      );

      // 3. Lógica de inicialização adicional

      if (get(localGlobalEnabledStore) && get(localAiFeaturesEnabledStore)) {
        refreshModelList();
      } else {
        chatModelList.set([]);
        embeddingModelList.set([]);
        const errorMsg = get(localGlobalEnabledStore)
          ? $_("sidepanel.errors.ai.features_disabled")
          : $_("sidepanel.errors.ai.extension_disabled");
        modelError.set(errorMsg);
      }

      isLoading.set(false);
      hasPendingChanges.set(false);
    }, 50);
    loadKnowledgeBaseDocuments();
  });

  onDestroy(() => {
    // --- LOG DE DEBUG 4: CICLO DE VIDA ---
  });

  // --- Reactive Declarations ---
  let selectedProviderMetadata: ProviderMetadata | undefined;
  $: selectedProviderMetadata = PROVIDER_METADATA_MAP.get(
    $localAiProviderConfigStore.provider,
  );

  // Este bloco reage a mudanças nos toggles e executa a lógica necessária.
  $: {
    if (typeof window !== "undefined" && !$isLoading) {
      // Evita rodar na inicialização
      if ($localAiFeaturesEnabledStore && $localGlobalEnabledStore) {
        refreshModelList();
      } else {
        chatModelList.set([]);
        embeddingModelList.set([]);
        const errorMsg = !$localGlobalEnabledStore
          ? $_("sidepanel.errors.ai.extension_disabled")
          : $_("sidepanel.errors.ai.features_disabled");
        modelError.set(errorMsg);
        localAiProviderConfigStore.update((cfg) => ({ ...cfg, model: "" }));
      }
    }
  }

  // --- Context API Setup ---
  setContext("settings", {
    personasStore,
    showKnowledgeBaseModal,

    markChanged,
    toggleSectionCollapse,
    refreshModelList,
    addNewPersona,
    editPersona,
    deletePersona,
    handleAddDocument,
    addNewDocument,
    handleDeleteDocument,
    handleProviderChange,

    localGlobalEnabledStore,
    localModuleStatesStore,
    localShortcutsOverallEnabledStore,
    localAiFeaturesEnabledStore,
    localAiCredentialsStore,
    localAiProviderConfigStore,
    localOpenSectionsStore,
    localShortcutKeysStore,
    personaDraftStore,

    knowledgeBaseDocuments,
    newDocumentContent,
    newDocumentSource,
    chatModelList,
    embeddingModelList,
    isAiConfigValid,
    loadingModels,
    modelError,

    generalModules,
    shortcutModules,
    aiModules,
    PROVIDER_METADATA_LIST,
    AGENT_TOOLS_METADATA,
    selectedProviderMetadata,
    showCredentialsModal,
  });
</script>

<div class="omni-max-sidepanel-container-fixed-layout">
  <div class="sidepanel-header-fixed" bind:this={headerElement}>
    <div class="header-title-group">
      <img src={extensionIcon} alt="Omni Max Logo" class="header-logo" />
      <div class="header-text-wrapper">
        <h1>{$_("sidepanel.header.title")}</h1>
        <p>{$_("sidepanel.header.subtitle")}</p>
      </div>
    </div>
    <div class="header-controls">
      <div class="header-global-toggle">
        <ToggleSwitch
          bind:enabled={$localGlobalEnabledStore}
          onChange={() => {
            markChanged();
            if ($localGlobalEnabledStore && $localAiFeaturesEnabledStore) {
              refreshModelList();
            } else if (!$localGlobalEnabledStore) {
              chatModelList.set([]);
              embeddingModelList.set([]);
              modelError.set($_("sidepanel.errors.ai.extension_disabled"));
            }
          }}
          ariaLabel={$_("sidepanel.header.enable_tooltip")}
        />
        <span
          class="global-status-indicator {$localGlobalEnabledStore
            ? 'active'
            : 'inactive'}"
        >
          {$localGlobalEnabledStore
            ? $_("sidepanel.header.active")
            : $_("sidepanel.header.inactive")}
        </span>
      </div>
      <a
        href="https://github.com/DevDeividMoura/omni-max"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link-header"
        title={$_("sidepanel.header.repo_tooltip")}
      >
        <GithubMarkIcon
          size={20}
          className="github-svg-icon"
          title={$_("sidepanel.header.repo_tooltip")}
        />
      </a>
    </div>
  </div>

  <div class="sidepanel-scrollable-content">
    {#if $isLoading}
      <p class="loading-text">{$_("sidepanel.placeholders.loading")}</p>
    {:else}
      <GeneralSettings />
      <ShortcutSettings />
      <AiSettings />
      {#if $localAiFeaturesEnabledStore}
        <PersonaSettings />
        <KnowledgeBase />
      {/if}
    {/if}
  </div>

  <div class="actions-footer-fixed">
    <button
      class="button-secondary discard-button"
      on:click={discardChanges}
      disabled={!$hasPendingChanges || $isLoading}
      title={$_("sidepanel.buttons.discard_tooltip")}
    >
      {$_("sidepanel.buttons.discard")}
    </button>
    <button
      class="apply-button"
      on:click={applyChanges}
      disabled={!$hasPendingChanges || $isLoading || !$isAiConfigValid}
      title={!$isAiConfigValid
        ? $_("sidepanel.tooltips.ai_config_invalid")
        : $_("sidepanel.buttons.apply_tooltip")}
    >
      {$_("sidepanel.buttons.apply")}
    </button>
  </div>

  <div class="app-credits-footer">
    {$_("sidepanel.footer.made_with_love")}
    <a
      href="https://github.com/DevDeividMoura"
      target="_blank"
      rel="noopener noreferrer"
    >
      @DevDeividMoura
    </a>
  </div>

  <CredentialsModal
    bind:show={$showCredentialsModal}
    bind:credentials={$localAiCredentialsStore}
    providerMetadata={selectedProviderMetadata}
    onConfirm={() => {
      markChanged();
      refreshModelList();
      showCredentialsModal.set(false);
    }}
    onCancel={handleCancelCredentialsModal}
  />

  <PersonaModal
    bind:show={$showPersonaModal}
    bind:persona={$personaDraftStore}
    toolsMetadata={AGENT_TOOLS_METADATA}
    onSave={savePersonaFromModal}
    onCancel={() => showPersonaModal.set(false)}
  />

  <KnowledgeBaseModal
    bind:show={$showKnowledgeBaseModal}
    onSave={handleAddDocumentFromModal}
    onCancel={() => showKnowledgeBaseModal.set(false)}
  />
</div>

<style>
  /* Scoped styles for the main layout elements of SettingsSidepanel.svelte */
  .omni-max-sidepanel-container-fixed-layout {
    display: flex;
    flex-direction: column;
    min-width: 300px;
    height: 97vh;
    overflow: hidden;
    background-color: #f4f6f8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    font-size: 14px;
    color: #333;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .sidepanel-header-fixed {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
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

  .github-link-header :global(svg) {
    /* Example of using :global() on a nested element */
    stroke-width: 2px;
  }

  .sidepanel-scrollable-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .sidepanel-scrollable-content::-webkit-scrollbar {
    width: 8px;
  }

  .sidepanel-scrollable-content::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 4px;
  }

  .sidepanel-scrollable-content::-webkit-scrollbar-thumb:hover {
    background-color: #a8a8a8;
  }

  .sidepanel-scrollable-content::-webkit-scrollbar-track {
    background-color: #f1f1f1;
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
    background-color: #a9276f;
  }

  .discard-button {
    background-color: #6b7280;
  }

  .apply-button:hover:not(:disabled),
  .discard-button:hover:not(:disabled) {
    filter: brightness(115%);
  }

  .apply-button:disabled,
  .discard-button:disabled {
    background-image: none;
    background-color: #d1d5db;
    color: #9ca3af;
    cursor: not-allowed;
    opacity: 0.7;
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

  /*
   * Global Styles Block
   *
   * These styles are wrapped in :global() so they can be applied to elements
   * inside child components (GeneralSettings, AiSettings, PersonaModal, etc.)
   * from this parent component.
  */
  :global {
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
      background-color: #f3f4f6 !important;
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

    .sidepanel-error-text {
      font-size: 0.8em;
      color: red;
      margin-top: 4px;
    }

    .sidepanel-info-text {
      font-size: 0.8em;
      color: #555;
      margin-top: 4px;
    }

    .add-item-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      font-weight: 500;
      color: #374151;
      background-color: #f9fafb;
      border: 1px dashed #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
      transition:
        background-color 0.2s,
        border-color 0.2s;
    }

    .add-item-button:hover {
      background-color: #f3f4f6;
      border-color: #a9276f;
      color: #a9276f;
    }

    .persona-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border-radius: 0.375rem;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      margin-bottom: 8px;
    }

    .persona-item:last-child {
      margin-bottom: 0;
    }

    .persona-info {
      flex-grow: 1;
      margin-right: 12px;
    }

    .persona-name {
      font-weight: 600;
      color: #1f2937;
    }

    .persona-description {
      font-size: 0.8rem;
      color: #6b7280;
      margin: 2px 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    .persona-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .button-icon,
    .button-icon-danger {
      padding: 4px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      transition:
        background-color 0.2s,
        color 0.2s;
    }

    .button-icon:hover {
      background-color: #e5e7eb;
      color: #1f2937;
    }

    .button-icon-danger:hover {
      background-color: #fee2e2;
      color: #dc2626;
    }
  }
</style>
