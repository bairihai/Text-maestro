import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, '../app/renderer'), // 设置工作目录
  base: './', // 设置基础路径
  build: {
    outDir: path.resolve(__dirname, '../dist'), // 输出目录
    emptyOutDir: true, // 构建前清空输出目录
    rollupOptions: {
      input: path.resolve(__dirname, '../app/renderer/app.tsx'), // 入口文件
      output: {
        format: 'es', // 输出格式
        entryFileNames: `[name].[hash].js`
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 7001,
    strictPort: true, // 如果端口已被占用，直接退出
    open: true, // 自动打开浏览器
    cors: true // 允许跨源资源共享
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
});