<script lang="ts">
  /**
   * CredentialsModal.svelte
   *
   * A reusable modal for managing AI provider credentials. It uses callback props
   * for parent communication and binds to a credentials object prop for two-way data flow.
   *
   * @component
   * @props {boolean} show - Controls the visibility of the modal. Can be two-way bound.
   * @props {ProviderMetadata | undefined} providerMetadata - The metadata for the selected provider.
   * @props {AiCredentials} credentials - The credentials object. Intended for two-way binding.
   * @props {() => void} onConfirm - Callback function executed when the user confirms.
   * @props {() => void} onCancel - Callback function executed when the user cancels.
   */
  import { _ } from 'svelte-i18n';
  import type { AiCredentials } from '../../../storage';
  import type { ProviderMetadata } from '../../../shared/providerMetadata';
  import { Info } from 'lucide-svelte';

  export let show: boolean = false;
  export let providerMetadata: ProviderMetadata | undefined;
  export let credentials: AiCredentials;

  export let onConfirm: () => void;
  export let onCancel: () => void;

  function handleConfirm() {
    if (onConfirm) onConfirm();
  }

  function handleCancel() {
    if (onCancel) onCancel();
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
        <h3 id="credentials-modal-title">
          {$_('sidepanel.modal.credentials_title', {
            values: { providerName: providerMetadata?.displayName || '...' },
          })}
        </h3>
      </div>
      <div class="modal-body">
        {#if providerMetadata}
          {#if providerMetadata.apiKeySettings}
            {@const settings = providerMetadata.apiKeySettings}
            <div class="input-group">
              <label for={settings.credentialKey}>{$_(settings.label)}</label>
              <input
                type={settings.inputType || 'password'}
                id={settings.credentialKey}
                class="input-field"
                bind:value={credentials[settings.credentialKey]}
                placeholder={$_(settings.placeholder) || ''}
                autocomplete="new-password"
              />
            </div>
          {/if}
          {#if providerMetadata.baseUrlSettings}
            {@const settings = providerMetadata.baseUrlSettings}
            <div class="input-group">
              <label for={settings.credentialKey}>{$_(settings.label)}</label>
              <input
                type={settings.inputType || 'text'}
                id={settings.credentialKey}
                class="input-field"
                bind:value={credentials[settings.credentialKey]}
                placeholder={$_(settings.placeholder) || ''}
                autocomplete="off"
              />
            </div>
          {/if}
          {#if providerMetadata.documentationLink}
            <p style="font-size:0.8em; margin-top: 12px; text-align: center;">
              <a href={providerMetadata.documentationLink} target="_blank" rel="noopener noreferrer" style="color: var(--color-primary, #a9276f);">
                {$_('sidepanel.modal.get_credentials_prompt', {
                  values: {
                    credentialLabel: $_(providerMetadata.apiKeySettings?.label || providerMetadata.baseUrlSettings?.label || ''),
                  },
                })}
              </a>
            </p>
          {/if}
          {#if providerMetadata.credentialType === 'none'}
            <p class="placeholder-text">
              {$_('sidepanel.modal.no_credentials_needed')}
            </p>
          {/if}
        {:else}
          <p class="placeholder-text">
            <Info size={16} class="placeholder-icon" />
            {$_('sidepanel.modal.select_valid_provider')}
          </p>
        {/if}
      </div>
      <div class="modal-footer">
        <button class="button-secondary" on:click={handleCancel}>
          {$_('sidepanel.buttons.cancel')}
        </button>
        <button class="button-primary" on:click={handleConfirm}>
          {$_('sidepanel.buttons.ok')}
        </button>
      </div>
    </div>
  </div>
{/if}