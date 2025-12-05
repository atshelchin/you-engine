import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'systems/index': resolve(__dirname, 'src/systems/index.ts'),
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'math/index': resolve(__dirname, 'src/math/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['miniplex', '@tweenjs/tween.js', 'howler'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
