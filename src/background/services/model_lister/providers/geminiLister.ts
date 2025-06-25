import type { ModelType } from '../IModelLister';
import type { AiCredentials } from '../../../../storage/stores';
import { BaseModelLister } from '../BaseModelLister';

interface GeminiModel { name: string; supportedGenerationMethods: string[]; }

export class GeminiLister extends BaseModelLister {
  protected providerId = 'gemini';
  protected credentialName = 'geminiApiKey';

  protected getCredential(credentials: AiCredentials): string | undefined {
    return credentials.geminiApiKey;
  }

  protected getEndpoint(credentials: AiCredentials): string {
    const apiKey = this.getCredential(credentials)!;
    return `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  }

  protected getFetchOptions(): RequestInit {
    return {};
  }

  protected extractModels(data: { models: GeminiModel[] }): GeminiModel[] {
    return data.models;
  }

  protected filterAndMapModels(models: GeminiModel[], modelType: ModelType): string[] {
    const mapName = (model: GeminiModel) => model.name.replace('models/', '');
    switch (modelType) {
      case 'embedding':
        return models
          .filter(model => model.supportedGenerationMethods.includes('embedContent'))
          .map(mapName);
      case 'chat':
      default:
        return models
          .filter(model => model.name.includes('gemini') && model.supportedGenerationMethods.includes('generateContent'))
          .map(mapName);
    }
  }
}