import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'path';

// Get target browser from environment variable, default to 'chrome'
const targetBrowser = process.env.TARGET_BROWSER || 'chrome';
const buildDir = process.env.BUILD_DIR || 'dist';

export default defineConfig({
    plugins: [
        webExtension({
            manifest: './src/manifest.json',
            disableAutoLaunch: true,
            browser: targetBrowser as 'chrome' | 'firefox',
            additionalInputs: ['src/onboarding.html'],
        }),
    ],
    build: {
        outDir: buildDir,
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
