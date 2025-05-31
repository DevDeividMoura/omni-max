/**
 * src/ai/providers/AnthropicProvider.ts
 */
import type { AIiProvider, AIRequestOptions } from '../AIiProvider';
import { ChatAnthropic } from "@langchain/anthropic"; // Verifique o pacote correto se mudou
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { AiCredentials } from '../../storage/stores';


export class AnthropicProvider implements AIiProvider {
  readonly credentialKey: keyof AiCredentials = 'anthropicApiKey';
  async generateSummary(text: string, customSummaryPrompt: string, options: AIRequestOptions): Promise<string> {
    if (!options.apiKey) throw new Error('Anthropic API key is missing.');
    // ... (validações de texto e prompt) ...

    const llm = new ChatAnthropic({
      anthropicApiKey: options.apiKey,
      modelName: options.model, // ex: "claude-3-opus-20240229"
      // temperature: 0.3,
    });

    // Anthropic prefere prompts que claramente separam a entrada do usuário e a instrução.
    // O prompt do Claude geralmente é melhor formatado com "\n\nHuman:" e "\n\nAssistant:"
    // Para resumo, pode ser mais simples:
    const fullPrompt = `${customSummaryPrompt}\n\nHuman: Por favor, resuma o seguinte texto:\n<text_to_summarize>${text}</text_to_summarize>\n\nAssistant:`;
    const promptTemplate = PromptTemplate.fromTemplate(fullPrompt);
    const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

    try {
      const summary = await chain.invoke({});
      return summary;
    } catch (error: any) {
      console.error("Omni Max [AnthropicProvider via LangChain]: Erro:", error);
      throw new Error(`Anthropic API Error: ${error.message || 'Unknown error'}`);
    }
  }

  async listModels(options: Pick<AIRequestOptions, 'apiKey'>): Promise<string[]> {
    if (!options.apiKey) {
      console.warn("Anthropic API key needed to fetch models, returning defaults.");
      return [
        "claude-opus-4-20250514",
        "claude-3-7-sonnet-20250219",
        "claude-3-5-haiku-20241022",
        "claude-3-5-sonnet-20240620",
        "claude-3-sonnet-20240229"
      ].sort();
    }
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': options.apiKey,
          'anthropic-version': '2023-06-01'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [AnthropicProvider]: Error listing models:", response.status, errorData);
        throw new Error(`Failed to list Anthropic models: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract model IDs from the response
      const models = data.data.map((model: any) => model.id);
      
      // TODO: Handle pagination if needed (data.has_more, data.first_id, data.last_id)
      if (data.has_more) {
        console.warn("Omni Max [AnthropicProvider]: More models available but pagination not implemented");
      }
      
      return models.sort();
    } catch (error) {
      console.error("Omni Max [AnthropicProvider]: Exception when listing models:", error);
      // Fallback to a default list in case of error
      return [
        "claude-opus-4-20250514",
        "claude-3-7-sonnet-20250219",
        "claude-3-5-haiku-20241022",
        "claude-3-5-sonnet-20240620",
        "claude-3-sonnet-20240229"
      ].sort();
    }
  }
}