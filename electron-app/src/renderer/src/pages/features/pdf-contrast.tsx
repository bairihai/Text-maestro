import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';
// pdfjs-dist v6: 在 Vite 中用 ?url 导入 worker
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite ?url 后缀导入，运行时为 worker URL 字符串
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';

// 配置 worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl as string;

// ------------- helpers -------------
function clamp(v: number, min = 0, max = 255): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * 对 ImageData 应用 对比度 / 亮度 / 白点 / 黑点 调整。
 *
 * 算法：
 *   1. 对比度：标准公式 newVal = factor * (oldVal - 128) + 128
 *   2. 亮度：直接加值
 *   3. 白点/黑点拉伸（Levels 工具逻辑）：
 *      - 灰阶 >= whitePoint → 纯白（用于压掉浅色水印）
 *      - 灰阶 <= blackPoint → 纯黑（用于加深文字）
 *      - 中间区段按比例拉伸到 0-255，进一步增强对比
 *
 * 这一套对水印场景效果显著：浅色水印被白点吃掉，深色文字被黑点吃实，
 * 中间灰阶被拉伸锐化。
 */
function processImageData(
  data: Uint8ClampedArray,
  contrast: number,    // -100 ~ 100
  brightness: number,  // -100 ~ 100
  whitePoint: number,  // 0 ~ 255
  blackPoint: number,  // 0 ~ 255
): void {
  // 标准对比度公式：factor = (259 * (c + 255)) / (255 * (259 - c))
  // 输入 c ∈ [-100, 100]，把它映射到公式期望的 [-255, 255] 区间
  const c = contrast * 2.55;
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));

  const range = whitePoint - blackPoint;
  const stretchFactor = range > 0 ? 255 / range : 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. 对比度
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 2. 亮度
    r += brightness;
    g += brightness;
    b += brightness;

    // 3. 白点/黑点拉伸（基于灰阶判断，避免偏色）
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    if (gray >= whitePoint) {
      r = g = b = 255;
    } else if (gray <= blackPoint) {
      r = g = b = 0;
    } else if (range > 0) {
      // 中间区段线性拉伸
      r = (r - blackPoint) * stretchFactor;
      g = (g - blackPoint) * stretchFactor;
      b = (b - blackPoint) * stretchFactor;
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
    // alpha 通道不动
  }
}

// 预设
type PresetKey = 'standard' | 'watermark-strong' | 'binary-extreme' | 'custom';

interface PresetValues {
  contrast: number;
  brightness: number;
  whitePoint: number;
  blackPoint: number;
}

const PRESETS: Record<Exclude<PresetKey, 'custom'>, PresetValues> = {
  'standard': { contrast: 30, brightness: 0, whitePoint: 240, blackPoint: 10 },
  'watermark-strong': { contrast: 50, brightness: 10, whitePoint: 200, blackPoint: 30 },
  'binary-extreme': { contrast: 80, brightness: 0, whitePoint: 180, blackPoint: 50 },
};

// ---------------- styles ----------------
const getPageStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  minHeight: '100vh',
  background: colors.pageBg,
  color: colors.textPrimary,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
});

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--arco-color-border)',
  display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
};

const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 600, margin: 0 };

const contentStyle: React.CSSProperties = {
  padding: '16px 24px 32px',
  display: 'flex', flexDirection: 'column', gap: 16,
  flex: 1, minHeight: 0,
};

const getConfigBlockStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
});

const labelStyle: React.CSSProperties = {
  fontSize: 12, marginBottom: 4,
  fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
};

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
};

const sliderValueStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontWeight: 600, minWidth: 36, textAlign: 'right',
};

const primaryBtnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff',
  border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6,
  padding: '5px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  lineHeight: '20px', transition: 'background 0.15s',
};

const getGhostBtnStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '5px 12px', fontSize: 13, cursor: 'pointer',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 6,
  fontFamily: 'inherit', whiteSpace: 'nowrap',
});

const getDisabledBtnStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '5px 12px', fontSize: 13, cursor: 'not-allowed',
  background: colors.inputBg, color: colors.textSecondary,
  border: `1px solid ${colors.border}`, borderRadius: 6,
  opacity: 0.5, fontFamily: 'inherit', whiteSpace: 'nowrap',
});

const getPresetBtnActiveStyle: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, cursor: 'pointer',
  background: '#2f81f7', color: '#fff',
  border: '1px solid #2f81f7', borderRadius: 14,
};

const getPresetBtnStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '4px 12px', fontSize: 12, cursor: 'pointer',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 14,
});

const getCanvasWrapStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, padding: 16, overflow: 'auto',
  flex: 1, minHeight: 300, display: 'flex', justifyContent: 'center',
});

const emptyStateStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '60px 20px', textAlign: 'center', color: colors.textSecondary,
  fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  alignSelf: 'center', margin: 'auto',
});

// ---------------- component ----------------
const PdfContrastPage: React.FC = () => {
  const { colors } = useTheme();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(2);
  const [contrast, setContrast] = useState(PRESETS['standard'].contrast);
  const [brightness, setBrightness] = useState(PRESETS['standard'].brightness);
  const [whitePoint, setWhitePoint] = useState(PRESETS['standard'].whitePoint);
  const [blackPoint, setBlackPoint] = useState(PRESETS['standard'].blackPoint);
  const [activePreset, setActivePreset] = useState<PresetKey>('standard');

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 缓存当前页原始 ImageData（调参时基于缓存处理，避免重渲染 PDF）
  const originalImageDataRef = useRef<ImageData | null>(null);
  // 导出时按页处理需要保留每页的原始 ImageData，但内存占用大；改为导出时按需重新渲染
  const isExportingRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  // 应用预设
  const applyPreset = (key: Exclude<PresetKey, 'custom'>) => {
    const p = PRESETS[key];
    setContrast(p.contrast);
    setBrightness(p.brightness);
    setWhitePoint(p.whitePoint);
    setBlackPoint(p.blackPoint);
    setActivePreset(key);
  };

  // 当用户手动改参数时，切到 custom
  const onParamChange = <K extends keyof PresetValues>(
    setter: (v: number) => void,
    value: number,
  ) => {
    setter(value);
    setActivePreset('custom');
  };

  // 渲染指定页到 canvas，并把原始像素缓存到 ref
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context 不可用');

      // 白底（PDF 默认透明，转图像会变黑）
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // 缓存原始像素
      originalImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 立即应用一次当前参数
      applyProcessingToCanvas();
    } catch (err) {
      setError((err as Error).message || '渲染失败');
    } finally {
      setLoading(false);
    }
  }, [pdfDoc, scale]);

  // 基于缓存的原始 ImageData 应用当前参数
  const applyProcessingToCanvas = useCallback(() => {
    if (!canvasRef.current || !originalImageDataRef.current) return;
    setProcessing(true);
    // 用 requestAnimationFrame 让 UI 有机会更新
    requestAnimationFrame(() => {
      try {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        // 复制一份原始数据再处理（避免污染缓存）
        const src = originalImageDataRef.current!;
        const copy = new ImageData(
          new Uint8ClampedArray(src.data),
          src.width,
          src.height,
        );
        processImageData(copy.data, contrast, brightness, whitePoint, blackPoint);
        ctx.putImageData(copy, 0, 0);
      } catch (err) {
        console.error('[PdfContrast] 处理失败:', err);
      } finally {
        setProcessing(false);
      }
    });
  }, [contrast, brightness, whitePoint, blackPoint]);

  // 参数变化时重新处理（节流：用 RAF 合并连续输入）
  useEffect(() => {
    if (!originalImageDataRef.current) return;
    applyProcessingToCanvas();
  }, [applyProcessingToCanvas]);

  // 文件导入（共用：file input 与拖拽均走这里）
  // 不直接调 renderPage —— 渲染交给下面的 useEffect 监听 pdfDoc 变化触发，避免闭包陈旧
  const loadFile = useCallback(async (file: File) => {
    if (!file) return;
    // 类型校验：优先看 MIME，缺失时回退到扩展名
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('请拖入 PDF 文件（仅支持 .pdf）');
      return;
    }
    setError(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      // 渲染由 useEffect [pdfDoc, currentPage, ...] 自动触发，无需手动调
    } catch (err) {
      setError((err as Error).message || 'PDF 解析失败');
    }
  }, []);

  // file input 回调
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await loadFile(file);
    // 清空 input 的值，方便重复选择同一文件
    e.target.value = '';
  };

  // ----- 拖拽：用 window 级原生监听器（Electron 里比 React 合成事件可靠）-----
  // 用 ref 持有最新 loadFile，避免监听器捕获陈旧闭包
  const loadFileRef = useRef(loadFile);
  useEffect(() => { loadFileRef.current = loadFile; }, [loadFile]);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      // 必须 preventDefault，否则 drop 不会触发
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      // 仅当离开整个窗口时才取消高亮
      if (e.relatedTarget === null) setIsDragging(false);
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        await loadFileRef.current(file);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // 翻页
  const goToPage = (n: number) => {
    if (!pdfDoc || n < 1 || n > totalPages || n === currentPage) return;
    setCurrentPage(n);
    // 渲染由下方 useEffect 监听 currentPage 触发
  };

  // 切换缩放
  const onScaleChange = (s: number) => {
    setScale(s);
    // 渲染由下方 useEffect 监听 scale 触发
  };

  // 渲染触发器：pdfDoc / currentPage / scale 任一变化时重新渲染当前页
  // 这样避免了 loadFile / goToPage / onScaleChange 里手动调 renderPage 的闭包陈旧问题
  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
    // renderPage 依赖 pdfDoc + scale，其 identity 变化时也会触发，符合预期
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale, renderPage]);

  // 导出当前页 PNG
  const handleExportPng = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.pdf$/i, '')}_p${currentPage}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('已导出当前页 PNG');
    }, 'image/png');
  };

  // 导出整个 PDF（处理所有页）
  const handleExportPdf = async () => {
    if (!pdfDoc || isExportingRef.current) return;
    isExportingRef.current = true;
    setExporting(true);
    setError(null);
    try {
      // 用第一页确定 PDF 尺寸（假设所有页尺寸一致；不一致时每页按自身尺寸）
      const firstPage = await pdfDoc.getPage(1);
      const firstViewport = firstPage.getViewport({ scale });
      const orientation = firstViewport.width > firstViewport.height ? 'l' : 'p';
      const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [firstViewport.width, firstViewport.height],
      });

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D context 不可用');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        processImageData(imgData.data, contrast, brightness, whitePoint, blackPoint);
        ctx.putImageData(imgData, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 1) {
          pdf.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'l' : 'p');
        }
        pdf.addImage(dataUrl, 'JPEG', 0, 0, viewport.width, viewport.height);
      }

      pdf.save(`${fileName.replace(/\.pdf$/i, '')}_processed.pdf`);
      showToast(`已导出 ${totalPages} 页 PDF`);
    } catch (err) {
      setError('导出失败: ' + (err as Error).message);
    } finally {
      setExporting(false);
      isExportingRef.current = false;
    }
  };

  // 卸载时释放 PDF 文档
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={getPageStyle(colors)}>
      {/* 拖拽遮罩（拖拽事件由 window 级监听器处理） */}
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(47,129,247,0.12)',
          border: '3px dashed #2f81f7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: colors.cardBg, color: colors.textPrimary,
            padding: '24px 36px', borderRadius: 8,
            border: `1px solid ${colors.border}`,
            fontSize: 18, fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="#2f81f7">
              <path d="M8 1a.5.5 0 01.5.5v7.793l2.146-2.147a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 11.708-.708L7.5 9.293V1.5A.5.5 0 018 1zM3 13.5a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5z"/>
            </svg>
            松开以导入 PDF
          </div>
        </div>
      )}

      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M4 1.5A1.5 1.5 0 015.5 0h5A1.5 1.5 0 0112 1.5V3h.5A1.5 1.5 0 0114 4.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-11zm1 1V13h6V2.5H5zm1 2h4v1H6V5zm0 2h4v1H6V7zm0 2h3v1H6V9z"/>
        </svg>
        <h1 style={titleStyle}>PDF 对比度调整</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· PDF contrast & watermark suppressor</span>
        {fileName && (
          <span style={{ marginLeft: 'auto', color: colors.textSecondary, fontSize: 11, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName}
          </span>
        )}
      </div>

      <div style={contentStyle}>
        {/* 工具栏 */}
        <div style={getConfigBlockStyle(colors)}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={getGhostBtnStyle(colors)}
            >
              导入 PDF
            </button>

            {pdfDoc && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    style={currentPage <= 1 ? getDisabledBtnStyle(colors) : getGhostBtnStyle(colors)}
                  >上一页</button>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n)) goToPage(n);
                    }}
                    style={{
                      width: 60, padding: '4px 8px', fontSize: 13, textAlign: 'center',
                      background: colors.inputBg, color: colors.textPrimary,
                      border: `1px solid ${colors.border}`, borderRadius: 6, outline: 'none',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    }}
                  />
                  <span style={{ color: colors.textSecondary, fontSize: 13 }}>/ {totalPages}</span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    style={currentPage >= totalPages ? getDisabledBtnStyle(colors) : getGhostBtnStyle(colors)}
                  >下一页</button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>渲染倍率</span>
                  {[1.5, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => onScaleChange(s)}
                      style={scale === s ? getPresetBtnActiveStyle : getPresetBtnStyle(colors)}
                    >{s}x</button>
                  ))}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleExportPng}
                    disabled={!pdfDoc || exporting}
                    style={!pdfDoc || exporting ? getDisabledBtnStyle(colors) : getGhostBtnStyle(colors)}
                  >导出当前页 PNG</button>
                  <button
                    onClick={handleExportPdf}
                    disabled={!pdfDoc || exporting}
                    style={!pdfDoc || exporting ? getDisabledBtnStyle(colors) : primaryBtnStyle}
                  >{exporting ? `导出中 (${totalPages} 页)...` : '导出整个 PDF'}</button>
                </div>
              </>
            )}
          </div>

          {/* 预设 */}
          {pdfDoc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>预设：</span>
              <button onClick={() => applyPreset('standard')} style={activePreset === 'standard' ? getPresetBtnActiveStyle : getPresetBtnStyle(colors)}>标准对比度</button>
              <button onClick={() => applyPreset('watermark-strong')} style={activePreset === 'watermark-strong' ? getPresetBtnActiveStyle : getPresetBtnStyle(colors)}>强力水印抑制</button>
              <button onClick={() => applyPreset('binary-extreme')} style={activePreset === 'binary-extreme' ? getPresetBtnActiveStyle : getPresetBtnStyle(colors)}>极端黑白二值化</button>
              {activePreset === 'custom' && (
                <span style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' }}>自定义</span>
              )}
            </div>
          )}

          {/* 参数滑块 */}
          {pdfDoc && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>对比度 CONTRAST</div>
                <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                  <input type="range" min={-100} max={100} step={1} value={contrast}
                    onChange={(e) => onParamChange(setContrast, Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }} />
                  <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{contrast}</span>
                </div>
              </div>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>亮度 BRIGHTNESS</div>
                <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                  <input type="range" min={-100} max={100} step={1} value={brightness}
                    onChange={(e) => onParamChange(setBrightness, Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }} />
                  <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{brightness}</span>
                </div>
              </div>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>白点阈值 WHITE POINT</div>
                <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                  <input type="range" min={128} max={255} step={1} value={whitePoint}
                    onChange={(e) => onParamChange(setWhitePoint, Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }} />
                  <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{whitePoint}</span>
                </div>
                <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                  高于此灰阶 → 纯白（用于压掉浅色水印）
                </div>
              </div>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>黑点阈值 BLACK POINT</div>
                <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                  <input type="range" min={0} max={127} step={1} value={blackPoint}
                    onChange={(e) => onParamChange(setBlackPoint, Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }} />
                  <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{blackPoint}</span>
                </div>
                <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                  低于此灰阶 → 纯黑（用于加深文字）
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4', fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ {error}</div>
        )}

        {/* 预览区 */}
        <div style={getCanvasWrapStyle(colors)}>
          {!pdfDoc && !error && (
            <div style={emptyStateStyle(colors)}>
              # 点击「导入 PDF」按钮，或直接拖拽 PDF 文件到此处
              <br />
              # 主要场景：通过白点阈值压掉浅色水印，黑点阈值加深文字
            </div>
          )}
          {(loading || processing || exporting) && (
            <div style={{
              position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
              background: colors.cardBg, color: colors.textPrimary,
              padding: '8px 16px', borderRadius: 6, border: `1px solid ${colors.border}`,
              fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10,
            }}>
              {loading ? '渲染 PDF 页面...' : processing ? '处理像素...' : `导出中...`}
            </div>
          )}
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              height: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              background: '#fff',
              display: pdfDoc ? 'block' : 'none',
            }}
          />
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: colors.cardBg, color: colors.textPrimary,
          padding: '8px 16px', borderRadius: 6, border: `1px solid ${colors.border}`,
          fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 9999,
        }}>{toast}</div>
      )}
    </div>
  );
};

export default PdfContrastPage;
