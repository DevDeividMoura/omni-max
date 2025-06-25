<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Plug, RefreshCw, Trash2 } from 'lucide-svelte';
  import type { Translator } from '../../../i18n/translator.content';

  // --- Props & Events ---
  export let isOpen: boolean;
  export let onClose: () => void;
  export let translator: Translator;

  // --- Type Definitions ---
  interface MCPServer {
    id: string;
    name: string;
    type: 'stdio' | 'http' | 'websocket';
    url: string;
    status: 'online' | 'offline';
    tools: string[];
  }

  // --- Translations ---
  let t: (key: string) => Promise<string>;
  let translations = {
    title: "...", close_button_title: "...", tab_connect: "...", tab_my_mcps: "...",
    form_name_label: "...", form_type_label: "...", form_command_label: "...",
    form_name_placeholder: "...", form_command_placeholder: "...", button_cancel: "...",
    button_confirm: "...", empty_list_message: "...", reload_button_title: "...",
    delete_button_title: "...", tools_label: "...", command_label: "..."
  };

  onMount(async () => {
    t = (key) => translator.t(`assistant.mcp_popup.${key}`);
    
    // Preload all translations
    translations = {
      title: await t("title"),
      close_button_title: await t("close_button_title"),
      tab_connect: await t("tab_connect"),
      tab_my_mcps: await t("tab_my_mcps"),
      form_name_label: await t("form_name_label"),
      form_type_label: await t("form_type_label"),
      form_command_label: await t("form_command_label"),
      form_name_placeholder: await t("form_name_placeholder"),
      form_command_placeholder: await t("form_command_placeholder"),
      button_cancel: await t("button_cancel"),
      button_confirm: await t("button_confirm"),
      empty_list_message: await t("empty_list_message"),
      reload_button_title: await t("reload_button_title"),
      delete_button_title: await t("delete_button_title"),
      tools_label: await t("tools_label"),
      command_label: await t("command_label")
    };
  });

  // --- Local State (Mocked Data) ---
  let activeTab: 'connect' | 'my-mcps' = 'connect';
  let newServer = { name: '', type: 'stdio' as MCPServer['type'], url: '' };
  let myMCPs: MCPServer[] = [
    {
      id: '1', name: 'Linear', type: 'stdio',
      url: 'npx -y linear-mcp-server --tools=all --api-k...', status: 'online',
      tools: ['linear_create_issue', 'linear_update_issue', 'linear_search_issues']
    },
    {
      id: '2', name: 'Stripe', type: 'http', url: 'https://mcp.stripe.com/v1',
      status: 'offline', tools: ['stripe_create_payment', 'stripe_refund_payment']
    }
  ];

  // --- Mock Functions ---
  function handleAddServer() {
    if (!newServer.name || !newServer.url) return;
    const serverToAdd: MCPServer = {
      id: Date.now().toString(), ...newServer, status: 'offline', tools: []
    };
    myMCPs = [...myMCPs, serverToAdd];
    newServer = { name: '', type: 'stdio', url: '' };
    activeTab = 'my-mcps';
  }

  function handleDeleteServer(id: string) {
    myMCPs = myMCPs.filter(server => server.id !== id);
  }

  function handleReloadServer(id: string) {
    myMCPs = myMCPs.map(server => 
      server.id === id ? { ...server, status: server.status === 'online' ? 'offline' : 'online' } : server
    );
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="mcp-overlay" on:click={onClose}>
    <div class="mcp-wrapper" on:click|stopPropagation>
      
      <div class="mcp-header">
        <h2 class="mcp-title">{translations.title}</h2>
        <button class="mcp-close-button" on:click={onClose} title={translations.close_button_title}>
          <X size={20} />
        </button>
      </div>

      <div class="mcp-content">
        <div class="tabs-list">
          <button class="tab-trigger" class:active={activeTab === 'connect'} on:click={() => activeTab = 'connect'}>
            {translations.tab_connect}
          </button>
          <button class="tab-trigger" class:active={activeTab === 'my-mcps'} on:click={() => activeTab = 'my-mcps'}>
            {translations.tab_my_mcps}
          </button>
        </div>

        <div class="tab-content">
          {#if activeTab === 'connect'}
            <div class="form-container">
              <div class="form-grid">
                <div class="form-group">
                  <label for="mcp-name">{translations.form_name_label} <span class="required">*</span></label>
                  <input type="text" id="mcp-name" placeholder={translations.form_name_placeholder} bind:value={newServer.name} />
                </div>
                <div class="form-group">
                  <label for="mcp-type">{translations.form_type_label} <span class="required">*</span></label>
                  <select id="mcp-type" bind:value={newServer.type}>
                    <option value="stdio">stdio</option>
                    <option value="http">http</option>
                    <option value="websocket">websocket</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="mcp-url">{translations.form_command_label} <span class="required">*</span></label>
                <input type="text" id="mcp-url" placeholder={translations.form_command_placeholder} bind:value={newServer.url} />
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" on:click={onClose}>{translations.button_cancel}</button>
                <button class="btn btn-primary" on:click={handleAddServer}>{translations.button_confirm}</button>
              </div>
            </div>
          {:else if activeTab === 'my-mcps'}
            <div class="mcp-list">
              {#if myMCPs.length === 0}
                <p style="text-align: center; color: #6b7280; padding-top: 24px;">{translations.empty_list_message}</p>
              {:else}
                {#each myMCPs as server (server.id)}
                  <div class="mcp-item">
                    <div class="mcp-item-header">
                      <div class="mcp-item-info">
                        <span class="status-dot" class:online={server.status === 'online'} title={server.status}></span>
                        <span class="mcp-item-name">{server.name}</span>
                        <span class="mcp-item-type">{server.type}</span>
                      </div>
                      <div class="mcp-item-actions">
                        <button on:click={() => handleReloadServer(server.id)} title={translations.reload_button_title}>
                          <RefreshCw size={16} />
                        </button>
                         <button on:click={() => handleDeleteServer(server.id)} title={translations.delete_button_title}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div class="mcp-item-body">
                      <!-- svelte-ignore a11y_label_has_associated_control -->
                      <label>{translations.command_label || 'Command'}</label>
                      <div class="command-block"><code>{server.url}</code></div>
                      
                      {#if server.tools.length > 0}
                        <div class="tools-section">
                          <label><Plug size={14} /> {translations.tools_label}</label>
                          <div class="tools-list">
                            {#each server.tools as tool}
                              <span class="tool-badge">{tool}</span>
                            {/each}
                          </div>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}