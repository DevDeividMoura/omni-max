/**
 * src/ai/providers/OpenAiProvider.ts
 */
import type { AIiProvider, AIRequestOptions } from '../AIiProvider';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

import type { AiCredentials } from '../../storage/stores';

export class OpenAiProvider implements AIiProvider {
  readonly credentialKey: keyof AiCredentials = 'openaiApiKey';

  async generateSummary(
    textToSummarize: string,
    customSummaryPrompt: string,
    options: AIRequestOptions
  ): Promise<string> {
    if (!options.apiKey) throw new Error('OpenAI API key is missing.');
    if (!textToSummarize.trim()) throw new Error('Text to summarize cannot be empty.');
    if (!customSummaryPrompt.trim()) throw new Error('Summary prompt cannot be empty.');

    const llm = new ChatOpenAI({
      apiKey: options.apiKey,
      modelName: options.model,
      temperature: 0.3, // Exemplo, pode vir de options ou ser configurável
    });

    const fullPrompt = `${customSummaryPrompt}\n\nTEXTO A SER RESUMIDO:\n"""\n${textToSummarize}\n"""\n\nRESUMO CONCISO:`;
    const promptTemplate = PromptTemplate.fromTemplate(fullPrompt);

    // Usando LCEL (LangChain Expression Language)
    const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

    try {
      const summary = await chain.invoke({}); // O input {text_to_summarize_input} já está no template
      console.log("Omni Max [OpenAiProvider via LangChain]: Resumo recebido");
      return summary;
    } catch (error: any) {
      console.error("Omni Max [OpenAiProvider via LangChain]: Erro:", error);
      throw new Error(`OpenAI API Error: ${error.message || 'Unknown error'}`);
    }
  }

  async listModels(options: Pick<AIRequestOptions, 'apiKey'>): Promise<string[]> {
    if (!options.apiKey) {
      console.warn("OpenAI API key needed to fetch models, returning defaults.");
      // Retornar uma lista de modelos comuns/populares como fallback se a API key não estiver presente
      // ou se a listagem via API for muito complexa/custosa para chamadas frequentes.
      return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
    }
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${options.apiKey}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [OpenAiProvider]: Erro ao listar modelos OpenAI:", response.status, errorData);
        throw new Error(`Failed to list OpenAI models: ${errorData.error?.message || response.statusText}`);
      }
      const data = await response.json();
      // Filtra para incluir apenas modelos que são tipicamente usados para chat/geração (ex: gpt-*)
      // A API de modelos retorna muitos modelos, incluindo embeddings, etc.
      return data.data
        .filter((model: any) => model.id.startsWith('gpt-') && !model.id.includes('instruct') && !model.id.includes('vision'))
        .map((model: any) => model.id)
        .sort();
    } catch (error) {
      console.error("Omni Max [OpenAiProvider]: Exceção ao listar modelos OpenAI:", error);
      // Fallback para uma lista padrão em caso de erro
      return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
    }
  }
}