import React, { useState, useRef } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';

// 二维码生成器
// 文生图功能：文本/URL -> 二维码 PNG/JPEG/WEBP
// 支持尺寸、颜色、容错级别、Logo 嵌入

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

const titleStyle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, margin: 0,
};

const contentStyle: React.CSSProperties = {
  padding: '16px 24px 32px',
  display: 'flex', flexDirection: 'column', gap: 16,
};

const getConfigBlockStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
});

const labelStyle: React.CSSProperties = {
  fontSize: 12, marginBottom: 4,
  fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
};

const getInputStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  width: '100%', padding: '5px 12px', fontSize: 14, lineHeight: '20px',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 6, outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
});

const textareaStyle: React.CSSProperties = {
  minHeight: 80, resize: 'vertical',
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
  lineHeight: '20px', alignSelf: 'flex-start', transition: 'background 0.15s',
};

const disabledBtnStyle: React.CSSProperties = { background: 'rgba(35, 134, 54, 0.5)', cursor: 'not-allowed' };

const copyBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--arco-color-border)', borderRadius: 6, padding: '3px 10px',
  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
};

const pythonBadgeStyle: React.CSSProperties = {
  backgroundColor: '#FF8000',
  borderRadius: 5,
  padding: '2px 8px',
  fontSize: '0.85em',
  color: '#fff',
  fontWeight: 600,
};

const previewBoxStyle: React.CSSProperties = {
  padding: 16,
  border: '1px dashed var(--arco-color-border-2)',
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 280,
  background: 'var(--arco-color-fill-1)',
};

// 容错级别说明
const ERROR_CORRECT_INFO: Record<string, string> = {
  L: 'L ~7%',
  M: 'M ~15%',
  Q: 'Q ~25%',
  H: 'H ~30%',
};

function QrcodePage(): JSX.Element {
  const { colors } = useTheme();

  // 输入
  const [text, setText] = useState('https://github.com');
  // 定制参数
  const [boxSize, setBoxSize] = useState(10);
  const [border, setBorder] = useState(4);
  const [errorCorrect, setErrorCorrect] = useState<string>('M');
  const [fillColor, setFillColor] = useState('#000000');
  const [backColor, setBackColor] = useState('#FFFFFF');
  const [logoPath, setLogoPath] = useState('');
  const [logoRatio, setLogoRatio] = useState(0.2);
  const [outputWidth, setOutputWidth] = useState(0);   // 0 = 自然尺寸
  const [outputHeight, setOutputHeight] = useState(0);
  const [outputFormat, setOutputFormat] = useState('png');

  // 输出
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleGenerate = async (): Promise<void> => {
    if (!text.trim()) {
      setError('请输入要编码的文本/URL');
      return;
    }
    setLoading(true);
    setError(null);
    setImageData(null);
    setElapsedMs(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 50);

    try {
      const fn = (window as any).electron?.generateQrcode;
      if (typeof fn !== 'function') {
        setError('当前环境不支持二维码生成（缺少 generateQrcode IPC 方法）');
        return;
      }
      const res = await fn(
        text,
        boxSize,
        border,
        errorCorrect,
        fillColor,
        backColor,
        logoPath.trim(),
        logoRatio,
        outputWidth,
        outputHeight,
        outputFormat,
      );
      if (!res || res.success === false) {
        setError(res?.error || '二维码生成失败');
        return;
      }
      if (!res.data) {
        setError('二维码生成失败：未返回图片数据');
        return;
      }
      setImageData(res.data);
    } catch (err) {
      setError((err as Error).message || '二维码生成失败');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleCopyImage = async (): Promise<void> => {
    if (!imageData) return;
    try {
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
      const byteChars = atob(base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${outputFormat}` });
      await navigator.clipboard.write([
        new ClipboardItem({ [`${outputFormat === 'jpeg' ? 'jpeg' : 'png'}`]: blob }),
      ]);
      showToast('图片已复制');
    } catch {
      showToast('复制失败');
    }
  };

  const handleDownload = (): void => {
    if (!imageData) return;
    const base64 = imageData.startsWith('data:image') ? imageData : `data:image/${outputFormat};base64,${imageData}`;
    const a = document.createElement('a');
    a.href = base64;
    a.download = `qrcode_${Date.now()}.${outputFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('已下载');
  };

  const handleOpenInNewWindow = (): void => {
    if (!imageData) return;
    const base64 = imageData.startsWith('data:image') ? imageData : `data:image/${outputFormat};base64,${imageData}`;
    // 用 data URL 在新窗口打开（Electron 中会被 setWindowOpenHandler 拦截到外部浏览器；
    // 这里改用 Blob URL 更稳）
    const raw = base64.replace(/^data:image\/\w+;base64,/, '');
    const byteChars = atob(raw);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${outputFormat}` });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    showToast('已在新窗口打开');
  };

  const previewSrc = imageData
    ? (imageData.startsWith('data:image') ? imageData : `data:image/${outputFormat};base64,${imageData}`)
    : null;

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <span style={{ fontSize: 20 }}>▢</span>
        <h1 style={titleStyle}>二维码生成器</h1>
        <span style={pythonBadgeStyle}>python</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textSecondary }}>
          文本 / URL → 二维码图片
        </span>
      </div>

      <div style={contentStyle}>
        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={labelStyle}>文本 / URL</div>
            <textarea
              style={{ ...getInputStyle(colors), ...textareaStyle }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入要编码的文本或 URL，例如 https://github.com"
            />
          </div>
        </div>

        {/* 定制参数 */}
        <div style={getConfigBlockStyle(colors)}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>定制参数</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>方块像素大小 (box_size)</div>
              <div style={sliderContainerStyle}>
                <input
                  type="range" min={1} max={30} value={boxSize}
                  onChange={(e) => setBoxSize(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={sliderValueStyle}>{boxSize}</span>
              </div>
            </div>
            <div>
              <div style={labelStyle}>边框宽度 (border)</div>
              <div style={sliderContainerStyle}>
                <input
                  type="range" min={0} max={10} value={border}
                  onChange={(e) => setBorder(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={sliderValueStyle}>{border}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>容错级别</div>
              <select
                value={errorCorrect}
                onChange={(e) => setErrorCorrect(e.target.value)}
                style={{ ...getInputStyle(colors), padding: '5px 8px' }}
              >
                {Object.entries(ERROR_CORRECT_INFO).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={labelStyle}>前景色</div>
              <input
                type="color" value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                style={{ width: '100%', height: 32, padding: 0, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}
              />
            </div>
            <div>
              <div style={labelStyle}>背景色</div>
              <input
                type="color" value={backColor}
                onChange={(e) => setBackColor(e.target.value)}
                style={{ width: '100%', height: 32, padding: 0, border: `1px solid ${colors.border}`, borderRadius: 6, cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Logo 路径（可选）</div>
              <input
                type="text"
                style={getInputStyle(colors)}
                value={logoPath}
                onChange={(e) => setLogoPath(e.target.value)}
                placeholder="嵌入到二维码中心的 Logo 图片路径"
              />
            </div>
            <div>
              <div style={labelStyle}>Logo 占比</div>
              <div style={sliderContainerStyle}>
                <input
                  type="range" min={0.05} max={0.4} step={0.05} value={logoRatio}
                  onChange={(e) => setLogoRatio(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={sliderValueStyle}>{logoRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>输出宽度（0=自然）</div>
              <input
                type="number" min={0} value={outputWidth}
                onChange={(e) => setOutputWidth(parseInt(e.target.value) || 0)}
                style={getInputStyle(colors)}
              />
            </div>
            <div>
              <div style={labelStyle}>输出高度（0=自然）</div>
              <input
                type="number" min={0} value={outputHeight}
                onChange={(e) => setOutputHeight(parseInt(e.target.value) || 0)}
                style={getInputStyle(colors)}
              />
            </div>
            <div>
              <div style={labelStyle}>输出格式</div>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                style={{ ...getInputStyle(colors), padding: '5px 8px' }}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            style={loading ? { ...primaryBtnStyle, ...disabledBtnStyle } : primaryBtnStyle}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? `生成中... ${(elapsedMs / 1000).toFixed(1)}s` : '生成二维码'}
          </button>
          {imageData && (
            <>
              <button style={copyBtnStyle} onClick={handleCopyImage}>复制图片</button>
              <button style={copyBtnStyle} onClick={handleDownload}>下载</button>
              <button style={copyBtnStyle} onClick={handleOpenInNewWindow}>新窗口打开</button>
            </>
          )}
          {error && <span style={{ color: '#f53f3f', fontSize: 13 }}>{error}</span>}
          {toast && (
            <div style={{
              position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '6px 14px',
              borderRadius: 4, fontSize: 13, zIndex: 9999, pointerEvents: 'none',
            }}>{toast}</div>
          )}
        </div>

        {/* 预览 */}
        <div style={getConfigBlockStyle(colors)}>
          <div style={labelStyle}>预览</div>
          <div style={previewBoxStyle}>
            {loading && <span style={{ color: colors.textSecondary }}>生成中...</span>}
            {!loading && !imageData && <span style={{ color: colors.textSecondary }}>等待生成</span>}
            {imageData && (
              <img
                src={previewSrc!}
                alt="二维码预览"
                style={{ maxWidth: '100%', maxHeight: 400, imageRendering: 'pixelated' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QrcodePage;
