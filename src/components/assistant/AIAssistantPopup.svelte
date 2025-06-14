<script lang="ts">
  import { onMount } from "svelte";
  import { marked } from "marked";
  import {
    ChevronDown,
    X,
    ArrowUp,
    Plug,
  } from "lucide-svelte";
  import { assistantPopupStore, type AssistantPopupState } from "./assistantPopupStore";
  import MCPServersPopup from "./MCPServersPopup.svelte";
  import { getLocaleFromAgent } from "../../utils/language";
  import type { Translator } from "../../i18n/translator.content";
  import type { AIServiceManager } from "../../ai/AIServiceManager";
  import type { MatrixApiService } from "../../content/services/MatrixApiService";
  import { decodeHtmlEntities } from "../../utils";

  // --- Melhora de Legibilidade: Definindo um tipo para a mensagem ---
  type Message = {
    id: string;
    type: "user" | "ai";
    content: string;
    isThinking?: boolean;
  };

  // --- Props (Serviços injetados pelo AssistantUiService) ---
  export let translator: Translator;
  export let aiManager: AIServiceManager;
  export let matrixApiService: MatrixApiService;
  
  // --- Estado Reativo da Store ---
  let assistantState: AssistantPopupState;
  assistantPopupStore.subscribe(value => {
    assistantState = value;
  });

  $: isVisible = assistantState.isVisible;
  $: protocolNumber = assistantState.protocolNumber;
  $: contactId = assistantState.contactId;
  $: triggerButtonRect = assistantState.triggerButtonRect;

  // --- Referência ao elemento do DOM para posicionamento ---
  let popupWrapperElement: HTMLElement;
  
  // --- Estado Interno do Componente ---
  let messages: Message[] = []; // Usando o novo tipo Message
  let inputValue = "";
  let isMCPPopupOpen = false;
  let currentPersona = "Comercial";

  let extensionIconUrl = "";

  const suggestions = [
    { id: 'summarize', icon: "📄", titleKey: "assistant.suggestions.summarize", descriptionKey: "assistant.suggestions.summarize_desc" },
    { id: 'extract_actions', icon: "✅", titleKey: "assistant.suggestions.extract_actions", descriptionKey: "assistant.suggestions.extract_actions_desc" },
  ];

  let t: (key: string, options?: { values: Record<string, any> }) => Promise<string>;
  let translations = {
    title: "...", howCanIHelp: "...", chooseOrType: "...", thinking: "...", assistantName: "...", typeYourQuery: "...",
  };

  // --- Lógica de Ciclo de Vida e Efeitos ---
  onMount(async () => {
    extensionIconUrl = chrome.runtime.getURL("src/assets/icons/icon-48.png");

    t = (key, options) => translator.t(key, options);
    translations.title = await t("assistant.title");
    translations.howCanIHelp = await t("assistant.how_can_i_help");
    translations.chooseOrType = await t("assistant.choose_or_type");
    translations.thinking = await t("assistant.thinking");
    translations.assistantName = await t("assistant.assistant_name");
    translations.typeYourQuery = await t("assistant.type_your_query");
  });

  $: if (isVisible && triggerButtonRect && popupWrapperElement) {
    positionPopup();
  }

  // --- Funções ---

  function positionPopup() {
    if (!popupWrapperElement || !triggerButtonRect) return;
    
    const x = triggerButtonRect.left + triggerButtonRect.width / 2;
    const y = triggerButtonRect.top;
    
    popupWrapperElement.style.left = `${x}px`;
    popupWrapperElement.style.bottom = `${window.innerHeight - y + 10}px`;
    popupWrapperElement.style.transform = 'translateX(-50%)';
  }
  
  async function handleSuggestionClick(suggestionId: string) {
    if (suggestionId === 'summarize') {
      const title = await t(suggestions[0].titleKey);
      messages = [{ id: Date.now().toString(), type: 'user', content: title }];
      await generateSummary();
    }
  }
  
  async function generateSummary() {
      const thinkingMessage: Message = { id: Date.now().toString(), type: "ai", content: "", isThinking: true };
      messages = [...messages, thinkingMessage];

      try {
          if (!protocolNumber || !contactId) {
            throw new Error(await t("assistant.errors.no_context"));
          }

          const allSessions = await matrixApiService.getAtendimentosByContato(contactId);
          const currentSession = allSessions.find(s => s.protocolNumber === protocolNumber);
          
          if (!currentSession || currentSession.messages.length === 0) {
              throw new Error(await t("assistant.errors.no_messages_to_summarize"));
          }

          const customerName = currentSession.contactName || await t("content.ai_context.role_customer");
          let preamble = await t("content.ai_context.preamble_start", { values: { protocolNumber, customerName } });
          
          const conversationTurns = await Promise.all(currentSession.messages.map(async msg => {
              const roleLabel = await t(`content.ai_context.role_${msg.role}`);
              return `${msg.senderName} (${roleLabel}): ${decodeHtmlEntities(msg.content)}`;
          }));
          
          const fullTextForAI = `${preamble}\n\n${conversationTurns.join('\n\n')}`;
          const currentLocale = getLocaleFromAgent();
          
          const summary = await aiManager.generateSummary(fullTextForAI, currentLocale);
          
          // FIX: Adicionado 'await' para garantir que marked.parse() resolva para uma string.
          const finalContent = await marked.parse(summary);
          
          messages = messages.map(m => m.id === thinkingMessage.id ? { ...m, content: finalContent, isThinking: false } : m);

      } catch (error: any) {
          console.error("Omni Max [Assistant]: Error generating summary:", error);
          const errorMessage = await t("assistant.errors.summary_failed", { values: { message: error.message } });
          messages = messages.map(m => m.id === thinkingMessage.id ? { ...m, content: `<p style="color: red;">${errorMessage}</p>`, isThinking: false } : m);
      }
  }

  function handleNewChat() {
    messages = [];
  }

  function hide() {
    assistantPopupStore.hide();
  }

  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isVisible) {
      hide();
    }
  };

  const handleTextareaKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // handleSendMessage(); // A ser implementado
    }
  }
</script>

<svelte:window on:keydown={handleEscapeKey} />

{#if isVisible}
  <div class="popup-overlay" on:click={hide} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="popup-wrapper" bind:this={popupWrapperElement} on:click|stopPropagation>
      
      <div class="popup-header">
        <span class="header-title">
          {#if protocolNumber}{translations.title}: {protocolNumber}{:else}{translations.title}{/if}
        </span>
        <div class="header-controls">
          <button on:click={hide} title="Fechar"><X size={16} /></button>
        </div>
      </div>

      <div class="content-area">
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
                      <button class="suggestion-item" on:click={() => handleSuggestionClick(suggestion.id)}>
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
                        {#if message.type === 'ai'}
                          <div class="ai-header">
                              <div class="ai-icon-wrapper"><span>✨</span></div>
                              <span class="ai-header-name">{translations.assistantName}</span>
                          </div>
                        {/if}

                        {#if message.isThinking}
                          <div class="thinking-indicator">
                              <span>{translations.thinking}</span>
                              <div class="thinking-dots">
                                  <div class="dot"></div><div class="dot"></div><div class="dot"></div>
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
          ></textarea>
          <div class="composer-controls">
            <div class="composer-actions">
              <button class="composer-button">
                <span>👤</span>
                <span style="margin-left: 4px;">{currentPersona}</span>
                <ChevronDown size={12} style="margin-left: 4px;" />
              </button>
              <button class="composer-button" on:click={() => isMCPPopupOpen = true} title="Servidores MCP">
                <Plug size={12} />
              </button>
            </div>
            <button class="send-button" on:click={() => {}} disabled={!inputValue.trim()}>
              <ArrowUp size={16} color="white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if isMCPPopupOpen}
  <MCPServersPopup on:close={() => isMCPPopupOpen = false} />
{/if}