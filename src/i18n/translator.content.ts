import { getLocaleFromAgent } from '../utils/language'; // Importa a função que detecta o locale do agente

// Define um tipo para garantir que todos os arquivos de locale tenham a mesma estrutura
type LocaleFile = { [key: string]: any };

/**
 * Carrega dinamicamente o arquivo de tradução para um determinado locale.
 * @param locale O código do locale (ex: 'en', 'pt-BR').
 * @returns Uma Promise que resolve para o conteúdo do arquivo JSON.
 */
async function loadTranslations(locale: string): Promise<LocaleFile> {
  try {
    const module = await import(`./locales/${locale}.json`);
    return module.default;
  } catch (error) {
    console.warn(`[Translator] Could not load locale file for "${locale}". Falling back to pt-BR.`);
    const fallbackModule = await import('./locales/pt-BR.json');
    return fallbackModule.default;
  }
}




/**
 * Navega em um objeto usando uma string de chave aninhada (ex: 'popup.header.title').
 * @param obj O objeto para pesquisar.
 * @param key A chave aninhada.
 * @returns O valor encontrado ou undefined.
 */
function getNestedValue(obj: any, key: string): string | undefined {
  return key.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Classe que lida com a tradução de chaves para o idioma detectado.
 */
class Translator {
  private translations: LocaleFile | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  /**
   * Inicializa o tradutor carregando o arquivo de idioma correto.
   */
  private init(): void {
    // getLocaleFromAgent() precisa estar disponível aqui ou ser importado.
    // Vamos assumir que ela será movida para um arquivo de utils compartilhado.
    // Por enquanto, vamos redefini-la aqui para o exemplo ser autocontido.
    const locale = getLocaleFromAgent(); // Esta função viria de um 'utils'
    this.initPromise = loadTranslations(locale).then(trans => {
      this.translations = trans;
      console.log(`[Translator] Translations for "${locale}" loaded successfully.`);
    });
  }

  /**
   * Obtém a tradução para uma chave específica de forma assíncrona.
   * @param key A chave de tradução (ex: 'modules.layoutCorrection.name').
   * @returns A string traduzida.
   */
  public async t(key: string, options?: { values?: Record<string, string | number> }): Promise<string> {
    // Garante que as traduções foram carregadas antes de tentar usá-las
    if (!this.translations) {
      await this.initPromise;
    }
    
    // O '!' aqui é seguro por causa do await acima.
    let translation = getNestedValue(this.translations!, key) || key;
    if (!translation) {
      console.warn(`[Translator] Key "${key}" not found in translations.`);
      return key; // Retorna a chave original se não houver tradução
    }
    if (options?.values) {
      for (const [placeholder, value] of Object.entries(options.values)) {
        translation = translation.replace(`{${placeholder}}`, String(value));
      }
    }

    return translation;
  }
}

// Exporta uma instância única do tradutor para ser usada em todo o content script
export const translator = new Translator();