/**
 * @file src/background/services/vector_storage/IndexedDBVectorStore.ts
 * @description A custom vector store implementation using IndexedDB,
 * extending LangChain's VectorStore base class for full compatibility.
 */

import { VectorStore } from "@langchain/core/vectorstores";
import { type Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents"; // Importar Document
import Dexie, { type Table } from "dexie";

/**
 * @interface StoredVector
 * @description Defines the schema for objects stored in our IndexedDB table.
 */
export interface StoredVector {
  id?: number; // Auto-incremented primary key by Dexie
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

// Interface para os argumentos específicos do nosso VectorStore
export interface IndexedDBVectorStoreArgs {
  dbName?: string;
}

/**
 * @class IndexedDBVectorStore
 * @extends {VectorStore}
 * @description A client-side vector store that persists embeddings in the browser's IndexedDB.
 */
export class IndexedDBVectorStore extends VectorStore {
  private db: Dexie;
  public vectors: Table<StoredVector, number>; // Tornando público para facilitar o acesso se necessário
  private readonly dbName: string;

  constructor(embeddings: Embeddings, args: IndexedDBVectorStoreArgs) {
    super(embeddings, args);
    this.embeddings = embeddings;
    this.dbName = args.dbName || 'omnimax-rag-db';
    
    this.db = new Dexie(this.dbName);
    this.db.version(1).stores({
      vectors: '++id, content',
    });
    
    // CORRIGIDO: Inicializa a propriedade 'vectors' aqui.
    this.vectors = this.db.table('vectors');
  }
  
  _vectorstoreType(): string {
    return "indexeddb";
  }

  async addDocuments(documents: Document[]): Promise<void> {
    const texts = documents.map(doc => doc.pageContent);
    if (texts.length === 0) {
        return;
    }
    const embeddings = await this.embeddings.embedDocuments(texts);

    const vectorsToAdd: StoredVector[] = documents.map((doc, i) => ({
      content: doc.pageContent,
      embedding: embeddings[i],
      metadata: doc.metadata,
    }));

    await this.vectors.bulkAdd(vectorsToAdd);
  }

  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    const vectorsToAdd: StoredVector[] = documents.map((doc, i) => ({
      content: doc.pageContent,
      embedding: vectors[i],
      metadata: doc.metadata,
    }));

    await this.vectors.bulkAdd(vectorsToAdd);
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: this["FilterType"]
  ): Promise<[Document, number][]> {
      // TODO: Implementar a lógica de busca e cálculo de score.
      console.warn("similaritySearchVectorWithScore is not fully implemented yet.");
      return [];
  }

  /**
   * CORRIGIDO: Assinatura e implementação do método 'fromTexts' alinhada.
   * Este método de fábrica agora constrói a instância e adiciona os documentos corretamente.
   */
  static async fromTexts(
    texts: string[],
    metadatas: Record<string, any>[] | Record<string, any>,
    embedding: Embeddings,
    dbConfig: IndexedDBVectorStoreArgs,
  ): Promise<IndexedDBVectorStore> {
    const docs: Document[] = [];
    for (let i = 0; i < texts.length; i += 1) {
        const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
        const newDoc = new Document({
            pageContent: texts[i],
            metadata,
        });
        docs.push(newDoc);
    }
    
    const store = new this(embedding, dbConfig);
    await store.addDocuments(docs);
    return store;
  }
}