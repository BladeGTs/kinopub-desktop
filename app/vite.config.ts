import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// webOS loads the app from file://, where Chrome won't run <script type="module">:
// build a single classic IIFE bundle and strip module/crossorigin from index.html.
function classicScript(): Plugin {
  return {
    name: 'classic-script',
    transformIndexHtml(html) {
      return html
        .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>')
        .replace(/ crossorigin/g, '')
        .replace(/<link rel="modulepreload"[^>]*>/g, '')
    },
  }
}

const desktopConfig = readFileSync(new URL('./electron-builder.yml', import.meta.url), 'utf8')
const appVersion = desktopConfig.match(/extraMetadata:\r?\n\s{2}version:\s*([^\s]+)/)?.[1]

if (!appVersion) throw new Error('Missing desktop application version')

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [react(), classicScript()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  build: {
    // webOS 22 (2022) ships Chromium 87: the oldest platform this build is meant to run on. Syntax is lowered
    // to it; runtime APIs are kept to what 87 has (no toSorted, findLast, structuredClone, Array.at).
    target: 'chrome87',
    modulePreload: false,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: { host: true, port: 5173 },
})
