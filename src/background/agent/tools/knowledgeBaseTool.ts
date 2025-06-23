/**
 * @file src/background/agent/tools/knowledgeBaseTool.ts
 * @description Defines the tool that allows the agent to search the local
 * knowledge base (IndexedDBVectorStore) for relevant context.
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai"; // Usaremos a implementação direta do LangChain aqui
import { IndexedDBVectorStore } from "../../services/vector_storage/IndexedDBVectorStore";
import { get } from "svelte/store";
import { aiProviderConfigStore, aiCredentialsStore } from "../../../storage/stores";

// Define o esquema de entrada para a ferramenta usando Zod.
const knowledgeBaseSearchSchema = z.object({
  query: z.string().describe("The user's question or topic to search for in the knowledge base."),
});

// Cria a ferramenta usando a função 'tool' do LangChain.
export const knowledgeBaseSearchTool = tool(
  async ({ query }: z.infer<typeof knowledgeBaseSearchSchema>): Promise<string> => {
    console.log(`[KnowledgeBaseTool] Searching for query: "${query}"`);

    try {
      // 1. Pega as configurações atuais do usuário.
      const providerConfig = get(aiProviderConfigStore);
      const credentials = get(aiCredentialsStore);
      const openAIApiKey = credentials.openaiApiKey;

      if (!openAIApiKey) {
        return "Error: OpenAI API Key is not configured. Cannot create embeddings to search the knowledge base.";
      }
      
      // 2. Instancia o modelo de embedding correto.
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey,
        modelName: providerConfig.embeddingModel,
      });

      // 3. Instancia nosso VectorStore, passando o embedding para ele.
      const vectorStore = new IndexedDBVectorStore(embeddings, { dbName: 'omnimax-rag-db' });

      // 4. Realiza a busca por similaridade.
      // O 'k: 3' significa que pegaremos os 3 documentos mais relevantes.
      const results = await vectorStore.similaritySearch(query, 3);

      if (results.length === 0) {
        return "No relevant information found in the knowledge base for this query.";
      }

      // 5. Formata os resultados em um único bloco de texto para o agente.
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