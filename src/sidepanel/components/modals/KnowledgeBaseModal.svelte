<script lang="ts">
  /**
   * KnowledgeBaseModal.svelte
   *
   * A modal for adding new documents to the knowledge base,
   * either by direct text input or by uploading a .md or .txt file.
   */
  import { _ } from 'svelte-i18n';
  import { XCircle } from 'lucide-svelte';

  export let show: boolean = false;
  export let onSave: (document: { pageContent: string; metadata: { source: string } }) => void;
  export let onCancel: () => void;

  let source: string = '';
  let selectedFile: File | null = null;
  let isReadingFile = false;
  let fileError: string | null = null;

  // Reseta o estado do modal sempre que ele é aberto
  $: if (show) {
    source = '';
    selectedFile = null;
    isReadingFile = false;
    fileError = null;
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      if (file.type === 'text/markdown' || file.type === 'text/plain') {
        selectedFile = file;
        fileError = null;
        if (!source) {
          source = file.name; // Usa o nome do arquivo como source padrão
        }
      } else {
        fileError = 'Invalid file type. Please select a .md or .txt file.';
        selectedFile = null;
      }
    }
  }

  async function handleSave() {
    if (!selectedFile) return;
    isReadingFile = true;
    fileError = null;

    try {
      const pageContent = await readFileContent(selectedFile);
      const document = {
        pageContent,
        metadata: {
          source: source.trim() || selectedFile.name,
          fileName: selectedFile.name,
          addedAt: Date.now(),
        }
      };
      if (onSave) onSave(document);
    } catch (err: any) {
      fileError = `Error reading file: ${err.message}`;
    } finally {
      isReadingFile = false;
    }
  }

  function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  }

  function handleCancel() {
    if (onCancel) onCancel();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') handleCancel();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" on:click={handleCancel}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{$_('modules.knowledge_base.add_document_title')}</h3>
        <button class="close-button" on:click={handleCancel}><XCircle size={22} /></button>
      </div>

      <div class="modal-body">
        <div class="input-group">
          <input
            type="file"
            id="file-upload"
            accept=".md,.txt,text/plain,text/markdown"
            on:change={handleFileSelect}
            style="display: none;"
          />
          <label for="file-upload" class="button-secondary full-width">
            {$_('modules.knowledge_base.select_file_button')}
          </label>
          
          {#if selectedFile}
            <p class="file-info">Selected: <strong>{selectedFile.name}</strong></p>
          {/if}
        </div>

        <div class="input-group">
          <label for="docSource">{$_('modules.knowledge_base.source_label')}</label>
          <input
            id="docSource"
            class="input-field"
            placeholder={$_('modules.knowledge_base.source_placeholder')}
            bind:value={source}
          />
        </div>

        {#if fileError}
          <p class="sidepanel-error-text">{fileError}</p>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="button-secondary" on:click={handleCancel}>{$_('sidepanel.buttons.cancel')}</button>
        <button class="button-primary" on:click={handleSave} disabled={!selectedFile || isReadingFile}>
          {#if isReadingFile}
            {$_('sidepanel.buttons.saving')}...
          {:else}
            {$_('sidepanel.buttons.save')}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .file-info {
    font-size: 0.85em;
    color: #374151;
    margin-top: 8px;
    text-align: center;
  }
  /* Garante que o label pareça um botão clicável */
  label.button-secondary {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>