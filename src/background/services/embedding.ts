/**
 * @file src/background/services/embedding.ts
 * @description Central service for creating embedding model instances using a factory pattern.
 */

import { type Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { OllamaEmbeddings } from "@langchain/ollama";


/**
 * @description Registry de fábricas de modelos de Embedding.
 * Mapeia um provider_id para uma função que cria a instância de Embedding.
 */
const embeddingsFactoryRegistry: Record<string, (config: { apiKey?: string; baseUrl?: string; modelName: string }) => Embeddings> = {
  'openai': (config) => new OpenAIEmbeddings({ openAIApiKey: config.apiKey, modelName: config.modelName }),
  'gemini': (config) => new GoogleGenerativeAIEmbeddings({ apiKey: config.apiKey, modelName: config.modelName }),
  'ollama': (config) => new OllamaEmbeddings({ baseUrl: config.baseUrl, model: config.modelName }),
  // Adicione aqui outros provedores de embedding, como 'anthropic' ou 'ollama', quando precisar.
};

/**
 * @description Cria a instância de Embedding dinamicamente com base na configuração.
 * @export
 */
export function createEmbeddingsInstance(provider: string, modelName: string, apiKey?: string, baseUrl?: string): Embeddings {
  const factory = embeddingsFactoryRegistry[provider];

  if (!factory) {
    throw new Error(`Unsupported provider for embeddings: "${provider}". No factory found in registry.`);
  }
  
  console.log(`[EmbeddingFactory] Creating instance for provider: ${provider}, model: ${modelName}`);
  return factory({ apiKey, baseUrl, modelName });
}