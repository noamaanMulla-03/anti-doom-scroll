import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';

export default defineConfig({
    plugins: [
        webExtension({
            manifest: './src/manifest.json',
            disableAutoLaunch: true,
            browser: 'chrome',
        }),
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
});
