<script lang="ts">
  import { getContext } from "svelte";
  import { _ } from "svelte-i18n";
  import CollapsibleSection from "../../shared/components/CollapsibleSection.svelte";
  import ToggleSwitch from "../../shared/components/ToggleSwitch.svelte";
  import { Cpu, Info } from "lucide-svelte";
  import type { SettingsContextType } from "../SettingsSidepanel.svelte";

  const {
    localOpenSectionsStore, toggleSectionCollapse, localAiFeaturesEnabledStore, localGlobalEnabledStore,
    markChanged, chatModelList, embeddingModelList, loadingModels, modelError, localAiProviderConfigStore,
    handleProviderChange, PROVIDER_METADATA_LIST, showCredentialsModal, selectedProviderMetadata,
    aiModules, localModuleStatesStore
  } = getContext<SettingsContextType>('settings');
</script>

<CollapsibleSection
  title={$_("modules.ai.title")}
  icon={Cpu}
  isOpen={$localOpenSectionsStore.ai}
  onToggle={() => toggleSectionCollapse("ai")}
>
  <div class="section-item-space">
    <ToggleSwitch
      label={$_("sidepanel.labels.all_ai_features")}
      bind:enabled={$localAiFeaturesEnabledStore}
      on:change={markChanged}
      disabled={!$localGlobalEnabledStore}
      ariaLabel={$_("sidepanel.labels.all_ai_features")}
    />

    {#if $localAiFeaturesEnabledStore && $localGlobalEnabledStore}
      <div class="input-group">
        <label for="aiProvider">{$_("sidepanel.labels.ai_provider")}</label>
        <select
          id="aiProvider"
          class="select-field"
          bind:value={$localAiProviderConfigStore.provider}
          on:change={handleProviderChange}
        >
          {#each PROVIDER_METADATA_LIST as providerMeta (providerMeta.id)}
            <option value={providerMeta.id}>{providerMeta.displayName}</option>
          {/each}
        </select>
      </div>

      <div class="input-group">
        <label for="aiModel">{$_('sidepanel.labels.model_chat')}</label>
        <select id="aiModel" class="select-field" bind:value={$localAiProviderConfigStore.model} on:change={markChanged} disabled={$loadingModels || $chatModelList.length === 0}>
          {#if $loadingModels}<option value="" disabled>{$_("sidepanel.placeholders.loading_models")}</option>
          {:else if $modelError}<option value="" disabled>{$modelError}</option>
          {:else if $chatModelList.length === 0}<option value="" disabled>{$_("sidepanel.placeholders.no_models_found")}</option>
          {:else}
            <option value="" disabled>{$_("sidepanel.placeholders.select_model")}</option>
            {#each $chatModelList as m}<option value={m}>{m}</option>{/each}
          {/if}
        </select>
        {#if $modelError && !$loadingModels}<p class="sidepanel-error-text">{$modelError}</p>{/if}
      </div>

      <div class="input-group">
        <label for="embeddingModel">{$_('sidepanel.labels.embedding_model')}</label>
        <select id="embeddingModel" class="select-field" bind:value={$localAiProviderConfigStore.embeddingModel} on:change={markChanged} disabled={$loadingModels || $embeddingModelList.length === 0}>
          {#if $loadingModels}<option value="" disabled>{$_("sidepanel.placeholders.loading_models")}</option>
          {:else if $modelError}<option value="" disabled>{$modelError}</option>
          {:else if $embeddingModelList.length === 0}<option value="" disabled>{$_("sidepanel.placeholders.no_models_found")}</option>
          {:else}
            <option value="" disabled>{$_("sidepanel.placeholders.select_model")}</option>
            {#each $embeddingModelList as m}<option value={m}>{m}</option>{/each}
          {/if}
        </select>
      </div>


      <button
        class="button-primary full-width"
        on:click={() => showCredentialsModal.set(true)}
      >
        {$_("sidepanel.buttons.manage_credentials_for", {
          values: {
            providerName:
              selectedProviderMetadata?.displayName ||
              $localAiProviderConfigStore.provider,
          },
        })}
      </button>

      <hr class="sub-separator" />
      <p class="section-subtitle">{$_("sidepanel.labels.individual_ai_modules")}</p>

      {#each aiModules as module (module.id)}
        <div class="module-item-container">
          <span class="module-name-with-tooltip" title={$_(module.description)}
            >{$_(module.name)}</span
          >
          <ToggleSwitch
            enabled={$localModuleStatesStore[module.id]}
            onChange={(val) => {
              localModuleStatesStore.update((states) => ({
                ...states,
                [module.id]: val,
              }));
              markChanged();
            }}
            disabled={!$localGlobalEnabledStore ||
              !$localAiFeaturesEnabledStore}
            ariaLabel={$_("sidepanel.labels.toggle_module", {
              values: { moduleName: $_(module.name) },
            })}
          />
        </div>
      {:else}
        <p class="placeholder-text">
          <Info size={16} class="placeholder-icon" />
          {$_("sidepanel.placeholders.no_ai_modules")}
        </p>
      {/each}
    {:else if !$localGlobalEnabledStore}
      <p class="placeholder-text">
        <Info size={16} class="placeholder-icon" />
        {$_("sidepanel.placeholders.enable_extension_for_ai")}
      </p>
    {:else}
      <p class="placeholder-text">
        <Info size={16} class="placeholder-icon" />
        {$_("sidepanel.placeholders.enable_all_ai")}
      </p>
    {/if}
  </div>
</CollapsibleSection>
