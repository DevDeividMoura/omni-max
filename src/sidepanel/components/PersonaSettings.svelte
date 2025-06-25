<script lang="ts">
  /**
   * PersonaSettings.svelte (Fully Reactive)
   *
   * Renders the UI for managing AI Personas. Users can add, edit, and delete personas.
   * Consumes a strongly typed context from the parent, ensuring full type safety.
   *
   * @component
   */
  import { getContext } from 'svelte';
  import { _ } from 'svelte-i18n';
  import CollapsibleSection from '../../shared/components/CollapsibleSection.svelte';
  import { Users, PlusCircle, Info, Pencil, Trash2 } from 'lucide-svelte';
  import type { SettingsContextType } from '../SettingsSidepanel.svelte';

  // Destrutura as stores e funções necessárias do contexto com tipagem forte.
  const {
    localOpenSectionsStore,
    toggleSectionCollapse,
    personasStore,
    addNewPersona,
    editPersona,
    deletePersona
  } = getContext<SettingsContextType>('settings');
</script>

<CollapsibleSection
  title={$_('sidepanel.personas.title')}
  icon={Users}
  isOpen={$localOpenSectionsStore.personas}
  onToggle={() => toggleSectionCollapse('personas')}
>
  <div class="section-item-space">
    <button class="add-item-button" on:click={addNewPersona}>
      <PlusCircle size={16} />
      <span>{$_('sidepanel.personas.add_button')}</span>
    </button>

    <hr class="sub-separator" />

    {#if $personasStore.length === 0}
      <p class="placeholder-text">
        <Info size={16} class="placeholder-icon" />
        {$_('sidepanel.personas.no_personas_yet')}
      </p>
    {:else}
      {#each $personasStore as persona (persona.id)}
        <div class="persona-item">
          <div class="persona-info">
            <strong class="persona-name">{persona.name}</strong>
            <p class="persona-description" title={persona.description}>
              {persona.description}
            </p>
          </div>
          <div class="persona-actions">
            <button class="button-icon" on:click={() => editPersona(persona)} title={$_('sidepanel.personas.edit_button_title')}>
              <Pencil size={16} />
            </button>
            <button class="button-icon-danger" on:click={() => deletePersona(persona.id)} title={$_('sidepanel.personas.delete_button_title')}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</CollapsibleSection>