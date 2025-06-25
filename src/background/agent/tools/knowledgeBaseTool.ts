/**
 * @file src/background/agent/tools/knowledgeBaseTool.ts
 * @description Defines the tool that allows the agent to search the local
 * knowledge base (IndexedDBVectorStore) for relevant context.
 * This version is refactored to be provider-agnostic.
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { Document } from "@langchain/core/documents";
import { get } from "svelte/store";
import { aiProviderConfigStore, aiCredentialsStore } from "../../../storage/stores";
import { IndexedDBVectorStore } from "../../services/IndexedDBVectorStore";

// CORREÇÃO 1: Importar nossa factory e os metadados dos provedores.
import { createEmbeddingsInstance } from '../../services/embedding';
import { PROVIDER_METADATA_MAP } from "../../../shared/providerMetadata";

// O esquema Zod permanece o mesmo.
const knowledgeBaseSearchSchema = z.object({
  query: z.string().describe("The user's question or topic to search for in the knowledge base."),
});

// A definição da ferramenta agora usa a factory.
export const knowledgeBaseSearchTool = tool(
  async ({ query }: z.infer<typeof knowledgeBaseSearchSchema>): Promise<string> => {
    console.log(`[KnowledgeBaseTool] Searching for query: "${query}"`);

    try {
      // 1. Pega as configurações atuais do usuário.
      const providerConfig = get(aiProviderConfigStore);
      const credentials = get(aiCredentialsStore);
      const providerMeta = PROVIDER_METADATA_MAP.get(providerConfig.provider);

      if (!providerMeta) {
        return `Error: Provider metadata not found for "${providerConfig.provider}"`;
      }
      
      // --- LÓGICA ANTIGA REMOVIDA ---
      // const openAIApiKey = credentials.openaiApiKey;
      // if (!openAIApiKey) { ... }
      // const embeddings = new OpenAIEmbeddings({ ... });
      
      // --- NOVA LÓGICA DINÂMICA ---
      // 2. Extrai as credenciais corretas dinamicamente com base nos metadados.
      const apiKey = providerMeta.apiKeySettings?.credentialKey ? credentials[providerMeta.apiKeySettings.credentialKey] : undefined;
      const baseUrl = providerMeta.baseUrlSettings?.credentialKey ? credentials[providerMeta.baseUrlSettings.credentialKey] : undefined;

      // 3. Usa a nossa factory para criar a instância de embedding correta.
      const embeddings = createEmbeddingsInstance(
        providerConfig.provider,
        providerConfig.embeddingModel,
        apiKey,
        baseUrl
      );
      
      // 4. O resto do código funciona sem alterações.
      const vectorStore = new IndexedDBVectorStore(embeddings, { dbName: 'omnimax-rag-db' });
      const results = await vectorStore.similaritySearch(query, 3);

      if (results.length === 0) {
        return "No relevant information found in the knowledge base for this query.";
      }

      const formattedContext = results.map((doc: Document, index: number) => {
        const source = doc.metadata.source || 'N/A';
        return `--- Context Snippet ${index + 1} (Source: ${source}) ---\n${doc.pageContent}`;
      }).join("\n\n");

      console.log(`[KnowledgeBaseTool] Found ${results.length} relevant documents.`);
      return `[START OF CONTEXT FROM KNOWLEDGE BASE]\n\n${formattedContext}\n\n[END OF CONTEXT]`;

    } catch (error: any) {
      console.error("[KnowledgeBaseTool] Error during search:", error);
      return `Error searching knowledge base: ${error.message}`;
    }
  },
  {
    name: "knowledge_base_search",
    description: "Searches the local knowledge base for documents relevant to a query. Use this to answer questions about specific internal procedures, product information, or saved notes.",
    schema: knowledgeBaseSearchSchema,
  }
);