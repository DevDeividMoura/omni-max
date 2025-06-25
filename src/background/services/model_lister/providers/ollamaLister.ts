import type { ModelType } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';
import { BaseModelLister } from '../BaseModelLister';

interface OllamaModel { name: string; }

export class OllamaLister extends BaseModelLister {
  protected providerId = 'ollama';
  protected credentialName = 'ollamaBaseUrl';

  protected getCredential(credentials: AiCredentials): string | undefined {
    return credentials.ollamaBaseUrl;
  }

  protected getEndpoint(credentials: AiCredentials): string {
    const baseUrl = this.getCredential(credentials)!.replace(/\/$/, "");
    return `${baseUrl}/api/tags`;
  }

  protected getFetchOptions(): RequestInit {
    return {}; // Sem opções especiais para o Ollama
  }

  protected extractModels(data: { models: OllamaModel[] }): OllamaModel[] {
    return data.models;
  }

  protected filterAndMapModels(models: OllamaModel[], modelType: ModelType): string[] {
    switch (modelType) {
      case 'embedding':
        return models
          .filter(model => model.name.includes('embed'))
          .map(model => model.name);
      case 'chat':
      default:
        return models
          .filter(model => !model.name.includes('embed'))
          .map(model => model.name);
    }
  }
}