<script lang="ts">
  /**
   * CollapsibleSection.svelte
   * A reusable UI component that displays a title and an optional icon,
   * which can be clicked to expand or collapse a content area.
   * The expanded state can be controlled internally or externally via props.
   *
   * @component
   * @example
   * <CollapsibleSection title="My Section" icon={InfoIcon} bind:isOpen={isMySectionOpen}>
   * <p>Some collapsible content here.</p>
   * </CollapsibleSection>
   */
  import { ChevronDown, ChevronUp } from 'lucide-svelte';
  import type { SvelteComponent, ComponentType } from 'svelte';

  /** The title displayed in the section header. */
  export let title: string;

  /** Optional Lucide Svelte icon component to display next to the title. */
  export let icon: ComponentType<SvelteComponent> | null = null;

  /**
   * Controls the open/closed state of the section.
   * Can be bound to a parent component's variable for external control.
   * Defaults to `false` (closed).
   */
  export let isOpen: boolean = false;

  /**
   * Callback function invoked when the section header is clicked.
   * If not provided, a default handler toggles the `isOpen` state internally.
   * This allows for custom toggle logic, such as implementing an accordion effect
   * where only one section can be open at a time.
   */
  export let onToggle: () => void = () => { isOpen = !isOpen; };

  // Generate a unique ID for ARIA attributes based on the title
  const sectionIdSuffix = title.toLowerCase().replace(/\s+/g, '-');
  const contentId = `section-content-${sectionIdSuffix}`;
</script>

<div class="collapsible-section">
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
      aria-labelledby={'header-for-' + contentId} >
      <slot />
    </div>
  {/if}
</div>

<!-- svelte-ignore css-unused-selector -->
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
    border-radius: 0.5rem; /* Apply to all corners if content is not shown, or adjust if section-content has top border */
  }
  /* If section is open, header top corners are rounded, bottom corners are not if content has top border */
  :global(.collapsible-section .section-header:has(+ .section-content)) { /* Check if section-content is present as sibling */
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .section-header:hover, .section-header:focus-visible {
    background-color: #F9FAFB; /* hover:bg-gray-50, focus:bg-gray-50 */
  }
  .section-header:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px #3B82F6; /* focus:ring-blue-500 */
  }
  .title-container {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* gap-2 */
  }
  .icon {
    color: #4B5563; /* gray-600, or make it a prop */
  }
  .title-text {
    font-weight: 500; /* font-medium */
    color: #1F2937; /* text-gray-800 */
  }
  .chevron {
    color: #6B7280; /* gray-500 */
  }
  .section-content {
    padding: 0.75rem; /* p-3 */
    border-top: 1px solid #F3F4F6; /* border-t border-gray-100 */
  }
</style>