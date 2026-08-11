/**
 * 主进程 PDF 处理模块（基于 pdfjs-dist v6 + @napi-rs/canvas）
 *
 * 在 Node 环境下用 pdfjs-dist 渲染 PDF 页面为图片，通过 IPC 传给前端。
 * 绕过 Electron 渲染进程 Worker/CSP/ESM 的各种坑。
 *
 * 关键点（pdfjs v6）：
 *   - v6 自带 @napi-rs/canvas 作为 Node canvas provider
 *   - page.render 的 `canvas` 是必填参数（canvasContext 仅向后兼容）
 *   - getDocument 在 Node 下自动用 fake worker（主线程），不会卡 worker
 *   - useSystemFonts: false 避免在 Node 下访问系统字体目录
 *
 * IPC:
 *   - pdf:open(base64, filePath) → { success, docId, numPages }
 *   - pdf:open-from-path(filePath) → { success, docId, numPages }
 *   - pdf:render-page(docId, pageNum, scale) → { success, imageData(base64 PNG), width, height }
 *   - pdf:close(docId) → { success }
 */
import { ipcMain } from 'electron';
import * as fs from 'fs';
import log from 'electron-log';

interface PdfDocEntry {
  doc: any;
  numPages: number;
}

const pdfDocuments = new Map<number, PdfDocEntry>();
let docCounter = 0;
let pdfjsModule: any = null;
let canvasModule: any = null;

// 动态加载 pdfjs-dist（v6 是纯 ESM，CJS 主进程用动态 import）
async function loadPdfjs(): Promise<any> {
  if (pdfjsModule) return pdfjsModule;
  try {
    pdfjsModule = await import('pdfjs-dist');
    log.info('[PdfMain] pdfjs-dist 加载成功，版本:', pdfjsModule.version);
    // v6 把 @napi-rs/canvas 列为 optionalDependencies，但我们也显式加载一份，
    // 用于手动创建 canvas 传给 page.render
    try {
      canvasModule = require('@napi-rs/canvas');
      log.info('[PdfMain] @napi-rs/canvas 加载成功');
    } catch (e) {
      log.warn('[PdfMain] @napi-rs/canvas 加载失败:', e);
    }
    return pdfjsModule;
  } catch (err) {
    log.error('[PdfMain] 加载 pdfjs-dist 失败:', err);
    throw err;
  }
}

// base64 → Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const buf = Buffer.from(base64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// 超时包装，避免 promise 永久 pending
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 超时（${ms / 1000}s）`)), ms),
    ),
  ]);
}

// 公共 getDocument 参数
function buildDocParams(data: Uint8Array) {
  return {
    data,
    useSystemFonts: false, // Node 下不访问系统字体目录
    isEvalSupported: false,
    disableFontFace: false, // @napi-rs/canvas 支持字体绘制
  };
}

// 注册 PDF IPC
export async function registerPdfIpc(): Promise<void> {
  // === pdf:open === 从 base64 打开 PDF
  ipcMain.handle('pdf:open', async (_event, base64: string, _filePath: string) => {
    try {
      const pdfjs = await loadPdfjs();
      const data = base64ToUint8Array(base64);
      log.info(`[PdfMain] pdf:open 开始，data size=${(data.length / 1024).toFixed(1)}KB`);
      const loadingTask = pdfjs.getDocument(buildDocParams(data));
      const doc = await withTimeout(loadingTask.promise, 45000, 'PDF 解析');
      const docId = ++docCounter;
      pdfDocuments.set(docId, { doc, numPages: doc.numPages });
      log.info(`[PdfMain] PDF 打开成功，docId=${docId}, numPages=${doc.numPages}`);
      return { success: true, docId, numPages: doc.numPages };
    } catch (err) {
      log.error('[PdfMain] pdf:open 失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // === pdf:open-from-path === 从文件路径打开 PDF
  ipcMain.handle('pdf:open-from-path', async (_event, filePath: string) => {
    try {
      const pdfjs = await loadPdfjs();
      const data = new Uint8Array(fs.readFileSync(filePath));
      log.info(
        `[PdfMain] pdf:open-from-path 开始，path=${filePath}, size=${(data.length / 1024).toFixed(1)}KB`,
      );
      const loadingTask = pdfjs.getDocument(buildDocParams(data));
      const doc = await withTimeout(loadingTask.promise, 45000, 'PDF 解析');
      const docId = ++docCounter;
      pdfDocuments.set(docId, { doc, numPages: doc.numPages });
      log.info(`[PdfMain] PDF 从路径打开成功，docId=${docId}, numPages=${doc.numPages}`);
      return { success: true, docId, numPages: doc.numPages };
    } catch (err) {
      log.error('[PdfMain] pdf:open-from-path 失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // === pdf:render-page === 渲染指定页为 PNG（base64）
  ipcMain.handle(
    'pdf:render-page',
    async (_event, docId: number, pageNum: number, scale: number) => {
      try {
        const entry = pdfDocuments.get(docId);
        if (!entry) return { success: false, error: `PDF 文档不存在（docId=${docId}）` };
        const { doc } = entry;

        if (!canvasModule) {
          throw new Error('@napi-rs/canvas 未加载，无法渲染');
        }

        log.info(`[PdfMain] render-page docId=${docId} page=${pageNum} scale=${scale}`);
        const page = await withTimeout(doc.getPage(pageNum), 15000, `getPage(${pageNum})`);
        const viewport = page.getViewport({ scale });

        const canvas = canvasModule.createCanvas(viewport.width, viewport.height);
        // v6: canvas 是必填参数；background 用白色避免透明 PDF 转 PNG 变黑
        const renderTask = page.render({
          canvas,
          viewport,
          background: '#ffffff',
        });
        await withTimeout(renderTask.promise, 45000, `render(page=${pageNum})`);

        const pngBuffer = canvas.toBuffer('image/png');
        const base64 = pngBuffer.toString('base64');
        log.info(
          `[PdfMain] 渲染页 ${pageNum} 成功，尺寸 ${viewport.width}×${viewport.height}, png=${(pngBuffer.length / 1024).toFixed(1)}KB`,
        );
        return {
          success: true,
          imageData: base64,
          width: viewport.width,
          height: viewport.height,
        };
      } catch (err) {
        log.error('[PdfMain] pdf:render-page 失败:', err);
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // === pdf:close === 关闭 PDF 文档
  ipcMain.handle('pdf:close', async (_event, docId: number) => {
    try {
      const entry = pdfDocuments.get(docId);
      if (entry) {
        await entry.doc.destroy?.();
        pdfDocuments.delete(docId);
        log.info(`[PdfMain] PDF 关闭成功，docId=${docId}`);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
