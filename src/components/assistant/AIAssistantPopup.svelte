<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    ChevronDown,
    Pencil,
    X,
    ArrowUp,
    Plug,
  } from "lucide-svelte";
  import { assistantPopupStore } from "./assistantPopupStore";
  import MCPServersPopup from "./MCPServersPopup.svelte";
  import type { Translator } from "../../i18n/translator.content";

  export let translator: Translator;
  export let protocolNumber: string | null;

  // --- Internal Component State ---
  let messages: { id: string; type: "user" | "ai"; content: string; isThinking?: boolean }[] = [];
  let inputValue = "";
  let currentContext = "Esta página"; // Mocked
  let isMCPPopupOpen = false;

  const suggestions = [
    { icon: "📄", titleKey: "assistant.suggestions.summarize", descriptionKey: "assistant.suggestions.summarize_desc" },
    { icon: "✅", titleKey: "assistant.suggestions.extract_actions", descriptionKey: "assistant.suggestions.extract_actions_desc" },
    { icon: "🌐", titleKey: "assistant.suggestions.translate", descriptionKey: "assistant.suggestions.translate_desc" },
    { icon: "🔗", titleKey: "assistant.suggestions.connect_apps", descriptionKey: "assistant.suggestions.connect_apps_desc" },
  ];

  let t: (key: string) => Promise<string>;
  let translations = {
    title: "...",
    howCanIHelp: "...",
    chooseOrType: "...",
  };

  onMount(async () => {
    t = (key) => translator.t(key);
    translations.title = await t("assistant.title");
    translations.howCanIHelp = await t("assistant.how_can_i_help");
    translations.chooseOrType = await t("assistant.choose_or_type");
  });

  onDestroy(() => {
    // Cleanup if needed
  });

  async function handleSuggestionClick(suggestion: typeof suggestions[0]) {
    const title = await t(suggestion.titleKey);
    const newMessage = { id: Date.now().toString(), type: "user" as const, content: title };
    const aiResponse = { id: (Date.now() + 1).toString(), type: "ai" as const, content: "", isThinking: true };

    messages = [newMessage, aiResponse];

    setTimeout(async () => {
      const responseContent = await t("assistant.mock_response.suggestion_response");
      messages = messages.map(msg =>
        msg.id === aiResponse.id
          ? { ...msg, content: `${responseContent} "${title.toLowerCase()}".`, isThinking: false }
          : msg
      );
    }, 2000);
  }

  async function handleSendMessage() {
    if (!inputValue.trim()) return;
    const userMessage = inputValue;
    const newMessage = { id: Date.now().toString(), type: "user" as const, content: userMessage };
    const aiResponse = { id: (Date.now() + 1).toString(), type: "ai" as const, content: "", isThinking: true };
    
    messages = [...messages, newMessage, aiResponse];
    inputValue = "";

    setTimeout(async () => {
      const responseContent = await t("assistant.mock_response.user_query_response");
      messages = messages.map(msg =>
        msg.id === aiResponse.id
          ? { ...msg, content: `${responseContent} "${userMessage}".`, isThinking: false }
          : msg
      );
    }, 2000);
  }

  function handleNewChat() {
    messages = [];
  }

  function hide() {
    assistantPopupStore.hide();
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      hide();
    }
  };
</script>

<svelte:window on:keydown={handleEscapeKey} />

<div class="popup-overlay" on:click={hide} role="presentation">
  <div class="popup-wrapper" on:click|stopPropagation>

    <div class="popup-header">
      <span class="header-title">
        {#if protocolNumber}
          {translations.title}: {protocolNumber}
        {:else}
          {translations.title}
        {/if}
      </span>
      <div class="header-controls">
        <button on:click={handleNewChat} title="Novo Chat"><Pencil size={16} /></button>
        <button on:click={hide} title="Fechar"><X size={16} /></button>
      </div>
    </div>

    <div class="content-area">
      {#if messages.length === 0}
        <div class="welcome-state">
          <div class="welcome-icon-wrapper"><span>✨</span></div>
          <div>
            <h2 class="welcome-title">{translations.howCanIHelp}</h2>
            <p class="welcome-subtitle">{translations.chooseOrType}</p>
          </div>
          <div class="suggestions-list">
            {#each suggestions as suggestion (suggestion.titleKey)}
              <button class="suggestion-item" on:click={() => handleSuggestionClick(suggestion)}>
                <div class="suggestion-item-inner">
                  <span class="suggestion-icon">{suggestion.icon}</span>
                  <div>
                    <div class="suggestion-title">{#await t(suggestion.titleKey)}{:then title}{title}{/await}</div>
                    <div class="suggestion-description">{#await t(suggestion.descriptionKey)}{:then desc}{desc}{/await}</div>
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
                    <span class="ai-header-name">Assistente IA</span>
                  </div>
                {/if}

                {#if message.isThinking}
                  <div class="thinking-indicator">
                    <span>Pensando</span>
                    <div class="thinking-dots">
                      <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                    </div>
                  </div>
                {:else}
                  <div>{message.content}</div>
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
          on:keydown={handleKeyDown}
          placeholder="Peça qualquer coisa à IA..."
        ></textarea>
        <div class="composer-controls">
          <div class="composer-actions">
            <button class="composer-button">
              <span>👤</span>
              <span style="margin-left: 4px;">Comercial</span>
              <ChevronDown size={12} style="margin-left: 4px;" />
            </button>
            <button class="composer-button" on:click={() => isMCPPopupOpen = true} title="Servidores MCP">
              <Plug size={16} />
            </button>
          </div>
          <button class="send-button" on:click={handleSendMessage} disabled={!inputValue.trim()}>
            <ArrowUp size={16} color="white" />
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

{#if isMCPPopupOpen}
  <MCPServersPopup on:close={() => isMCPPopupOpen = false} />
{/if}