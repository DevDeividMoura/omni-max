<script lang="ts">
  /**
   * GeneralSettings.svelte (Fully Reactive)
   *
   * Renders the "General Modules" section of the settings panel.
   * Consumes and updates Svelte stores from context for all state.
   *
   * @component
   */
  import { getContext } from 'svelte';
  import { _ } from 'svelte-i18n';
  import CollapsibleSection from '../../shared/components/CollapsibleSection.svelte';
  import ToggleSwitch from '../../shared/components/ToggleSwitch.svelte';
  import { ListChecks, Info } from 'lucide-svelte';

  import type { SettingsContextType } from '../SettingsSidepanel.svelte';

  // CORREÇÃO 1: Destruturar as STORES e funções necessárias do contexto.
  // Isso torna o código mais limpo e seguro em termos de tipo.
  const {
    localOpenSectionsStore,
    toggleSectionCollapse,
    generalModules,
    localModuleStatesStore,
    markChanged,
    localGlobalEnabledStore
  } = getContext<SettingsContextType>('settings');

</script>

<CollapsibleSection
  title={$_('modules.general.title')}
  icon={ListChecks}
  isOpen={$localOpenSectionsStore.modules}
  onToggle={() => toggleSectionCollapse('modules')}
>
  <div class="section-item-space">
    {#each generalModules as module (module.id)}
      <div class="module-item-container">
        <span class="module-name-with-tooltip" title={$_(module.description)}>
          {$_(module.name)}
        </span>
        <ToggleSwitch
          enabled={$localModuleStatesStore[module.id]}
          onChange={(val) => {
            localModuleStatesStore.update(currentStates => {
              currentStates[module.id] = val;
              return currentStates;
            });
            markChanged();
          }}

          disabled={!$localGlobalEnabledStore}
          ariaLabel={$_('sidepanel.labels.toggle_module', {
            values: { moduleName: $_(module.name) },
          })}
        />
      </div>
    {:else}
      <p class="placeholder-text">
        <Info size={16} class="placeholder-icon" />
        {$_('sidepanel.placeholders.no_general_modules')}
      </p>
    {/each}
  </div>
</CollapsibleSection>