// src/ai/providers/GroqProvider.ts
import type { AIiProvider, AIRequestOptions } from '../AIiProvider';
import { ChatGroq } from "@langchain/groq";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import type { AiCredentials } from '../../storage/stores';

export class GroqProvider implements AIiProvider {
  readonly credentialKey: keyof AiCredentials = 'groqApiKey';
  // Groq não usa um baseUrl para diferenciar modelos, a API key dá acesso a todos que ela permite.
  // readonly urlKey = undefined; // Não tem um urlKey específico para credenciais.

  /**
   * Generates a summary for a given text using a specific model and prompt via Groq API.
   * @param textToSummarize The text to be summarized.
   * @param systemPrompt The system prompt to guide the summarization.
   * @param options AIRequestOptions including the model name and API key.
   * @returns A Promise that resolves to the summary string.
   * @throws Error if API key or model is missing, or if the API call fails.
   */
  async generateSummary(
    textToSummarize: string,
    systemPrompt: string, // Este será o prompt principal que o usuário pode customizar
    options: AIRequestOptions
  ): Promise<string> {
    if (!options.apiKey) {
      throw new Error('Groq API key is missing.');
    }
    if (!options.model) {
      throw new Error('Groq model is not specified.');
    }
    if (!textToSummarize.trim()) {
      throw new Error('Text to summarize cannot be empty.');
    }
    if (!systemPrompt.trim()) {
      throw new Error('Summary prompt cannot be empty.');
    }

    const llm = new ChatGroq({
      apiKey: options.apiKey,
      model: options.model, // Ex: "llama3-8b-8192", "mixtral-8x7b-32768"
      temperature: options.temperature ?? 0.3, // Default temperature
      // maxTokens: options.maxTokens, // Se quiser controlar
    });

    // O systemPrompt já contém as instruções.
    // O textToSummarize é o "human message" ou o conteúdo principal.
    // Para LangChain, geralmente formatamos como uma sequência de mensagens.
    // System: {systemPrompt}
    // Human: {textToSummarize}
    // A forma como o prompt é construído aqui depende de como seu `systemPrompt` é formulado.
    // Se o `systemPrompt` já espera o texto como parte dele (ex: "Resuma o seguinte texto: {text_to_summarize_input}"),
    // então o invoke é simples. Se não, precisamos montar as mensagens.

    // Assumindo que o systemPrompt é uma instrução geral e textToSummarize é o conteúdo.
    // Vamos usar um formato de mensagens para clareza com o modelo.
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: textToSummarize }
    ];
    
    // Se o seu AIServiceManager já concatena systemPrompt e textToSummarize antes de chamar,
    // e a string resultante é o que você quer passar como entrada única,
    // você pode usar PromptTemplate como nos outros providers:
    // const fullPrompt = `${systemPrompt}\n\nTEXTO A SER RESUMIDO:\n"""\n${textToSummarize}\n"""\n\nRESUMO CONCISO:`;
    // const promptTemplate = PromptTemplate.fromTemplate(fullPrompt);
    // const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());
    // try {
    //   const summary = await chain.invoke({});
    //   return summary;
    // } ...

    // Usando a abordagem de invocar diretamente com mensagens:
    try {
      const response = await llm.invoke(messages);
      const summary = response.content;
      if (typeof summary !== 'string') {
        throw new Error('Unexpected response format from Groq API.');
      }
      // console.log("Omni Max [GroqProvider]: Summary received");
      return summary;
    } catch (error: any) {
      console.error("Omni Max [GroqProvider via LangChain]: Error:", error);
      // Tentar extrair uma mensagem de erro mais útil da resposta da API, se disponível
      const apiErrorMessage = error.response?.data?.error?.message || error.message || 'Unknown error with Groq API';
      throw new Error(`Groq API Error: ${apiErrorMessage}`);
    }
  }

  /**
   * Lists available models from the Groq API.
   * @param options Options containing the API key.
   * @returns A Promise that resolves to an array of model ID strings.
   * @throws Error if API key is missing or if the API call fails.
   */
  async listModels(options: Pick<AIRequestOptions, 'apiKey'>): Promise<string[]> {
    if (!options.apiKey) {
      // Não lançar erro aqui, pois o popup pode querer tentar listar mesmo sem chave
      // para informar o usuário. O erro será lançado se tentar gerar resumo sem chave.
      console.warn("Groq API key is missing. Cannot fetch models from Groq.");
      return [ // Retorna alguns modelos comuns como fallback para UI, ou uma lista vazia.
        "llama3-8b-8192",
        "llama3-70b-8192",
        "mixtral-8x7b-32768",
        "gemma-7b-it",
        "gemma2-9b-it",
      ].sort(); // É melhor retornar vazio e deixar a UI tratar "API Key necessária".
      // return []; 
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error("Omni Max [GroqProvider]: Error listing models from Groq:", response.status, errorData);
        throw new Error(`Failed to list Groq models: ${errorData.error?.message || errorData.message || response.statusText}`);
      }

      const data = await response.json();
      // A API retorna uma lista de objetos, cada um com um campo "id" para o nome do modelo.
      // Filtrar para modelos que suportam chat/completion, se necessário (a documentação sugere quais são para chat)
      // Ex: !model.id.includes('whisper')
      const models = data.data
        .filter((model: any) => model.id && !model.id.startsWith('whisper')) // Exclui modelos Whisper (para áudio)
        .map((model: any) => model.id as string);
      
      return models.sort();
    } catch (error: any) {
      console.error("Omni Max [GroqProvider]: Exception when listing Groq models:", error);
      // Em caso de erro (ex: chave inválida, rede), o AIServiceManager/Popup deve tratar.
      // Lançar o erro permite que a UI mostre uma mensagem apropriada.
      throw error; // Re-lança o erro para ser tratado pelo chamador (AIServiceManager -> Popup)
    }
  }
}