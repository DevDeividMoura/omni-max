<script lang="ts">
  import { getContext } from 'svelte';
  import { _ } from 'svelte-i18n';
  import CollapsibleSection from '../../shared/components/CollapsibleSection.svelte';
  import { Database, Trash2, PlusCircle, Info } from 'lucide-svelte';
  import type { SettingsContextType } from '../SettingsSidepanel.svelte';

  const {
    localOpenSectionsStore,
    toggleSectionCollapse,
    knowledgeBaseDocuments,
    handleDeleteDocument,
    addNewDocument,
  } = getContext<SettingsContextType>('settings');
</script>

<CollapsibleSection
  title={$_('modules.knowledge_base.title')}
  icon={Database}
  isOpen={$localOpenSectionsStore.knowledgeBase}
  onToggle={() => toggleSectionCollapse('knowledgeBase')}
>
  <div class="section-item-space">
    <button class="add-item-button" on:click={addNewDocument}>
      <PlusCircle size={16} />
      <span>{$_('modules.knowledge_base.add_button_new')}</span>
    </button>
    
    <hr class="sub-separator" />

    <h4 class="section-subtitle">{$_('modules.knowledge_base.existing_documents_title')}</h4>
    <div class="knowledge-base-list">
      {#if $knowledgeBaseDocuments.length === 0}
        <p class="placeholder-text">
          <Info size={16} />
          {$_('modules.knowledge_base.no_documents_yet')}
        </p>
      {:else}
        {#each $knowledgeBaseDocuments as doc (doc.id)}
          <div class="document-item">
            <div class="document-info">
              <strong class="document-source">{doc.metadata.source || 'Sem fonte'}</strong>
              <p class="document-content">{doc.pageContent}</p>
            </div>
            <div class="document-actions">
              <button class="button-icon-danger" on:click={() => handleDeleteDocument(doc.id)}>
                <Trash2 size={16} />
              </button>
              </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</CollapsibleSection>

<style>
  /* Adicionei estilos para os novos itens, caso não existam no seu CSS global. */
  /* Se já existirem, pode remover. */
  :global(.document-item) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-radius: 0.375rem;
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    margin-bottom: 8px;
  }
  :global(.document-info) {
    flex-grow: 1;
    margin-right: 12px;
    overflow: hidden;
  }
  :global(.document-source) {
    font-weight: 600;
    color: #1f2937;
    display: block;
  }
  :global(.document-content) {
    font-size: 0.8rem;
    color: #6b7280;
    margin: 2px 0 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.document-actions) {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
</style>