// src/ai/AiServiceManager.ts
import { get } from 'svelte/store';
import { aiCredentialsStore, aiProviderConfigStore, promptsStore } from '../storage/stores';
import type { AIiProvider, AIRequestOptions } from './AIiProvider';
import { OpenAiProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { OllamaProvider } from './providers/OllamaProvider';

// Em vez de apenas class, registrem instâncias únicas (podem ser singletons)
const providerRegistry: Record<string, AIiProvider> = {
  openai: new OpenAiProvider(),
  gemini: new GeminiProvider(),
  anthropic: new AnthropicProvider(),
  ollama: new OllamaProvider(),
};

export class AIServiceManager {

  private async loadProvider(): Promise<AIiProvider> {
    const { provider } = await get(aiProviderConfigStore);
    const p = providerRegistry[provider.toLowerCase()];
    if (!p) throw new Error(`Provider ${provider} not found`);
    return p;
  }

  private async buildOptions(provider: AIiProvider): Promise<AIRequestOptions> {
    const creds = await get(aiCredentialsStore);
    const cfg = await get(aiProviderConfigStore);

    // pega dinamicamente a chave/url da store
    const opts: AIRequestOptions = { model: cfg.model };
    const keyName = provider.credentialKey;
    const urlName = provider.urlKey;

    if (urlName && creds[urlName]) {
      opts.baseUrl = creds[urlName] as string;
    } else if (creds[keyName]) {
      opts.apiKey = creds[keyName] as string;
    } else {
      throw new Error(`Missing credentials for provider ${cfg.provider}`);
    }

    return opts;
  }

  public async generateSummary(text: string): Promise<string> {
    const provider = await this.loadProvider();
    const prompts = await get(promptsStore);
    const options = await this.buildOptions(provider);
    return provider.generateSummary(text, prompts.summaryPrompt, options);
  }

  public async listModels(): Promise<string[]> {
    const provider = await this.loadProvider();
    const options = await this.buildOptions(provider);
    // pass only baseUrl/apiKey
    return provider.listModels({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
    });
  }
}
