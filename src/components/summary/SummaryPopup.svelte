<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { marked } from "marked";
  import { summaryPopupStore } from "./summaryPopupStore";
  import type { AIServiceManager } from "../../ai/AIServiceManager";
  import type { MatrixApiService } from "../../content/services/MatrixApiService";
  import type { SummaryCacheService } from "../../content/services/SummaryCacheService";
  import type { CustomerServiceSession } from "../../content/types";
  import {
    maskSensitiveDocumentNumbers,
    decodeHtmlEntities,
  } from "../../utils";
  import { getLocaleFromAgent } from "../../utils/language";
  import type { Translator } from "../../i18n/translator.content";

  // --- Props ---
  export let aiManager: AIServiceManager;
  export let matrixApiService: MatrixApiService;
  export let summaryCacheService: SummaryCacheService;
  export let translator: Translator;

  $: ({ isVisible, triggerButtonRect, protocolNumber, contactId } =
    $summaryPopupStore);

  // --- Internal State ---
  let isLoading = false;
  let summaryText = "";
  let popupElement: HTMLElement;
  let t: (
    key: string,
    options?: { values?: Record<string, string | number> },
  ) => Promise<string>;

  // --- Translations ---
  let translations = {
    title: "Loading...",
    closeButtonTitle: "Loading...",
    closeButtonAriaLabel: "Loading...",
    loadingText: "Loading...",
    noSummaryAvailable: "Loading...",
  };

  $: if (isVisible && protocolNumber && contactId) {
    loadSummary(protocolNumber, contactId);
  }

  $: if (popupElement && triggerButtonRect) {
    positionPopup();
  }

  onMount(async () => {
    t = translator.t.bind(translator);
    // Pre-load translations for the UI
    translations.title = await t("content.summary_popup.title");
    translations.closeButtonTitle = await t(
      "content.summary_popup.close_button_title",
    );
    translations.closeButtonAriaLabel = await t(
      "content.summary_popup.close_button_aria_label",
    );
    translations.loadingText = await t("content.summary_popup.loading_text");
    translations.noSummaryAvailable = await t(
      "content.summary_popup.no_summary_available",
    );

    document.addEventListener("keydown", handleEscapeKey);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", handleEscapeKey);
  });

  function positionPopup() {
    if (!popupElement || !triggerButtonRect) return;
    const x = triggerButtonRect.left + triggerButtonRect.width / 2;
    const y = triggerButtonRect.top;
    popupElement.style.left = `${x}px`;
    popupElement.style.bottom = `${window.innerHeight - y + 10}px`;
    popupElement.style.transform = "translateX(-50%)";
  }

  async function loadSummary(pNumber: string, cId: string) {
    isLoading = true;
    summaryText = "";

    try {
      const cachedSummary = await summaryCacheService.getSummary(pNumber);
      if (cachedSummary) {
        summaryText = cachedSummary;
        return;
      }

      const allContactSessions: CustomerServiceSession[] =
        await matrixApiService.getAtendimentosByContato(cId);
      const currentSession = allContactSessions.find(
        (session) => session.protocolNumber === pNumber,
      );

      if (currentSession && currentSession.messages.length > 0) {
        const customerNameForContext =
          currentSession.contactName ||
          (await t("content.ai_context.role_customer"));

        let conversationPreamble = await t(
          "content.ai_context.preamble_start",
          {
            values: {
              protocolNumber: pNumber,
              customerName: customerNameForContext,
            },
          },
        );
        if (currentSession.originalAttendanceIds.length > 1) {
          conversationPreamble += await t(
            "content.ai_context.preamble_segments",
            {
              values: { ids: currentSession.originalAttendanceIds.join(", ") },
            },
          );
        }
        conversationPreamble += "\n\n";

        const conversationTurns: string[] = [];
        for (const msg of currentSession.messages) {
          const maskedContent = maskSensitiveDocumentNumbers(
            decodeHtmlEntities(msg.content),
          );
          let roleLabel: string;
          switch (msg.role) {
            case "customer":
              roleLabel = await t("content.ai_context.role_customer");
              break;
            case "agent":
              roleLabel = await t("content.ai_context.role_agent");
              break;
            case "system":
              roleLabel = await t("content.ai_context.role_system");
              break;
            default:
              roleLabel = await t("content.ai_context.role_unknown");
          }
          conversationTurns.push(
            `${msg.senderName} (${roleLabel}): ${maskedContent}`,
          );
        }

        const fullConversationForAI =
          conversationPreamble + conversationTurns.join("\n\n");
        const currentLocale = getLocaleFromAgent();
        const newSummary = await aiManager.generateSummary(
          fullConversationForAI,
          currentLocale,
        );

        await summaryCacheService.saveSummary(pNumber, newSummary);
        summaryText = newSummary;
      } else {
        summaryText = translations.noSummaryAvailable;
      }
    } catch (error: any) {
      console.error(
        `Omni Max [SummaryPopup]: Error processing summary for protocol ${pNumber}:`,
        error,
      );
      const message =
        error.message ||
        (await t("content.summary_popup.error_generating_unknown"));
      summaryText = await t("content.summary_popup.error_generating", {
        values: { message },
      });
    } finally {
      isLoading = false;
    }
  }

  function hide() {
    summaryPopupStore.hide();
  }

  const handleEscapeKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      hide();
    }
  };

  const CLOSE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
</script>

{#if isVisible}
  <div class="popup-overlay" on:click={hide} role="presentation"></div>
  <div
    class="popup-wrapper"
    bind:this={popupElement}
    role="dialog"
    aria-modal="true"
    aria-labelledby="popup-title"
  >
    <div class="popup-inner">
      <div class="popup-header">
        <h3 id="popup-title" class="popup-title">{translations.title}</h3>
        <button
          class="close-button"
          title={translations.closeButtonTitle}
          aria-label={translations.closeButtonAriaLabel}
          on:click={hide}
        >
          {@html CLOSE_ICON_SVG}
        </button>
      </div>
      <div class="popup-content-area">
        {#if isLoading}
          <div class="loading-state">
            <div class="skeleton-lines">
              <div class="skeleton-line"></div>
              <div class="skeleton-line w-3-4"></div>
              <div class="skeleton-line w-1-2"></div>
            </div>
            <div class="loading-text-container">
              <div class="dot"></div>
              <div class="dot"></div>
              <div class="dot"></div>
              <span class="loading-text-span">{translations.loadingText}</span>
            </div>
          </div>
        {:else}
          <div class="summary-content">
            {@html marked.parse(summaryText || translations.noSummaryAvailable)}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
