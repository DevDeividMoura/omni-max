<script lang="ts">
  /**
   * KnowledgeBaseModal.svelte (Revised UX & i18n)
   * A modal for adding documents with robust user feedback for file validation and save status.
   * Uses standardized i18n keys for modal content.
   */
  import { _ } from "svelte-i18n";
  import { XCircle, FileUp, CheckCircle, AlertTriangle } from "lucide-svelte";

  export let show: boolean = false;
  export let onSave: (document: {
    pageContent: string;
    metadata: any;
  }) => Promise<void>;
  export let onCancel: () => void;

  let source: string = "";
  let selectedFile: File | null = null;
  let isProcessing = false;
  let feedbackMessage: { type: "error" | "success"; text: string } | null =
    null;

  $: if (show) {
    source = "";
    selectedFile = null;
    isProcessing = false;
    feedbackMessage = null;
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    feedbackMessage = null;

    if (file) {
      const isValidExtension =
        file.name.endsWith(".md") || file.name.endsWith(".txt");
      if (isValidExtension) {
        selectedFile = file;
        if (!source) source = file.name;
      } else {
        // Chave de i18n atualizada
        feedbackMessage = {
          type: "error",
          text: $_("modules.knowledge_base.modal.error_file_type"),
        };
        selectedFile = null;
        target.value = "";
      }
    }
  }

  async function handleSave() {
    if (!selectedFile) return;
    isProcessing = true;
    feedbackMessage = null;

    try {
      const pageContent = await readFileContent(selectedFile);
      const document = {
        pageContent,
        metadata: {
          source: source.trim() || selectedFile.name,
          fileName: selectedFile.name,
          addedAt: Date.now(),
        },
      };

      await onSave(document);

      // Chave de i18n atualizada
      feedbackMessage = {
        type: "success",
        text: $_("modules.knowledge_base.modal.save_success"),
      };

      setTimeout(() => handleCancel(), 1500);
    } catch (err: any) {
      // Chave de i18n atualizada
      const errorMessage = $_("modules.knowledge_base.modal.error_read_file", {
        values: { message: err.message },
      });
      feedbackMessage = { type: "error", text: errorMessage };
      isProcessing = false;
    }
  }

  function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }

  function handleCancel() {
    if (onCancel) onCancel();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") handleCancel();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" on:click={handleCancel}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{$_("modules.knowledge_base.modal.add_document_title")}</h3>
        <button class="close-button" on:click={handleCancel}
          ><XCircle size={22} /></button
        >
      </div>

      <div class="modal-body">
        <div class="input-group">
          <input
            type="file"
            id="file-upload"
            accept=".md,.txt"
            on:change={handleFileSelect}
            style="display: none;"
            disabled={isProcessing}
          />
          <label
            for="file-upload"
            class="dashed-upload-box"
            class:disabled={isProcessing}
          >
            <FileUp size={18} />
            <span>{$_("modules.knowledge_base.modal.select_file_button")}</span>
          </label>

          {#if selectedFile}
            <p class="file-info">
              Selecionado: <strong>{selectedFile.name}</strong>
            </p>
          {/if}
        </div>

        <div class="input-group">
          <label for="docSource"
            >{$_("modules.knowledge_base.modal.source_label")}</label
          >
          <input
            id="docSource"
            class="input-field"
            placeholder={$_("modules.knowledge_base.modal.source_placeholder")}
            bind:value={source}
            disabled={isProcessing}
          />
        </div>

        {#if feedbackMessage}
          <div
            class="feedback-box"
            class:error={feedbackMessage.type === "error"}
            class:success={feedbackMessage.type === "success"}
          >
            {#if feedbackMessage.type === "error"}<AlertTriangle
                size={16}
              />{:else}<CheckCircle size={16} />{/if}
            <span>{feedbackMessage.text}</span>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button
          class="button-secondary"
          on:click={handleCancel}
          disabled={isProcessing}>{$_("sidepanel.buttons.cancel")}</button
        >
        <button
          class="button-primary"
          on:click={handleSave}
          disabled={!selectedFile || isProcessing}
        >
          {#if isProcessing}{$_("sidepanel.buttons.saving")}...{:else}{$_(
              "sidepanel.buttons.save",
            )}{/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* O CSS permanece o mesmo da versão anterior */
  .dashed-upload-box {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px 10px;
    font-weight: 500;
    color: #374151;
    background-color: #f9fafb;
    border: 2px dashed #d1d5db;
    border-radius: 0.5rem;
    cursor: pointer;
    transition:
      background-color 0.2s,
      border-color 0.2s,
      color 0.2s;
  }
  .dashed-upload-box.disabled {
    cursor: not-allowed;
    background-color: #f3f4f6;
    opacity: 0.7;
  }
  .dashed-upload-box:hover:not(.disabled) {
    background-color: #f3f4f6;
    border-color: #a9276f;
    color: #a9276f;
  }
  .file-info {
    font-size: 0.85em;
    color: #374151;
    margin-top: 12px;
    text-align: center;
    background-color: #e5e7eb;
    padding: 6px;
    border-radius: 4px;
    word-break: break-all;
  }
  .feedback-box {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85em;
    padding: 10px;
    margin-top: 8px;
    border-radius: 6px;
    border: 1px solid;
  }
  .feedback-box.error {
    color: #991b1b;
    background-color: #fee2e2;
    border-color: #fca5a5;
  }
  .feedback-box.success {
    color: #14532d;
    background-color: #dcfce7;
    border-color: #86efac;
  }
</style>
