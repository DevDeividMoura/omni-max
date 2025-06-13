<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';

  const dispatch = createEventDispatcher();
</script>

<div class="popup-overlay" on:click={() => dispatch('close')} role="presentation">
    <div class="popup-wrapper" style="width: 600px; height: 500px;" on:click|stopPropagation>
         <div class="popup-header">
            <h2 class="header-title" style="font-size: 1.25rem;">MCP Servers</h2>
            <button on:click={() => dispatch('close')} title="Fechar"><X size={20} /></button>
        </div>
        <div class="content-area">
            <p>Gerenciamento de servidores MCP será implementado aqui.</p>
            </div>
    </div>
</div>