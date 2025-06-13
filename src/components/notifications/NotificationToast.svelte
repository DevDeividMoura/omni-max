<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { removeNotification } from './notifications';

  /** The unique identifier for this notification toast. */
  export let id: number;
  /** The message text to be displayed. */
  export let message: string;
  /** The visual type of the notification, affecting its color. */
  export let type: 'success' | 'warning' | 'error' = 'success';
  /** The duration in milliseconds before the toast auto-removes. */
  export let duration: number = 3000;

  onMount(() => {
    const timer = setTimeout(() => {
      removeNotification(id);
    }, duration);

    return () => clearTimeout(timer);
  });

  const toastTypeColors = {
    success: '#2ecc71', // Green
    warning: '#f39c12', // Orange
    error: '#e74c3c',   // Red
  };

  $: backgroundColor = toastTypeColors[type] || toastTypeColors.success;
</script>

<div role="status" aria-live="polite" class="sr-only-wrapper">
  <button
    type="button"
    class="toast"
    style:background-color={backgroundColor}
    in:fly={{ y: 20, duration: 300 }}
    out:fade={{ duration: 300 }}
    on:click={() => removeNotification(id)}
  >
    {message}
  </button>
</div>

<style>
  .sr-only-wrapper {
    /* This wrapper should not affect layout */
    display:contents;
  }

  .toast {
    /* Reset button default styles */
    border: none;
    margin: 0;
    padding: 0;
    width: auto;
    overflow: visible;
    background: transparent;
    font: inherit;
    text-align: left;
    
    /* Original toast styles */
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-top: 10px;
    cursor: pointer;
    user-select: none;
    max-width: 350px;
    word-break: break-word;
  }

  /* Add a focus style for keyboard navigation */
  .toast:focus-visible {
    outline: 2px solid #3B82F6;
    outline-offset: 2px;
  }
</style>