// services/indexedDBCheckpointer.ts
import {
  BaseCheckpointSaver,
  type Checkpoint,
  type CheckpointTuple,
  type CheckpointMetadata,
} from "@langchain/langgraph-checkpoint";
import type { RunnableConfig } from "@langchain/core/runnables";

const DB_NAME = "langgraph-checkpoints";
const STORE_NAME = "checkpoints";

export class IndexedDBCheckpointer extends BaseCheckpointSaver {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    super();
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Usamos um array [thread_id, checkpoint_id] como chave
          db.createObjectStore(STORE_NAME, { keyPath: ["thread_id", "checkpoint_id"] });
        }
      };
      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };
      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const thread_id = config.configurable?.thread_id;
    if (!thread_id) return undefined;

    const db = await this.dbPromise;
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    // Se um checkpoint_id for fornecido, busca ele. Senão, busca o último.
    const key = config.configurable?.checkpoint_id
      ? [thread_id, config.configurable.checkpoint_id]
      : IDBKeyRange.bound([thread_id, ''], [thread_id, '\uffff']);
      
    const request = store.openCursor(key, "prev");

    return new Promise((resolve, reject) => {
      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const record = cursor.value;
          const checkpoint = (await this.serde.loadsTyped(record.checkpoint_type, record.checkpoint)) as Checkpoint;
          const metadata = (await this.serde.loadsTyped(record.metadata_type, record.metadata)) as CheckpointMetadata;

          
          const tuple: CheckpointTuple = {
            config: { configurable: { thread_id, checkpoint_id: record.checkpoint_id } },
            checkpoint,
            metadata,
            parentConfig: record.parent_checkpoint_id 
              ? { configurable: { thread_id, checkpoint_id: record.parent_checkpoint_id } }
              : undefined,
          };
          resolve(tuple);
        } else {
          resolve(undefined);
        }
      };
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    const thread_id = config.configurable?.thread_id;
    if (!thread_id) throw new Error("thread_id é obrigatório");

    const [checkpointType, serializedCheckpoint] = this.serde.dumpsTyped(checkpoint);
    const [metadataType, serializedMetadata] = this.serde.dumpsTyped(metadata);


    const record = {
      thread_id,
      checkpoint_id: checkpoint.id,
      parent_checkpoint_id: config.configurable?.checkpoint_id,
      checkpoint_type: checkpointType,
      checkpoint: serializedCheckpoint,
      metadata_type: metadataType,
      metadata: serializedMetadata,
    };

    const db = await this.dbPromise;
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(record);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve({
        configurable: { thread_id, checkpoint_id: checkpoint.id },
      });
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  }
  
  // Os métodos list e putWrites podem ser implementados se você precisar de
  // funcionalidades mais avançadas como "time travel" ou persistência de escritas parciais.
  // Por enquanto, podemos deixá-los com uma implementação básica.
  async *list(config: RunnableConfig): AsyncGenerator<CheckpointTuple> {
    // Implementação de listagem (se necessário)
  }
  
  async putWrites(config: RunnableConfig, writes: Array<[string, any]>, taskId: string): Promise<void> {
    // Implementação de escrita parcial (se necessário)
  }
}