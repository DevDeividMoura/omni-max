import { get } from 'svelte/store'; // Ensure get is imported
import { aiCredentialsStore, aiProviderConfigStore, promptsStore } from '../storage/stores';
import type { AIiProvider, AIRequestOptions } from './AIiProvider';
import { OpenAiProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { OllamaProvider } from './providers/OllamaProvider';

const providerRegistry: Record<string, AIiProvider> = {
    openai: new OpenAiProvider(),
    gemini: new GeminiProvider(),
    anthropic: new AnthropicProvider(),
    ollama: new OllamaProvider(),
};

export class AIServiceManager {

    private async loadProvider(): Promise<AIiProvider> {
        const config = await get(aiProviderConfigStore); // Use get from svelte/store
        const providerKey = config.provider?.toLowerCase(); // Handle potential undefined provider
        if (!providerKey) throw new Error("Provedor de IA não configurado.");
        
        const p = providerRegistry[providerKey];
        if (!p) throw new Error(`Provedor ${config.provider} não encontrado.`);
        return p;
    }

    private async buildOptions(providerInstance: AIiProvider): Promise<AIRequestOptions> {
        const creds = await get(aiCredentialsStore);
        const cfg = await get(aiProviderConfigStore);
    
        const opts: AIRequestOptions = { model: cfg.model };
        const keyName = providerInstance.credentialKey; // Use providerInstance passed as arg
        const urlName = providerInstance.urlKey;      // Use providerInstance passed as arg
    
        if (urlName && creds[urlName]) {
            opts.baseUrl = creds[urlName] as string;
        } else if (keyName && creds[keyName]) { // Check if keyName itself is defined before accessing creds[keyName]
            opts.apiKey = creds[keyName] as string;
        } else {
            // This error will be caught by refreshModelList and set as modelError
            const credentialType = urlName ? "URL Base" : "Chave API";
            throw new Error(`Credenciais (${credentialType}) ausentes para o provedor ${cfg.provider}.`);
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
        // Pass only necessary parts of options, buildOptions will internally get provider details
        const optionsForListing = await this.buildOptions(provider).catch(err => {
            // If buildOptions throws (e.g. missing credentials for model selection itself),
            // re-throw to be caught by OmniMaxPopup's refreshModelList
            console.error("AIServiceManager: Error building options for listModels:", err.message);
            throw err; // Crucial to propagate the error
        });

        return provider.listModels({
            apiKey: optionsForListing.apiKey,
            baseUrl: optionsForListing.baseUrl,
        });
    }
}