// src/ai/providerMetadata.ts
import type { AiCredentials, AiProviderConfig } from '../storage/stores';

export interface ProviderMetadata {
  id: AiProviderConfig['provider']; // Deve corresponder aos IDs usados no AIServiceManager e stores (ex: 'openai', 'groq')
  displayName: string;              // Nome amigável para a UI (ex: "OpenAI", "Groq")
  
  // Define o tipo de credencial principal que este provedor usa
  credentialType: 'apiKey' | 'baseUrl' | 'apiKeyAndBaseUrl' | 'none'; // 'none' para provedores sem credenciais (raro)

  // Detalhes se usa API Key
  apiKeySettings?: {
    credentialKey: keyof AiCredentials; // Ex: 'openaiApiKey', 'groqApiKey'
    label: string;                      // Ex: "OpenAI API Key"
    placeholder: string;                // Ex: "sk-..."
    inputType?: 'password' | 'text';    // Default 'password'
  };

  // Detalhes se usa Base URL
  baseUrlSettings?: {
    credentialKey: keyof AiCredentials; // Ex: 'ollamaBaseUrl'
    label: string;                      // Ex: "Ollama Base URL"
    placeholder: string;                // Ex: "http://localhost:11434"
    inputType?: 'text';                 // Default 'text'
  };
  
  documentationLink?: string; // Link para a página de como obter as credenciais
  defaultModel?: string; // Sugestão de modelo default para este provedor (opcional)
}

export const PROVIDER_METADATA_LIST: ProviderMetadata[] = [
  {
    id: 'openai',
    displayName: 'OpenAI',
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'openaiApiKey',
      label: 'OpenAI API Key',
      placeholder: 'sk-...',
      inputType: 'password',
    },
    documentationLink: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'gemini',
    displayName: 'Google Gemini',
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'geminiApiKey',
      label: 'Google Gemini API Key',
      placeholder: 'Sua Gemini API Key...',
      inputType: 'password',
    },
    documentationLink: 'https://ai.google.dev/gemini-api/docs/api-key',
    defaultModel: 'gemini-1.5-flash-latest',
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'anthropicApiKey',
      label: 'Anthropic API Key',
      placeholder: 'Sua Anthropic API Key...',
      inputType: 'password',
    },
    documentationLink: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-3-haiku-20240307',
  },
  {
    id: 'ollama',
    displayName: 'Ollama',
    credentialType: 'baseUrl',
    baseUrlSettings: {
      credentialKey: 'ollamaBaseUrl',
      label: 'Ollama Base URL',
      placeholder: 'Ex: http://localhost:11434',
      inputType: 'text',
    },
    documentationLink: 'https://ollama.com/blog/openai-compatibility',
    // Ollama não tem um modelo default fixo, depende do que está instalado.
    // O listModels do OllamaProvider já lida com isso.
  },
  {
    id: 'groq',
    displayName: 'Groq',
    credentialType: 'apiKey',
    apiKeySettings: {
      credentialKey: 'groqApiKey',
      label: 'Groq API Key',
      placeholder: 'gsk_...',
      inputType: 'password',
    },
    documentationLink: 'https://console.groq.com/keys',
    defaultModel: 'llama3-8b-8192',
  },
  // Adicione novos provedores aqui seguindo a mesma estrutura.
];

// Mapa para fácil acesso aos metadados por ID do provedor
export const PROVIDER_METADATA_MAP: Map<string, ProviderMetadata> = new Map(
  PROVIDER_METADATA_LIST.map(meta => [meta.id, meta])
);