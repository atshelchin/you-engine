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
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'systems/index': resolve(__dirname, 'src/systems/index.ts'),
        'utils/index': resolve(__dirname, 'src/utils/index.ts'),
        'ui/index': resolve(__dirname, 'src/ui/index.ts'),
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
