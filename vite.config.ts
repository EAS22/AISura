import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Light obfuscation for embedded default AI key. Not real security —
// just prevents trivial `strings <binary> | grep gsk_` discovery.
function obfuscate(input: string): string {
  if (!input) return ''
  const KEY = 'AISura.default.v1'
  const out: number[] = []
  for (let i = 0; i < input.length; i++) {
    out.push(input.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length))
  }
  return Buffer.from(out).toString('base64')
}

const DEFAULT_AI_BASE_URL = process.env.AISURA_DEFAULT_AI_BASE_URL || 'https://api.groq.com/openai/v1'
const DEFAULT_AI_MODEL = process.env.AISURA_DEFAULT_AI_MODEL || 'llama-3.3-70b-versatile'
const DEFAULT_AI_KEY_OBF = obfuscate(process.env.AISURA_DEFAULT_AI_KEY || '')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tanstack/react-router': path.resolve(__dirname, './src/lib/router/index.tsx'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  define: {
    __AISURA_DEFAULT_AI_BASE_URL__: JSON.stringify(DEFAULT_AI_BASE_URL),
    __AISURA_DEFAULT_AI_MODEL__: JSON.stringify(DEFAULT_AI_MODEL),
    __AISURA_DEFAULT_AI_KEY_OBF__: JSON.stringify(DEFAULT_AI_KEY_OBF),
  },
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
