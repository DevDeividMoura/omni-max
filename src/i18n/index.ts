import { register, init, locale } from 'svelte-i18n';


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
export function initializeI18n(initialLocale: string) {
  registerLocales();

  console.log(`[i18n] Initializing with locale provided by content script: "${initialLocale}"`);

  init({
    fallbackLocale: 'pt-BR',
    initialLocale: initialLocale || 'pt-BR',
  });
}