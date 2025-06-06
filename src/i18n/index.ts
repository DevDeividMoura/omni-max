import { register, init } from 'svelte-i18n';
import { defaultStorageAdapter } from '../storage/IStorageAdapter'; // Usaremos para persistir

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

  const savedLocale = await defaultStorageAdapter.get<string>('omniMaxSelectedLocale');

  init({
    fallbackLocale: 'pt-BR', // Fallback caso nada seja encontrado
    initialLocale: savedLocale || 'pt-BR', 
  });
}