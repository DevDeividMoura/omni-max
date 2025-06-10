// src/utils/language.ts

/**
 * Scans inline script tags on the page to find and extract the value of 'langAgent'.
 * @returns {string | null} The value of langAgent if found, otherwise null.
 */
function getLangFromScriptTag(): string | null {
  const scripts = Array.from(document.querySelectorAll('script'));
  const regex = /langAgente\s*=\s*['"](.*?)['"]/;
  for (const script of scripts) {
    if (script.textContent) {
      const match = script.textContent.match(regex);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  return null;
}

/**
 * Determines the locale from the user agent or inline script tag.
 * Fallbacks to 'pt-BR' if no suitable locale is found.
 * @returns {string} The detected locale in the format 'xx-XX'.
 */
export function getLocaleFromAgent(): string {
    const defaultLocale = 'pt-BR';
    let langToProcess: string | null = getLangFromScriptTag();

    if (!langToProcess && navigator.language) {
      langToProcess = navigator.language;
    }
    
    if (!langToProcess) return defaultLocale;

    const lang = langToProcess.toLowerCase();
    const mappings: [string, string][] = [
        ['pt-br', 'pt-BR'], ['pt-pt', 'pt-PT'],
        ['es', 'es'], ['en', 'en'], ['pt', 'pt-PT'],
    ];
    const detectedMapping = mappings.find(([prefix]) => lang.startsWith(prefix));
    return detectedMapping ? detectedMapping[1] : defaultLocale;
}