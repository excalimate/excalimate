/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      '@': '/src',
      '@excalimate/project-schema': fileURLToPath(
        new URL('./packages/project-schema/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          excalidraw: ['@excalidraw/excalidraw'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'packages/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'packages/project-schema/src/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/vite-env.d.ts'],
    },
  },
})