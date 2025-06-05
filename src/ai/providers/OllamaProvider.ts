/**
 * src/ai/providers/OllamaProvider.ts
 */
import type { AIiProvider, AIRequestOptions } from '../AIiProvider';
import { ChatOllama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export class OllamaProvider implements AIiProvider {
  readonly credentialKey = 'ollamaBaseUrl';
  readonly urlKey = 'ollamaBaseUrl';

  
  async generateSummary(
    textToSummarize: string,
    customSummaryPrompt: string,
    options: AIRequestOptions 
  ): Promise<string> {
    if (!options.baseUrl) throw new Error('Ollama base URL is missing.');
    if (!textToSummarize.trim()) throw new Error('Text to summarize cannot be empty.');
    if (!customSummaryPrompt.trim()) throw new Error('Summary prompt cannot be empty.');

    const ollama = new ChatOllama({
      baseUrl: options.baseUrl,
      model: options.model,
      // temperature: 0.3, // Ollama também suporta temperatura
    });

    const fullPrompt = `${customSummaryPrompt}\n\nTEXTO A SER RESUMIDO:\n"""\n${textToSummarize}\n"""\n\nRESUMO CONCISO:`;
    const promptTemplate = PromptTemplate.fromTemplate(fullPrompt);
    const chain = promptTemplate.pipe(ollama).pipe(new StringOutputParser());

    try {
      const summary = await chain.invoke({});
      console.log("Omni Max [OllamaProvider via LangChain]: Resumo recebido");
      return summary;
    } catch (error: any) {
      console.error("Omni Max [OllamaProvider via LangChain]: Erro:", error);
      // Langchain/community ChatOllama pode já formatar o erro de forma útil
      throw new Error(`Ollama API Error: ${error.message || 'Unknown error communicating with Ollama'}`);
    }
  }

  async listModels(options: Pick<AIRequestOptions, 'baseUrl'>): Promise<string[]> {
    if (!options.baseUrl) {
      console.warn("Ollama base URL is missing. Cannot fetch models.");
      return [];
    }
    try {
      // O endpoint para listar modelos no Ollama é /api/tags
      const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/api/tags`);
      if (!response.ok) {
        console.error(`Omni Max [OllamaProvider]: Erro ao listar modelos Ollama: ${response.status} ${response.statusText}`);
        return []; // Retorna vazio em caso de erro de API
      }
      const data = await response.json();
      // A resposta é como { models: [ { name: "mistral:latest", ... }, ... ] }
      return data.models.map((model: any) => model.name).sort() || [];
    } catch (error) {
      console.error("Omni Max [OllamaProvider]: Exceção ao listar modelos Ollama:", error);
      return []; // Retorna vazio em caso de erro de fetch ou parse
    }
  }
}