import type { ModelType } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';
import { BaseModelLister } from '../BaseModelLister';

interface OpenAIModel { id: string; }

export class OpenAILister extends BaseModelLister {
  protected providerId = 'openai';
  protected credentialName = 'openaiApiKey';

  protected getCredential(credentials: AiCredentials): string | undefined {
    return credentials.openaiApiKey;
  }

  protected getEndpoint(): string {
    return 'https://api.openai.com/v1/models';
  }

  protected getFetchOptions(credentials: AiCredentials): RequestInit {
    return {
      headers: { 'Authorization': `Bearer ${this.getCredential(credentials)}` }
    };
  }

  protected extractModels(data: { data: OpenAIModel[] }): OpenAIModel[] {
    return data.data;
  }
  
  protected filterAndMapModels(models: OpenAIModel[], modelType: ModelType): string[] {
    switch (modelType) {
      case 'embedding':
        return models
          .filter(model => model.id.includes('embedding'))
          .map(model => model.id);
      case 'chat':
      default:
        return models
          .filter(model => model.id.startsWith('gpt-'))
          .map(model => model.id);
    }
  }
}