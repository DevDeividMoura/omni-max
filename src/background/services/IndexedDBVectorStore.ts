/**
 * @file src/background/services/vector_storage/IndexedDBVectorStore.ts
 * @description A custom vector store implementation using IndexedDB,
 * extending LangChain's VectorStore base class for full compatibility.
 */

import { VectorStore } from "@langchain/core/vectorstores";
import { type Embeddings } from "@langchain/core/embeddings";
import { Document } from "@langchain/core/documents"; // Importar Document
import Dexie, { type Table } from "dexie";

import { cosineSimilarity } from "@langchain/core/utils/math";

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
    const allVectors = await this.vectors.toArray();
    if (allVectors.length === 0) {
      return [];
    }

    // Prepara os dados para a função do LangChain
    const allEmbeddings = allVectors.map(v => v.embedding);
    const queryMatrix = [query]; // Trata nosso vetor de busca como uma matriz de 1 linha

    // Calcula todas as similaridades de uma só vez
    const similarityMatrix = cosineSimilarity(queryMatrix, allEmbeddings);
    const scores = similarityMatrix[0]; // Pega a primeira (e única) linha de resultados

    // Combina os documentos com suas pontuações
    const resultsWithScores = allVectors.map((storedVector, i) => ({
      doc: storedVector,
      score: scores[i],
    }));

    resultsWithScores.sort((a, b) => b.score - a.score);

    const topK = resultsWithScores.slice(0, k);

    return topK.map(result => [
      new Document({ pageContent: result.doc.content, metadata: result.doc.metadata }),
      result.score,
    ]);
  }

  async similaritySearchByVector(query: number[], k: number): Promise<Document[]> {
    const resultsWithScore = await this.similaritySearchVectorWithScore(query, k);
    return resultsWithScore.map((result) => result[0]);
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