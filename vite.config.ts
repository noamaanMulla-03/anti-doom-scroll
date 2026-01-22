import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        webExtension({
            manifest: './src/manifest.json',
            disableAutoLaunch: true,
            browser: 'chrome',
            additionalInputs: ['src/onboarding.html'],
        }),
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                inlineDynamicImports: false,
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
});
