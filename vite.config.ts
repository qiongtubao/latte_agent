import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        // 主进程入口
        entry: 'src/main/index.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              output: {
                entryFileNames: 'index.js',
              },
            },
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
              '@main': resolve(__dirname, 'src/main'),
            },
          },
        },
      },
      {
        // 预加载脚本入口
        entry: 'src/preload/index.ts',
        onstart(args) {
          // 重新加载渲染进程
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              output: {
                entryFileNames: 'index.js',
              },
            },
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
})
