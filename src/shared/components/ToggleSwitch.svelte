<script lang="ts">
  /**
   * ToggleSwitch.svelte
   * A reusable toggle switch component.
   * It visually represents an on/off state and can be interacted with
   * to change that state. Supports a label, a disabled state, and an explicit aria-label.
   *
   * @component
   * @example
   * <ToggleSwitch bind:enabled={isFeatureActive} label="Enable Feature" />
   * <ToggleSwitch enabled={true} disabled={true} label="Always On (Disabled)" aria-label="Special Toggle" />
   */

  /**
   * The current state of the toggle switch.
   * `true` for enabled/on, `false` for disabled/off.
   * Can be bound for two-way data binding.
   */
  export let enabled: boolean = false;

  /** Optional text label displayed next to the toggle switch. If provided, it's used for `aria-labelledby`. */
  export let label: string = "";

  /**
   * If `true`, the toggle switch is non-interactive and visually styled as disabled.
   * Defaults to `false`.
   */
  export let disabled: boolean = false;

  /**
   * Explicitly sets the `aria-label` for the toggle button.
   * Useful if the `label` prop is not provided or if a more descriptive label is needed for accessibility.
   * If not provided and `label` is also not provided, a default "Toggle" will be used.
   */
  export let ariaLabel: string | undefined = undefined; // Renamed to avoid conflict with HTML attribute naming conventions in JS/TS

  /**
   * Callback function invoked when the toggle state changes due to user interaction.
   * Receives the new enabled state as its argument.
   * @param {boolean} newEnabledState The new state of the toggle.
   */
  export let onChange: (newEnabledState: boolean) => void = () => {};

  /**
   * Handles the click event on the toggle button.
   * Toggles the `enabled` state and calls the `onChange` callback
   * if the switch is not disabled.
   * @private
   */
  function handleClick(): void {
    if (disabled) return;
    enabled = !enabled;
    onChange(enabled);
  }

  // Reactive declaration for the final aria-label to be used by the button
  $: finalAriaLabel = ariaLabel || label || "Toggle";
  $: labelId = label ? "toggle-label-" + label.toLowerCase().replace(/\s+/g, '-') : undefined;
</script>

<div class="toggle-container" class:disabled title={disabled ? 'Este controle está desabilitado' : label || finalAriaLabel}>
  {#if label}
    <span class="toggle-label-text" id={labelId}>
      {label}
    </span>
  {/if}
  <button
    on:click={handleClick}
    class:enabled
    class="toggle-button"
    role="switch"
    aria-checked={enabled}
    aria-labelledby={labelId}
    aria-label={!labelId ? finalAriaLabel : undefined} {disabled}
  >
    <span class="toggle-knob" aria-hidden="true"></span>
  </button>
</div>

<style>
  .toggle-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .toggle-container.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .toggle-label-text {
    font-size: 0.9rem;
    color: #374151;
    user-select: none;
    cursor: default;
  }
  .toggle-button {
    position: relative;
    display: inline-flex;
    height: 24px;
    width: 44px;
    align-items: center;
    border-radius: 9999px;
    transition: background-color 0.2s ease-in-out;
    border: none;
    padding: 0;
    cursor: pointer;
    background-color: #d1d5db;
    flex-shrink: 0;
  }
  .toggle-button:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(169, 39, 111, 0.5);
  }
  .toggle-button.enabled {
    background-color: #a9276f;
  }
  .toggle-button[disabled] {
    background-color: #e5e7eb;
    cursor: not-allowed;
  }
  .toggle-button[disabled] .toggle-knob {
    background-color: #f3f4f6;
  }
  .toggle-knob {
    display: inline-block;
    height: 18px;
    width: 18px;
    transform: translateX(3px);
    border-radius: 9999px;
    background-color: white;
    transition: transform 0.2s ease-in-out;
    pointer-events: none;
  }
  .toggle-button.enabled .toggle-knob {
    transform: translateX(23px);
  }
</style>