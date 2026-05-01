import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  base: './',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/"),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
    },
  },
  build: {
    // Ignore TypeScript errors during build
    rollupOptions: {
      onwarn: () => {},
    },
    emptyOutDir: true,
    assetsDir: './',
    outDir: 'electron/dist',
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        strict: false,
      },
    },
  },
})
