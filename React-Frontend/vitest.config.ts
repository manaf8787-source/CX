import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/lib/**', 'src/auth/**'],
      exclude: ['src/lib/motionFeatures.ts', 'src/utils/csv.ts'],
      reporter: ['text-summary', 'text'],
    },
  },
})
