/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import type { OutputChunk } from 'rollup'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), playerIsolationPlugin(), cloudflare()],
  resolve: {
    alias: {
      '@': '/src',
      '@excalimate/animation-core': fileURLToPath(
        new URL('./packages/animation-core/src/index.ts', import.meta.url),
      ),
      '@excalimate/project-schema': fileURLToPath(
        new URL('./packages/project-schema/src/index.ts', import.meta.url),
      ),
      '@excalimate/player-runtime': fileURLToPath(
        new URL('./packages/player-runtime/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        editor: fileURLToPath(new URL('./index.html', import.meta.url)),
        player: fileURLToPath(new URL('./player.html', import.meta.url)),
      },
      output: {
        manualChunks(moduleId) {
          const normalized = normalizePath(moduleId)
          if (
            /\/node_modules\/(?:react|react-dom|scheduler)\//.test(normalized)
          ) {
            return 'react'
          }
          if (/\/node_modules\/zustand\//.test(normalized)) return 'editor-state'
          return undefined
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
      include: ['src/**/*.{ts,tsx}', 'packages/*/src/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/vite-env.d.ts'],
    },
  },
})

function playerIsolationPlugin(): Plugin {
  const forbiddenModules: readonly [RegExp, string][] = [
    [/[\\/]@excalidraw[\\/]/i, 'Excalidraw'],
    [/[\\/]posthog(?:-js|[\\/])/i, 'PostHog'],
    [/[\\/]src[\\/]main\.tsx$/i, 'editor entry'],
    [/[\\/]src[\\/]components[\\/](?!.*[\\/]player[\\/])/i, 'editor components'],
    [/[\\/]src[\\/]services[\\/]FileService\./i, 'file services'],
    [/[\\/]src[\\/]services[\\/]ExportService\./i, 'export services'],
    [/[\\/]src[\\/]services[\\/]export[\\/]/i, 'export services'],
    [/[\\/]src[\\/]services[\\/]analytics[\\/]/i, 'analytics'],
    [/[\\/]src[\\/].*(?:Mcp|template)/i, 'MCP or template code'],
  ]

  return {
    name: 'excalimate-player-isolation',
    generateBundle(_options, bundle) {
      const chunks = new Map(
        Object.values(bundle)
          .filter((value): value is OutputChunk => value.type === 'chunk')
          .map((chunk) => [chunk.fileName, chunk]),
      )
      const playerEntry = [...chunks.values()].find(
        (chunk) =>
          chunk.isEntry &&
          (chunk.name === 'player' ||
            normalizePath(chunk.facadeModuleId ?? '').endsWith('/player.html')),
      )
      if (!playerEntry) this.error('The hosted player entry was not generated')

      const queue = [{ chunk: playerEntry, chain: [playerEntry.fileName] }]
      const visited = new Set<string>()
      while (queue.length > 0) {
        const item = queue.pop()
        const chunk = item?.chunk
        if (!chunk || !item || visited.has(chunk.fileName)) continue
        visited.add(chunk.fileName)
        for (const moduleId of Object.keys(chunk.modules)) {
          const normalized = normalizePath(moduleId)
          for (const [pattern, label] of forbiddenModules) {
            if (pattern.test(normalized)) {
              this.error(
                `Hosted player bundle includes forbidden ${label} module via ${item.chain.join(' -> ')}: ${normalized}`,
              )
            }
          }
        }
        for (const imported of [
          ...chunk.imports,
          ...chunk.dynamicImports,
        ]) {
          const dependency = chunks.get(imported)
          if (dependency) {
            queue.push({
              chunk: dependency,
              chain: [...item.chain, dependency.fileName],
            })
          }
        }
      }
    },
  }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}