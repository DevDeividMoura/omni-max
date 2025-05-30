/**
 * src/ai/AiServiceManager.ts
 * Ponto central para interagir com os serviços de IA.
 * Utiliza o padrão Strategy para selecionar e delegar tarefas ao provedor de IA
 * configurado pelo usuário, obtendo configurações através do SettingsService.
 */
import { get } from 'svelte/store';
import {
  aiCredentialsStore,
  aiProviderConfigStore,
  promptsStore,
} from '../storage/stores';
import type { AIiProvider, AIRequestOptions } from './AIiProvider';
import { OpenAiProvider } from './providers/OpenAIProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GeminiProvider } from './providers/GeminiProvider';

// Registry for new providers (OCP)
const providerRegistry: Record<string, new () => AIiProvider> = {
  openai: OpenAiProvider,
  gemini: GeminiProvider,
  anthropic: AnthropicProvider,
  ollama: OllamaProvider,
};

export class AIServiceManager {
  private activeProvider: AIiProvider | null = null;
  private cachedProviderName: string | null = null;

  private async getProviderConfig() {
    return get(aiProviderConfigStore);
  }
  private async getCredentials() {
    return get(aiCredentialsStore);
  }
  private async getPrompts() {
    return get(promptsStore);
  }

  private async getProviderInstance(): Promise<AIiProvider> {
    const cfg = await this.getProviderConfig();
    const name = cfg.provider.toLowerCase();
    if (this.activeProvider && this.cachedProviderName === name) {
      return this.activeProvider;
    }
    const ProviderClass = providerRegistry[name];
    if (!ProviderClass) throw new Error(`AI provider not supported: ${cfg.provider}`);
    this.activeProvider = new ProviderClass();
    this.cachedProviderName = name;
    return this.activeProvider;
  }

  public async generateSummary(text: string): Promise<string> {
    const [creds, cfg, prompts] = await Promise.all([
      this.getCredentials(),
      this.getProviderConfig(),
      this.getPrompts(),
    ]);

    const opts: AIRequestOptions = { model: cfg.model, apiKey: creds.openaiApiKey ?? '' };
    if (!opts.apiKey) throw new Error('API key not configured');

    const provider = await this.getProviderInstance();
    return provider.generateSummary(text, prompts.summaryPrompt, opts);
  }

  // Future methods (improveText, generateChatResponse) would follow same pattern.
}