<script lang="ts">
  /**
   * CollapsibleSection.svelte (Revised)
   * Fixes scrolling issue by using Svelte's `tick()` function to wait for DOM updates
   * and correctly placing `bind:this` on the root element.
   */
  import { onMount, tick } from 'svelte'; // PASSO 1: Importar 'tick'
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import type { SvelteComponent, ComponentType } from 'svelte';

  export let title: string;
  export let icon: ComponentType<SvelteComponent> | null = null;
  export let isOpen: boolean = false;
  export let onToggle: () => void;

  let sectionElement: HTMLDivElement | null = null;
  let isMounted = false;

  onMount(() => {
    isMounted = true;
  });

  // PASSO 2: Substituir a lógica de setTimeout por uma função async com await tick()
  async function scrollIntoViewOnOpen() {
    // Espera o Svelte atualizar o DOM (a seção expandir) antes de continuar.
    await tick();

    if (sectionElement) {
      sectionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }

  // O bloco reativo agora chama a nossa função async.
  $: if (isOpen && isMounted) {
    scrollIntoViewOnOpen();
  }

  const sectionIdSuffix = title.toLowerCase().replace(/\s+/g, '-');
  const contentId = `section-content-${sectionIdSuffix}`;
</script>

<div class="collapsible-section" bind:this={sectionElement}>
  <button
    class="section-header"
    on:click={onToggle}
    aria-expanded={isOpen}
    aria-controls={contentId}
  >
    <div class="title-container">
      {#if icon}
        <svelte:component this={icon} size={18} class="icon" aria-hidden="true" />
      {/if}
      <span class="title-text">{title}</span>
    </div>
    {#if isOpen}
      <ChevronUp size={18} class="chevron" aria-hidden="true" />
    {:else}
      <ChevronDown size={18} class="chevron" aria-hidden="true" />
    {/if}
  </button>
  {#if isOpen}
    <div
      class="section-content"
      id={contentId}
      role="region"
      aria-labelledby={'header-for-' + contentId}
    >
      <slot />
    </div>
  {/if}
</div>

<style>
  .collapsible-section {
    border: 1px solid #E5E7EB;
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
    background-color: white;
    scroll-margin-top: calc(var(--header-height, 60px) + 12px);
  }
  /* O resto do seu CSS permanece o mesmo */
  .section-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    text-align: left;
    background-color: transparent;
    border: none;
    cursor: pointer;
    border-radius: 0.5rem;
  }
  :global(.collapsible-section .section-header:has(+ .section-content)) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .section-header:hover, .section-header:focus-visible {
    background-color: #F9FAFB;
  }
  .section-header:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px #3B82F6;
  }
  .title-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .title-text {
    font-weight: 500;
    color: #1F2937;
  }
  .section-content {
    padding: 0.75rem;
    border-top: 1px solid #F3F4F6;
  }
</style>