<script lang="ts">
  // import { createEventDispatcher } from 'svelte'; // REMOVIDO
  import { Check } from 'lucide-svelte';
  import type { Persona } from '../../../storage/stores';

  // --- Props ---
  export let isOpen: boolean = false;
  export let personas: Persona[] = [];
  export let selectedPersonaId: string | undefined;

  // CORREÇÃO: Em vez de 'dispatch', recebemos funções de callback como props.
  // Elas são opcionais para evitar erros se não forem passadas.
  export let onSelect: (id: string) => void = () => {};
  export let onClose: () => void = () => {};


  // A função agora chama diretamente a prop 'onSelect'.
  function handleSelect(personaId: string) {
    onSelect(personaId);
  }

  // Handle Escape key to close the popup by calling the 'onClose' prop.
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="persona-popup-overlay" on:click={onClose} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="persona-popup-content" on:click|stopPropagation>
      
      <div class="popup-header">
        <span>Selecionar Persona</span>
      </div>

      <div class="persona-list">
        {#each personas as persona (persona.id)}
          <button class="list-item" on:click={() => handleSelect(persona.id)}  title={persona.description} >
            <div class="item-icon">👤</div>
            <div class="item-text">
              <div class="item-name">{persona.name}</div>
            </div>
            {#if persona.id === selectedPersonaId}
              <div class="item-check">
                <Check size={16} />
              </div>
            {/if}
          </button>
        {/each}
      </div>

    </div>
  </div>
{/if}