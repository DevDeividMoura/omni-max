/**
 * src/ai/providers/GeminiProvider.ts
 */
import type { AIiProvider, AIRequestOptions } from '../AIiProvider';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"; // Ou ChatVertexAI se estiver usando Vertex
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";


export class GeminiProvider implements AIiProvider {
  async generateSummary(text: string, customSummaryPrompt: string, options: AIRequestOptions): Promise<string> {
    if (!options.apiKey) throw new Error('Google Gemini API key is missing.');
    // ... (validações de texto e prompt) ...

    const llm = new ChatGoogleGenerativeAI({
      apiKey: options.apiKey,
      model: options.model, // ex: "gemini-1.5-pro-latest" ou "gemini-pro"
      // temperature: 0.3,
      // safetySettings: [...] // Pode querer configurar safety settings
    });
    
    // O Gemini pode se beneficiar de um prompt claro com papéis, ou um prompt direto para resumo.
    const fullPrompt = `${customSummaryPrompt}\n\nTexto para resumir:\n${text}\n\nResumo:`;
    const promptTemplate = PromptTemplate.fromTemplate(fullPrompt);
    const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

    try {
      const summary = await chain.invoke({});
      return summary;
    } catch (error: any) {
      console.error("Omni Max [GeminiProvider via LangChain]: Erro:", error);
      throw new Error(`Google Gemini API Error: ${error.message || 'Unknown error'}`);
    }
  }

  async listModels(options: Pick<AIRequestOptions, 'apiKey'>): Promise<string[]> {
    if (!options.apiKey) {
      console.warn("Google GenAI API key needed to fetch models, returning defaults.");
      // Retornar uma lista de modelos comuns/populares como fallback se a API key não estiver presente
      // ou se a listagem via API for muito complexa/custosa para chamadas frequentes.
      return ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-lite-preview", "gemini-2.0-pro-exp"];
    }
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?' + new URLSearchParams({ key: options.apiKey }).toString());
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Omni Max [GeminiProvider]: Erro ao listar modelos GenAI:", response.status, errorData);
        throw new Error(`Failed to list GenAI models: ${errorData.error?.message || response.statusText}`);
      }
      const data = await response.json();
      // Filtra para incluir apenas modelos que são tipicamente usados para chat/geração (ex: gpt-*)
      // A API de modelos retorna muitos modelos, incluindo embeddings, etc.
      return data.models
        .filter((model: any) => 
          model.name.includes('gemini') && 
          model.supportedGenerationMethods.includes('generateContent'))
        .map((model: any) => {
          // Extract model ID from the full name (remove "models/" prefix)
          const id = model.name.replace('models/', '');
          return id;
        })
        .sort();
    } catch (error) {
      console.error("Omni Max [GeminiProvider]: Exception when listing Gemini models:", error);
      // Fallback to a default list in case of error
      return ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-lite-preview", "gemini-2.0-pro-exp"];
    }
  }
}