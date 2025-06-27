<script lang="ts">
  /**
   * ShortcutSettings.svelte
   *
   * Renders the "Keyboard Shortcuts" section. Allows enabling/disabling all shortcuts
   * and configuring individual shortcuts for specific modules.
   * State and handlers are retrieved from the parent via Svelte's context API.
   *
   * @component
   */
  import { getContext } from 'svelte';
  import { _ } from 'svelte-i18n';
  import CollapsibleSection from '../../shared/components/CollapsibleSection.svelte';
  import ToggleSwitch from '../../shared/components/ToggleSwitch.svelte';
  import { Keyboard, Info } from 'lucide-svelte';
  import type { SettingsContextType } from '../SettingsSidepanel.svelte';

  // Destrutura todas as stores e funções necessárias do contexto com tipagem forte.
  const {
    localOpenSectionsStore,
    toggleSectionCollapse,
    localShortcutsOverallEnabledStore,
    localGlobalEnabledStore,
    markChanged,
    shortcutModules,
    localModuleStatesStore,
    localShortcutKeysStore,
    handleShortcutKeyChange
  } = getContext<SettingsContextType>('settings');

</script>

<CollapsibleSection
  title={$_('modules.shortcuts.title')}
  icon={Keyboard}
  isOpen={$localOpenSectionsStore.shortcuts}
  onToggle={() => toggleSectionCollapse('shortcuts')}
>
  <div class="section-item-space">
    <ToggleSwitch
      label={$_('sidepanel.labels.toggle_module', { values: { moduleName: $_('modules.shortcuts.title') } })}
      enabled={$localShortcutsOverallEnabledStore}
      onChange={(val) => {
        localShortcutsOverallEnabledStore.set(val);
        markChanged();
      }}
      disabled={!$localGlobalEnabledStore}
      ariaLabel={$_('sidepanel.labels.toggle_module', { values: { moduleName: $_('modules.shortcuts.title') } })}
    />
    
    {#if $localShortcutsOverallEnabledStore && $localGlobalEnabledStore}
      {#each shortcutModules as module (module.id)}
        <div class="shortcut-definition-item">
          <span class="shortcut-module-label" title={$_(module.description)}>
            {$_(module.name)}
          </span>
          <div class="shortcut-controls-improved">
            <ToggleSwitch
              enabled={$localModuleStatesStore[module.id]}
              onChange={(val) => {
                localModuleStatesStore.update(currentStates => {
                  currentStates[module.id] = val;
                  return currentStates;
                });
                markChanged();
              }}
              disabled={!$localGlobalEnabledStore || !$localShortcutsOverallEnabledStore}
              ariaLabel={$_('sidepanel.labels.toggle_module', { values: { moduleName: $_(module.name) } })}
            />
            <span class="shortcut-prefix" aria-hidden="true">Ctrl + Shift +</span>
            <input
              type="text"
              class="shortcut-key-input-editable"
              value={$localShortcutKeysStore[module.id] || ''}
              on:input={(event) => handleShortcutKeyChange(module.id, event)}
              maxlength="1"
              placeholder={$_('sidepanel.placeholders.shortcut_key')}
              aria-label={$_('sidepanel.placeholders.shortcut_key_for', { values: { moduleName: $_(module.name) } })}
              disabled={!$localGlobalEnabledStore || !$localShortcutsOverallEnabledStore || !$localModuleStatesStore[module.id]}
            />
          </div>
        </div>
      {/each}
    {:else if !$localGlobalEnabledStore}
      <p class="placeholder-text">
        <Info size={16} class="placeholder-icon" />
        {$_('sidepanel.placeholders.enable_extension_for_shortcuts')}
      </p>
    {:else if !$localShortcutsOverallEnabledStore}
      <p class="placeholder-text">
        <Info size={16} class="placeholder-icon" />
        {$_('sidepanel.placeholders.enable_all_shortcuts')}
      </p>
    {/if}
  </div>
</CollapsibleSection>