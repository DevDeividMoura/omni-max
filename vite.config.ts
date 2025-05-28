import { crx } from "@crxjs/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from 'vitest/config';
import manifest from "./src/manifest.config";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        svelte(), 
        crx({ manifest })
    ],
    // HACK: https://github.com/crxjs/chrome-extension-tools/issues/696
    // https://github.com/crxjs/chrome-extension-tools/issues/746
    server: {
        port: 5173,
        strictPort: true,
        hmr: {
            clientPort: 5173,
        },
    },
    test: {
        globals: true, // Permite usar describe, it, expect, etc., sem importar
        environment: 'jsdom', // Simula um ambiente de navegador
        setupFiles: ['./src/vitest-setup.ts'], // Arquivo para mocks globais e configurações
        include: ['src/**/__tests__/**/*.{test,spec}.{js,ts}'], // Onde encontrar os testes
        coverage: {
            provider: 'v8', // ou 'istanbul'
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage', // Onde salvar os relatórios
            all: true, // Incluir todos os arquivos em src no relatório, mesmo os não testados
            include: ['src/**/*.{ts,svelte}'], // Arquivos a serem incluídos na cobertura
            exclude: [ // Arquivos a serem excluídos da cobertura
                'src/**/manifest.config.ts',
                'src/**/*.d.ts',
                'src/**/__tests__',
                'src/vitest-setup.ts',
                'src/assets/**', // Excluir assets como imagens, fontes, etc.
            ],
        },
    },
});
