import { defineConfig } from 'vite';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './app/main/electron.js', // 主进程入口文件
      output: {
        format: 'cjs',
      },
      plugins: [
        nodeResolve({
          preferBuiltins: true,
        }),
      ],
      external: ['electron']
    }
  }
});