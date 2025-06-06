import { register, init, getLocaleFromNavigator } from 'svelte-i18n';
import { defaultStorageAdapter } from '../storage/IStorageAdapter'; // Usaremos para persistir

/**
 * @function getLocaleFromAgent
 * @description Detects language from `window.langAgent` if available.
 * @returns {string | null} The detected locale code or null.
 */
function getLocaleFromAgent(): string | null {
  const raw = typeof window !== 'undefined' ? (window as any).langAgent : null;
  if (typeof raw !== 'string') return null;

  const lang = raw.toLowerCase();

  // Ordem importa: checamos PT-BR antes de PT
  const mappings: [string, string][] = [
    ['pt-br', 'pt-BR'],
    ['pt-pt',    'pt-PT'],
    ['es',    'es'],
    ['en',    'en'],
  ];

  const match = mappings.find(([prefix]) => lang.startsWith(prefix));
  return match ? match[1] : null;
}

/**
 * Registers all translation files for the application.
 */
export function registerLocales() {
  register('en',    () => import('./locales/en.json'));
  register('es',    () => import('./locales/es.json'));
  register('pt-BR', () => import('./locales/pt-BR.json'));
  register('pt-PT', () => import('./locales/pt-PT.json'));
}

/**
 * Initializes the i18n service.
 * It determines the initial locale by checking storage, `window.langAgent`,
 * the browser's navigator, and finally falling back to a default.
 */
export async function initializeI18n() {
  registerLocales();

  const saved = await defaultStorageAdapter.get<string>('omniMaxSelectedLocale');
  const agentLocale = getLocaleFromAgent();
  const browserLocale = getLocaleFromNavigator();

  init({
    fallbackLocale: 'pt-BR',
    initialLocale: saved || agentLocale || browserLocale,
  });
}