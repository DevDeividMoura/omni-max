<script lang="ts">
  export let enabled: boolean = false;
  export let label: string = "";
  export let disabled: boolean = false; // NOVA PROPRIEDADE
  export let onChange: (newEnabledState: boolean) => void = () => {};

  const handleClick = () => {
    if (disabled) return; // Não faz nada se estiver desabilitado
    enabled = !enabled;
    onChange(enabled);
  };
</script>

<div class="toggle-container" class:disabled>
  {#if label}
    <span class="toggle-label-text">{label}</span>
  {/if}
  <button
    on:click={handleClick}
    class:enabled
    class="toggle-button"
    role="switch"
    aria-checked={enabled}
    aria-label={label || "Toggle"}
    {disabled}
  >
    <span class="toggle-knob"></span>
  </button>
</div>

<style>
  .toggle-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px; /* Espaço entre label e botão, se houver label */
  }
  .toggle-container.disabled {
    opacity: 0.6; /* Exemplo de estilo para container desabilitado */
    cursor: not-allowed;
  }
  .toggle-label-text {
    font-size: 0.9rem;
    color: #374151; /* gray-700 */
    user-select: none;
  }
  .toggle-button {
    position: relative;
    display: inline-flex;
    height: 24px; /* h-6 */
    width: 44px; /* w-11 */
    align-items: center;
    border-radius: 9999px; /* rounded-full */
    transition-property: background-color;
    transition-duration: 0.2s;
    transition-timing-function: ease-in-out;
    border: none;
    padding: 0;
    cursor: pointer;
    background-color: #d1d5db; /* bg-gray-300 default */
  }
  .toggle-button:focus {
    outline: 2px solid transparent;
    outline-offset: 2px;
    /* Ajustar a cor do anel de foco para combinar ou ser neutra */
    box-shadow: 0 0 0 2px rgba(169, 39, 111, 0.5); /* Foco usando a nova cor principal com opacidade */
  }
  .toggle-button.enabled {
    background-color: #a9276f; /* bg-blue-600 */
  }
  .toggle-button:disabled {
    /* Estilo para o botão quando o atributo disabled está presente */
    background-color: #e5e7eb; /* Um cinza mais claro ainda */
    cursor: not-allowed;
  }
  .toggle-button:disabled .toggle-knob {
    background-color: #f3f4f6;
  }
  .toggle-button.enabled:disabled {
    /* Se estiver enabled E disabled (raro, mas para consistência) */
    background-color: #93c5fd; /* Um azul mais claro e desbotado */
  }
  .toggle-knob {
    display: inline-block;
    height: 18px; /* h-4 */
    width: 18px; /* w-4 */
    transform: translateX(3px); /* translate-x-1 */
    border-radius: 9999px; /* rounded-full */
    background-color: white;
    transition-property: transform;
    transition-duration: 0.2s;
    transition-timing-function: ease-in-out;
    pointer-events: none;
  }
  .toggle-button.enabled .toggle-knob {
    transform: translateX(
      23px
    ); /* translate-x-6 (44px width - 18px knob - 3px padding = 23px) */
  }
</style>
