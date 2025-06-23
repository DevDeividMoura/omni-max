<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { marked } from "marked";
  import { ChevronDown, X, ArrowUp, Plug } from "lucide-svelte";

  import { assistantPopupStore } from "./assistantPopupStore";
  import PersonaSelectorPopup from "./PersonaSelectorPopup.svelte";
  import { agentChatStore, type ChatMessage } from "./agentChatStore"; // Importar ChatMessage
  import { personasStore, type Persona } from "../../storage/stores";

  import MCPServersPopup from "./MCPServersPopup.svelte";
  import type { Translator } from "../../i18n/translator.content";
  import type { AgentService } from "../../content/services/AgentService";

  // --- Props ---
  export let translator: Translator;
  export let agentService: AgentService;

  // --- Store Auto-Subscriptions ---
  $: assistantState = $assistantPopupStore;
  $: allChats = $agentChatStore;
  $: availablePersonas = $personasStore;

  // --- Reactive Variables ---
  $: isVisible = assistantState.isVisible;
  $: context = assistantState.context;
  $: sessionId = context?.attendanceId ?? null;

  $: currentChat = sessionId
    ? allChats[sessionId] || { messages: [] }
    : { messages: [] };
  $: messages = currentChat.messages;

  $: isAgentThinking =
    messages.length > 0 &&
    messages[messages.length - 1].type === "ai" &&
    messages[messages.length - 1].isThinking === true;

  // --- Internal State ---
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
  let t: (key: string, options?: any) => Promise<string>;
  let contentAreaEl: HTMLElement;
  let textareaEl: HTMLTextAreaElement;
  let isPersonaPopupOpen = false;

  let wasStateRequestedForSession: string | null = null;

  // --- Lifecycle and Listeners ---
  onMount(async () => {
    extensionIconUrl = chrome.runtime.getURL("src/assets/icons/icon-48.png");
    t = (key, options) => translator.t(key, options);

    Object.assign(translations, {
      title: await t("assistant.title"),
      thinking: await t("assistant.thinking"),
      assistantName: await t("assistant.assistant_name"),
      typeYourQuery: await t("assistant.type_your_query"),
      howCanIHelp: await t("assistant.how_can_i_help"),
      chooseOrType: await t("assistant.choose_or_type"),
    });

    if (availablePersonas.length > 0) {
      selectedPersonaId = availablePersonas[0].id;
    }

    chrome.runtime.onMessage.addListener(handleBackgroundMessage);

    console.log("[UI] AIAssistantPopup mounted");
  });

  onDestroy(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
    chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
  });

  $: if (typeof document !== "undefined") {
    document.body.style.overflow = isVisible ? "hidden" : "";
    if (isVisible) scrollToBottom();
  }

  // --- Logic Functions ---

  function scrollToBottom() {
    tick().then(() => {
      if (contentAreaEl) {
        contentAreaEl.scrollTop = contentAreaEl.scrollHeight;
      }
    });
  }

  $: {
    console.log(
      `[UI] Reactive block fired. SessionId: ${sessionId}, Visible: ${isVisible}`,
    );
    // A condição agora é: O popup está visível, temos um sessionId, e ainda não buscamos o estado PARA ESTA SESSÃO.
    if (isVisible && sessionId && wasStateRequestedForSession !== sessionId) {
      console.log(
        `[UI] CONTEXTO PRONTO. Solicitando estado para a sessão: ${sessionId}`,
      );

      // Marca que já pedimos o estado para esta sessão para evitar repetições.
      wasStateRequestedForSession = sessionId;

      chrome.runtime.sendMessage(
        { type: "getAgentState", context },
        (response) => {
          if (
            response?.success &&
            response.state &&
            response.state.messages.length > 0
          ) {
            console.log(
              `[UI] Estado recebido com ${response.state.messages.length} mensagens. Hidratando a store.`,
            );
            agentChatStore.setInitialState(sessionId, response.state);
          } else {
            console.log(
              `[UI] Nenhum estado existente encontrado para a sessão ${sessionId}.`,
            );
          }
          scrollToBottom();
        },
      );
    }
  }

  /**
   * @handler handleBackgroundMessage
   * @description Manipula mensagens vindas do background script para atualizar a UI.
   */
  function handleBackgroundMessage(message: any) {
    if (message.context?.attendanceId !== sessionId || !sessionId) return;

    switch (message.type) {
      case "slashCommandResult":
        console.log(`[UI] Received slash command result for session ${sessionId}.`);
        // O `reply` já vem formatado como markdown pelo background.
        // Usamos `appendTokenToLastAiMessage` para substituir o conteúdo do balão "pensando".
        agentChatStore.appendTokenToLastAiMessage(sessionId, message.reply, "");
        // Imediatamente finalizamos, pois não haverá mais tokens.
        agentChatStore.finalizeLastAiMessage(sessionId);
        scrollToBottom();
        break;

      case "agentChatCleared":
        console.log(
          `[UI] Received confirmation to clear session: ${sessionId}`,
        );
        agentChatStore.clearSession(sessionId);
        // A UI irá reativamente voltar ao estado de boas-vindas.
        break;

      case "agentTokenChunk":
        console.log(
          `[UI] Received token chunk for session ${sessionId}: ${message.token}`,
        );
        // CORREÇÃO: Apenas anexa o token de texto bruto. A renderização acontece no template.
        agentChatStore.appendTokenToLastAiMessage(
          sessionId,
          message.token, // Passa o token bruto
          message.messageId,
        );
        scrollToBottom();
        break;

      case "agentToolEnd":
        console.log(
          `[UI] Tool execution completed for session ${sessionId}: ${message.toolName}`,
        );
        // Aqui, como é um evento discreto, podemos formatar e anexar.
        const toolResultContent = `*Ferramenta ${message.toolName} executada.*\n`;
        agentChatStore.appendTokenToLastAiMessage(
          sessionId,
          toolResultContent,
          "",
        );
        agentChatStore.addEmptyAiMessage(sessionId); // Prepara para a próxima resposta da IA.
        scrollToBottom();
        break;

      case "agentStreamEnd":
        console.log(`[UI] Agent response completed for session ${sessionId}`);
        agentChatStore.finalizeLastAiMessage(sessionId);
        break;

      case "agentError":
        console.error(
          `[UI] Error from agent for session ${sessionId}: ${message.error}`,
        );
        const errorContent = `<p style="color: red; font-family: monospace;"><b>Error:</b> ${message.error}</p>`;
        agentChatStore.appendTokenToLastAiMessage(sessionId, errorContent, "");
        agentChatStore.finalizeLastAiMessage(sessionId);
        break;
    }
  }

  async function _invokeAgentAndHandleResponse(
    agentQuery: string,
    displayMessage: string,
  ) {
    if (!agentQuery.trim() || !context || !sessionId) return;
    if (!selectedPersonaId) selectedPersonaId = availablePersonas[0]?.id;

    // A mensagem do usuário é adicionada à store como texto bruto.
    agentChatStore.addUserMessage(sessionId, displayMessage);
    agentChatStore.addEmptyAiMessage(sessionId);
    await tick();
    scrollToBottom();

    console.log(`[UI] Current context: ${JSON.stringify(context)}`);

    agentService.invoke({
      context,
      query: agentQuery,
      personaId: selectedPersonaId,
    });
  }

  async function handleSendMessage(query: string) {
    inputValue = "";
    if (textareaEl) textareaEl.style.height = "auto";
    await _invokeAgentAndHandleResponse(query, query);
  }

  async function handleSuggestionClick(suggestion: any) {
    if (!context || !sessionId || !selectedPersonaId) return;
    const hiddenPrompt = await t(suggestion.promptKey);
    const userFacingMessage = await t(suggestion.titleKey);
    await _invokeAgentAndHandleResponse(hiddenPrompt, userFacingMessage);
  }

  function handlePersonaSelect(selectedId: string) {
    selectedPersonaId = selectedId;
    isPersonaPopupOpen = false;
    // Lógica para notificar mudança de persona, se necessário
  }

  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isVisible) assistantPopupStore.hide();
  };

  const handleTextareaKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  function autoResizeTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
</script>

<svelte:window on:keydown={handleEscapeKey} />

{#if isVisible}
  <div
    class="popup-overlay"
    on:click={assistantPopupStore.hide}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="popup-wrapper" on:click|stopPropagation>
      <div class="popup-header">
        <span class="header-title">
          {#if sessionId}{translations.title}: {sessionId}{:else}{translations.title}{/if}
        </span>
        <div class="header-controls">
          <button on:click={assistantPopupStore.hide} title="Fechar"
            ><X size={16} /></button
          >
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
                      <div class="ai-icon-wrapper">
                        <img src={extensionIconUrl} alt="Omni Max Logo" />
                      </div>
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
                    {#await marked.parse(message.content || "") then html}
                      {@html html}
                    {/await}
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
            bind:this={textareaEl}
            bind:value={inputValue}
            on:keydown={handleTextareaKeyDown}
            on:input={autoResizeTextarea}
            rows="1"
            placeholder={translations.typeYourQuery}
            disabled={isAgentThinking}
          ></textarea>

          <div class="composer-controls">
            <div class="composer-actions">
              <div style="position: relative;">
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

                <PersonaSelectorPopup
                  isOpen={isPersonaPopupOpen}
                  personas={availablePersonas}
                  {selectedPersonaId}
                  onSelect={handlePersonaSelect}
                  onClose={() => (isPersonaPopupOpen = false)}
                />
              </div>
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
