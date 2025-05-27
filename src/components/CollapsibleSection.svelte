<script lang="ts">
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import type { SvelteComponent, ComponentType } from 'svelte';

  export let title: string;
  export let icon: ComponentType<SvelteComponent> | null = null; // Ícone do Lucide
  export let isOpen: boolean = false; // Controlado pelo pai ou default
  export let onToggle: () => void = () => { isOpen = !isOpen }; // Permite controle externo ou interno
</script>

<div class="collapsible-section">
  <button
    class="section-header"
    on:click={onToggle}
    aria-expanded={isOpen}
    aria-controls="section-content-{title.toLowerCase().replace(/\s+/g, '-')}"
  >
    <div class="title-container">
      {#if icon}
        <svelte:component this={icon} size={18} class="icon" />
      {/if}
      <span class="title-text">{title}</span>
    </div>
    {#if isOpen}
      <ChevronUp size={18} class="chevron" />
    {:else}
      <ChevronDown size={18} class="chevron" />
    {/if}
  </button>
  {#if isOpen}
    <div 
      class="section-content"
      id="section-content-{title.toLowerCase().replace(/\s+/g, '-')}"
    >
      <slot /> </div>
  {/if}
</div>

<style>
  .collapsible-section {
    border: 1px solid #E5E7EB; /* border-gray-200 */
    border-radius: 0.5rem; /* rounded-lg */
    margin-bottom: 0.75rem; /* mb-3 */
    background-color: white;
  }
  .section-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem; /* p-3 */
    text-align: left;
    background-color: transparent;
    border: none;
    cursor: pointer;
    border-radius: 0.5rem 0.5rem 0 0; /* rounded-t-lg */
  }
  .section-header:hover, .section-header:focus-visible {
    background-color: #F9FAFB; /* hover:bg-gray-50, focus:bg-gray-50 */
  }
  .section-header:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px #3B82F6; /* focus:ring-blue-500 - adapt color if needed */
  }
  .title-container {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* gap-2 */
  }

  .title-text {
    font-weight: 500; /* font-medium */
    color: #1F2937; /* text-gray-800 */
  }
  .section-content {
    padding: 0.75rem; /* p-3 */
    border-top: 1px solid #F3F4F6; /* border-t border-gray-100 */
  }
</style>