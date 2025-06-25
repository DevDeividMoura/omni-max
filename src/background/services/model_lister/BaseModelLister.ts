/**
 * @file src/background/services/model-lister/providers/BaseModelLister.ts
 * @description Abstract base class for all model lister implementations.
 * Implements the Template Method design pattern.
 */
import type { IModelLister, ModelType } from './IModelLister';
import type { AiCredentials } from '../../../storage/stores';

export abstract class BaseModelLister implements IModelLister {
  // --- Métodos Abstratos (a serem implementados pelas classes filhas) ---

  /** O ID do provedor (ex: 'openai') para mensagens de erro. */
  protected abstract providerId: string;
  
  /** O nome da credencial necessária (ex: 'OpenAI API Key'). */
  protected abstract credentialName: string;

  /** Retorna a credencial específica do objeto de credenciais. */
  protected abstract getCredential(credentials: AiCredentials): string | undefined;

  /** Retorna o endpoint da API para listar modelos. */
  protected abstract getEndpoint(credentials: AiCredentials): string;

  /** Retorna as opções para a chamada `fetch` (ex: headers). */
  protected abstract getFetchOptions(credentials: AiCredentials): RequestInit;

  /** Extrai a lista de modelos brutos da resposta da API. */
  protected abstract extractModels(data: any): any[];
  
  /** Filtra e mapeia os modelos brutos para a lista final de strings. */
  protected abstract filterAndMapModels(models: any[], modelType: ModelType): string[];

  // --- Método Principal (Template Method) ---

  /**
   * Orquestra a busca de modelos. Este método é final e não deve ser sobrescrito.
   * Ele usa os métodos abstratos para executar a lógica específica de cada provedor.
   */
  public async listModels(credentials: AiCredentials, modelType: ModelType): Promise<string[]> {
    const credential = this.getCredential(credentials);
    if (!credential) {
      throw new Error(`${this.credentialName} is required.`);
    }

    try {
      const endpoint = this.getEndpoint(credentials);
      const options = this.getFetchOptions(credentials);
      
      const response = await fetch(endpoint, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to list ${this.providerId} models: ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rawModels = this.extractModels(data);
      const filteredModels = this.filterAndMapModels(rawModels, modelType);
      
      return filteredModels.sort();

    } catch (error) {
      console.error(`Omni Max [${this.providerId}Lister]: Exception when listing models:`, error);
      throw error;
    }
  }
}