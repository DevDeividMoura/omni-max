<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { marked } from "marked";
  import { ChevronDown, X, ArrowUp, Plug } from "lucide-svelte";

  import { assistantPopupStore } from "./assistantPopupStore";
  import PersonaSelectorPopup from "./PersonaSelectorPopup.svelte";
  import { agentChatStore } from "./agentChatStore";
  import { personasStore, type Persona } from "../../storage/stores";

  import MCPServersPopup from "./MCPServersPopup.svelte";
  import type { Translator } from "../../i18n/translator.content";
  import type { AgentService } from "../../content/services/AgentService";

  // --- Props (Serviços injetados pelo AssistantUiService) ---
  export let translator: Translator;
  export let agentService: AgentService;

  // --- Store Auto-Subscriptions ---
  $: assistantState = $assistantPopupStore;
  $: allChats = $agentChatStore;
  $: availablePersonas = $personasStore;

  // --- Reactive Variables (CORRECTED) ---
  $: isVisible = assistantState.isVisible;
  $: context = assistantState.context;
  $: protocolNumber = context?.protocolNumber ?? null;

  $: currentChat = protocolNumber
    ? allChats[protocolNumber] || { messages: [] }
    : { messages: [] };
  $: messages = currentChat.messages;

  // NEW LOGIC: Determine if the agent is thinking by inspecting the LAST message.
  $: isAgentThinking =
    messages.length > 0 &&
    messages[messages.length - 1].type === "ai" &&
    messages[messages.length - 1].isThinking === true;

  // --- Component's Internal State ---
  let inputValue = "";
  let isMCPPopupOpen = false;
  let selectedPersonaId: string | undefined;
  let translations = {
    title: "...",
    thinking: "...",
    assistantName: "...",
    typeYourQuery: "...",
    howCanIHelp: "...",
    chooseOrType: "...",
  };
  let extensionIconUrl = "";
  let t: (key: string, options?: any) => Promise<string>;
  let contentAreaEl: HTMLElement;
  let isPersonaPopupOpen = false;

  const suggestions = [
    {
      id: "summarize",
      icon: "📄",
      titleKey: "assistant.suggestions.summarize",
      descriptionKey: "assistant.suggestions.summarize_desc",
      promptKey: "assistant.suggestions.summarize_prompt_text",
    },
    {
      id: "extract_actions",
      icon: "✅",
      titleKey: "assistant.suggestions.extract_actions",
      descriptionKey: "assistant.suggestions.extract_actions_desc",
      promptKey: "assistant.suggestions.extract_actions_prompt_text",
    },
  ];

  // --- Lifecycle and Listeners ---
  onMount(async () => {
    extensionIconUrl = chrome.runtime.getURL("src/assets/icons/icon-48.png");
    t = (key, options) => translator.t(key, options);

    translations.title = await t("assistant.title");
    translations.thinking = await t("assistant.thinking");
    translations.assistantName = await t("assistant.assistant_name");
    translations.typeYourQuery = await t("assistant.type_your_query");
    translations.howCanIHelp = await t("assistant.how_can_i_help");
    translations.chooseOrType = await t("assistant.choose_or_type");

    if (availablePersonas.length > 0) {
      selectedPersonaId = availablePersonas[0].id;
    }

    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  });

  $: if (typeof document !== "undefined") {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = ""; // Restaura o padrão
    }
  }

  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
    cleanup(); // Sua função de cleanup existente
  });

  function cleanup() {
    chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
  }

  /**
   * Waits for the next DOM update and then scrolls the chat area to the bottom.
   */
  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (contentAreaEl) {
        contentAreaEl.scrollTop = contentAreaEl.scrollHeight;
      }
    });
  }


  // --- Event Handlers ---
  async function handleBackgroundMessage(message: any) {
    if (
      message.type === "agentResponse" &&
      message.context?.protocolNumber === protocolNumber &&
      protocolNumber
    ) {
      const formattedHtml = await marked.parse(message.reply);
      agentChatStore.updateLastAiMessage(protocolNumber, formattedHtml);
      scrollToBottom();
    }
  }

  async function handleSendMessage(query: string) {
    if (!query.trim() || !context || !protocolNumber || !selectedPersonaId)
      return;

    inputValue = ""; // Clear input immediately
    agentChatStore.addMessage(protocolNumber, query);
    scrollToBottom();

    try {
      await agentService.invoke({
        context,
        query,
        personaId: selectedPersonaId,
      });
    } catch (error) {
      console.error("Error invoking agent:", error);
      const errorMessage = await t("assistant.errors.invoke_failed", {
        values: { message: (error as Error).message },
      });
      agentChatStore.updateLastAiMessage(protocolNumber, errorMessage);
    }
  }

  async function handleSuggestionClick(suggestion: (typeof suggestions)[0]) {
    if (!context || !protocolNumber || !selectedPersonaId) return;

    const hiddenPrompt = await t(suggestion.promptKey);
    const userFacingMessage = await t(suggestion.titleKey);

    agentChatStore.addMessage(protocolNumber, userFacingMessage);
    scrollToBottom();

    try {
      await agentService.invoke({
        context,
        query: hiddenPrompt,
        personaId: selectedPersonaId,
      });
    } catch (error) {
      console.error("Error invoking agent from suggestion:", error);
      const errorMessage = await t("assistant.errors.invoke_failed", {
        values: { message: (error as Error).message },
      });
      agentChatStore.updateLastAiMessage(protocolNumber, errorMessage);

    }
  }

  function handlePersonaSelect(selectedId: string) {
    selectedPersonaId = selectedId; // Atualiza o ID
    isPersonaPopupOpen = false; // Fecha o popup
    handlePersonaChange(); // Notifica o agente da mudança (função que já existe)
  }

  async function handlePersonaChange() {
    if (!selectedPersonaId || !context) return;
    await agentService.changePersona({
      context,
      newPersonaId: selectedPersonaId,
    });
  }

  function hide() {
    assistantPopupStore.hide();
  }

  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isVisible) hide();
  };

  const handleTextareaKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };
</script>

<svelte:window on:keydown={handleEscapeKey} />

{#if isVisible}
  <div class="popup-overlay" on:click={hide} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="popup-wrapper" on:click|stopPropagation>
      <div class="popup-header">
        <span class="header-title">
          {#if protocolNumber}{translations.title}: {protocolNumber}{:else}{translations.title}{/if}
        </span>
        <div class="header-controls">
          <button on:click={hide} title="Fechar"><X size={16} /></button>
        </div>
      </div>

      <div class="content-area" bind:this={contentAreaEl}>
        {#if messages.length === 0}
          <div class="welcome-state">
            <div class="welcome-icon-wrapper">
              <img src={extensionIconUrl} alt="Omni Max Logo" />
            </div>
            <div>
              <h2 class="welcome-title">{translations.howCanIHelp}</h2>
              <p class="welcome-subtitle">{translations.chooseOrType}</p>
            </div>
            <div class="suggestions-list">
              {#each suggestions as suggestion (suggestion.id)}
                <button
                  class="suggestion-item"
                  on:click={() => handleSuggestionClick(suggestion)}
                >
                  <div class="suggestion-item-inner">
                    <span class="suggestion-icon">{suggestion.icon}</span>
                    <div>
                      <div class="suggestion-title">
                        {#await t(suggestion.titleKey) then title}{title}{/await}
                      </div>
                      <div class="suggestion-description">
                        {#await t(suggestion.descriptionKey) then desc}{desc}{/await}
                      </div>
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {:else}
          <div class="conversation-state">
            {#each messages as message (message.id)}
              <div class="message-bubble {message.type}">
                <div class="message-content {message.type}">
                  {#if message.type === "ai"}
                    <div class="ai-header">
                      <div class="ai-icon-wrapper"><span>✨</span></div>
                      <span class="ai-header-name"
                        >{translations.assistantName}</span
                      >
                    </div>
                  {/if}

                  {#if message.isThinking}
                    <div class="thinking-indicator">
                      <span>{translations.thinking}</span>
                      <div class="thinking-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                      </div>
                    </div>
                  {:else}
                    {@html message.content}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="composer">
        <div class="composer-input-wrapper">
          <textarea
            bind:value={inputValue}
            on:keydown={handleTextareaKeyDown}
            placeholder={translations.typeYourQuery}
            disabled={isAgentThinking}
          ></textarea>
          <div class="composer-controls">
            <div class="composer-actions">
              <button
                class="persona-selector-button"
                on:click={() => (isPersonaPopupOpen = !isPersonaPopupOpen)}
                title="Selecionar Persona"
              >
                <span class="button-icon">👤</span>
                <span class="button-text">
                  {availablePersonas.find((p) => p.id === selectedPersonaId)
                    ?.name || "Selecionar..."}
                </span>
                <ChevronDown class="button-chevron" size={14} />
              </button>
              <button
                class="composer-button-icon"
                on:click={() => (isMCPPopupOpen = true)}
                title="Servidores MCP"
              >
                <Plug size={16} />
              </button>
            </div>

            <div class="composer-actions-right">
              <button
                class="send-button"
                on:click={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isAgentThinking}
              >
                <ArrowUp size={16} color="white" />
              </button>
            </div>
            <PersonaSelectorPopup
              isOpen={isPersonaPopupOpen}
              personas={availablePersonas}
              {selectedPersonaId}
              onSelect={handlePersonaSelect}
              onClose={() => (isPersonaPopupOpen = false)}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<MCPServersPopup
  isOpen={isMCPPopupOpen}
  onClose={() => (isMCPPopupOpen = false)}
  {translator}
/>
