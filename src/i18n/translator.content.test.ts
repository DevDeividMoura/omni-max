// src/i18n/translator.content.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Translator } from './translator.content';

// Mock para a importação dinâmica dos arquivos JSON
vi.mock('./locales/en.json', () => ({
  default: {
    popup: { header: { title: 'Omni Max' } },
    alerts: { copy_success: 'Copied "{label}"!' }
  }
}));

vi.mock('./locales/pt-BR.json', () => ({
  default: {
    popup: { header: { title: 'Omni Max BR' } },
    alerts: { copy_success: '"{label}" copiado!' }
  }
}));

vi.mock('./locales/non-existent.json', () => {
  throw new Error("Module not found");
});

describe('Translator', () => {
  it('should load the correct locale file on initialization', async () => {
    const translator = new Translator('en');
    const title = await translator.t('popup.header.title');
    expect(title).toBe('Omni Max');
  });

  it('should fall back to pt-BR if the specified locale file does not exist', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const translator = new Translator('non-existent');
    const title = await translator.t('popup.header.title');

    expect(consoleWarnSpy).toHaveBeenCalledWith('[Translator] Could not load locale file for "non-existent". Falling back to pt-BR.');
    expect(title).toBe('Omni Max BR');

    consoleWarnSpy.mockRestore();
  });

  it('should return the key if the translation is not found in the loaded file', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const translator = new Translator('en');
    const nonExistentKey = 'a.b.c';
    
    const result = await translator.t(nonExistentKey);

    expect(result).toBe(nonExistentKey);
    expect(consoleWarnSpy).toHaveBeenCalledWith(`[Translator] Key "${nonExistentKey}" not found in translations.`);
    consoleWarnSpy.mockRestore();
  });

  it('should correctly replace placeholders in the translation string', async () => {
    const translator = new Translator('en');
    const result = await translator.t('alerts.copy_success', { values: { label: 'Document Number' } });
    expect(result).toBe('Copied "Document Number"!');
  });
});