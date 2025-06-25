<script lang="ts">
  /**
   * PersonaModal.svelte
   *
   * A reusable modal for creating and editing AI personas.
   * It receives a 'persona' object to populate the form and tool metadata.
   * Uses the callback prop pattern for parent communication.
   * This version is updated with <fieldset> and <legend> for improved accessibility.
   *
   * @component
   * @props {boolean} show - Controls the visibility of the modal, two-way bindable.
   * @props {Omit<Persona, 'id'> & { id: string | null }} persona - The persona data object for the form. Two-way bindable.
   * @props {any[]} toolsMetadata - The list of available agent tools to select from.
   * @props {(persona: PersonaDraft) => void} onSave - Callback executed on save.
   * @props {() => void} onCancel - Callback executed on cancel.
   */
  import { _ } from 'svelte-i18n';
  import type { Persona } from '../../../storage';
  import { XCircle } from 'lucide-svelte';

  export let show: boolean = false;
  export let persona: Omit<Persona, 'id'> & { id: string | null };
  export let toolsMetadata: any[] = [];

  type PersonaDraft = Omit<Persona, 'id'> & { id: string | null };
  export let onSave: (persona: PersonaDraft) => void;
  export let onCancel: () => void;

  function handleSave() {
    // Basic validation before calling the parent's save logic
    if (!persona.name.trim() || !persona.prompt.trim()) {
      alert($_('sidepanel.personas.validation_error'));
      return;
    }
    if (onSave) {
      onSave(persona);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" on:click={handleCancel}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>
          {$_(persona.id ? 'sidepanel.personas.modal_title_edit' : 'sidepanel.personas.modal_title_add')}
        </h3>
        <button class="close-button" on:click={handleCancel}>
          <XCircle size={22} />
        </button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label for="personaName">{$_('sidepanel.personas.name_label')}</label>
          <input
            type="text"
            id="personaName"
            class="input-field"
            placeholder={$_('sidepanel.personas.name_placeholder')}
            bind:value={persona.name}
          />
        </div>
        <div class="input-group">
          <label for="personaDescription">{$_('sidepanel.personas.description_label')}</label>
          <input
            type="text"
            id="personaDescription"
            class="input-field"
            placeholder={$_('sidepanel.personas.description_placeholder')}
            bind:value={persona.description}
          />
        </div>
        <div class="input-group">
          <label for="personaPrompt">{$_('sidepanel.personas.prompt_label')}</label>
          <textarea
            id="personaPrompt"
            class="textarea-field"
            rows="6"
            placeholder={$_('sidepanel.personas.prompt_placeholder')}
            bind:value={persona.prompt}
          ></textarea>
        </div>
        
        <fieldset class="input-group">
          <legend class="form-label">{$_('sidepanel.personas.tools_label')}</legend>
          <div class="checkbox-group" style="max-height: 120px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 6px;">
            {#each toolsMetadata as tool (tool.id)}
              <label class="checkbox-label" title={$_(tool.description)}>
                <input
                  type="checkbox"
                  bind:group={persona.tool_names}
                  value={tool.id}
                />
                {$_(tool.name)}
              </label>
            {:else}
               <p class="placeholder-text-small">No tools available.</p>
            {/each}
          </div>
        </fieldset>
        </div>
      <div class="modal-footer">
        <button class="button-secondary" on:click={handleCancel}>
          {$_('sidepanel.buttons.cancel')}
        </button>
        <button class="button-primary" on:click={handleSave}>
          {$_('sidepanel.buttons.save')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Reseta o estilo padrão do fieldset para que ele não tenha bordas */
  fieldset {
    border: none;
    padding: 0;
    margin: 0;
  }

  /* Estilos para os checkboxes e placeholders internos */
  .checkbox-label {
    display: block;
    padding: 4px 2px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  .checkbox-label:hover {
     background-color: #f3f4f6;
  }
  .checkbox-label input {
    margin-right: 8px;
    vertical-align: middle;
  }
   .placeholder-text-small {
    font-size: 0.85em;
    color: #6b7280;
    text-align: center;
    padding: 10px 0;
  }
</style>