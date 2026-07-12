import React, { useState } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';

// 增强版词云生成，集成自 https://github.com/AlionSSS/wordcloud-webui (Apache-2.0)
// 支持三种模式: 频率表 / 文本直输 / Mask 蒙版

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
  minHeight: 120, resize: 'vertical',
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: '#2f81f7', boxShadow: '0 0 0 3px rgba(31, 111, 235, 0.4)',
};

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
};

const sliderValueStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontWeight: 600, minWidth: 24, textAlign: 'right',
};

const getCodeBlockStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column',
});

const codeHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '6px 12px', background: 'rgba(255,255,255,0.03)',
  borderBottom: '1px solid var(--arco-color-border)', fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

const primaryBtnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff',
  border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6,
  padding: '5px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  lineHeight: '20px', alignSelf: 'flex-start', transition: 'background 0.15s',
};

const primaryBtnHoverStyle: React.CSSProperties = { background: '#2ea043' };
const disabledBtnStyle: React.CSSProperties = { background: 'rgba(35, 134, 54, 0.5)', cursor: 'not-allowed' };

const copyBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--arco-color-border)', borderRadius: 6, padding: '3px 10px',
  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
};

// Python 加速标签（橙色，参考 GradioBadge 样式）
const pythonBadgeStyle: React.CSSProperties = {
  backgroundColor: '#FF8000',
  borderRadius: 5,
  padding: '2px 8px',
  fontSize: '0.85em',
  color: '#fff',
  fontWeight: 600,
  display: 'inline-block',
};

// 模式切换 Tab 样式
const modeTabContainerStyle: React.CSSProperties = {
  display: 'flex', gap: 4, marginBottom: 8,
};

const getModeTabStyle = (active: boolean, colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '6px 14px', fontSize: 13, cursor: 'pointer', borderRadius: 6,
  border: `1px solid ${active ? '#2f81f7' : colors.border}`,
  background: active ? 'rgba(47, 129, 247, 0.15)' : 'transparent',
  color: active ? '#2f81f7' : colors.textSecondary,
  fontWeight: active ? 600 : 400, transition: 'all 0.15s',
});

// ------------- component -------------
type WcMode = 'freq' | 'text' | 'mask';

const Wordcloud: React.FC = () => {
  const { colors } = useTheme();

  // 模式
  const [mode, setMode] = useState<WcMode>('freq');

  // 频率表模式
  const [freqText, setFreqText] = useState(
    `峻影: 15\n柔道: 12\n云都: 10\n快乐: 8\n天气: 6\n练习: 5\n喜欢: 4\n感到: 3`
  );

  // 文本直输模式
  const [rawText, setRawText] = useState('');
  const [stopwords, setStopwords] = useState('');
  const [userdict, setUserdict] = useState('');

  // 通用参数
  const [fontPath, setFontPath] = useState('C:\\Windows\\Fonts\\simhei.ttf');
  const [maxFont, setMaxFont] = useState(100);
  const [minFont, setMinFont] = useState(20);
  const [margin, setMargin] = useState(2);
  const [preferH, setPreferH] = useState(0.9);
  const [bgColor, setBgColor] = useState('white');

  // 普通模式参数
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(200);

  // Mask 模式参数
  const [maskPath, setMaskPath] = useState('');
  const [maskColorPath, setMaskColorPath] = useState('');
  const [contourWidth, setContourWidth] = useState(3);
  const [contourColor, setContourColor] = useState('steelblue');

  // 输出格式
  const [outputFormat, setOutputFormat] = useState('png');

  // 状态
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [btnHover, setBtnHover] = useState(false);
  const [freqFocused, setFreqFocused] = useState(false);
  const [fontFocused, setFontFocused] = useState(false);
  const [textFocused, setTextFocused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // 将频率表文本解析为 JSON 字符串
  const parseFreqText = (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        return JSON.stringify(obj);
      }
    } catch {
      // 不是 JSON，继续按行解析
    }
    const result: Record<string, number> = {};
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^(.+?)\s*[:：]\s*(\d+(?:\.\d+)?)\s*$/);
      if (m) {
        result[m[1].trim()] = parseFloat(m[2]);
      }
    }
    if (Object.keys(result).length === 0) return null;
    return JSON.stringify(result);
  };

  const handleGenerate = async () => {
    let inputContent = '';
    let pyMode = mode;

    // 根据模式准备输入内容
    if (mode === 'freq' || mode === 'mask') {
      const freqJson = parseFreqText(freqText);
      if (!freqJson) {
        setError('频率表格式无效，请使用 JSON 或「词语:次数」每行一条');
        return;
      }
      inputContent = freqJson;
    } else if (mode === 'text') {
      if (!rawText.trim()) {
        setError('请输入原始文本');
        return;
      }
      inputContent = rawText;
    }

    if (!fontPath.trim()) {
      setError('请输入字体文件路径');
      return;
    }

    if (mode === 'mask' && !maskPath.trim()) {
      setError('Mask 模式需要提供 Mask 图像路径');
      return;
    }

    setLoading(true);
    setError(null);
    setImageData(null);
    setElapsedMs(0);

    const startTime = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - startTime), 50);

    try {
      const fn = (window as any).electron?.generateWordcloud;
      if (typeof fn !== 'function') {
        setError('当前环境不支持词云生成（缺少 generateWordcloud IPC 方法）');
        return;
      }
      const res = await fn(
        inputContent,
        fontPath.trim(),
        maxFont,
        minFont,
        margin,
        preferH,
        pyMode,
        width,
        height,
        bgColor,
        maskPath.trim(),
        maskColorPath.trim(),
        contourWidth,
        contourColor,
        stopwords,
        userdict,
        outputFormat,
      );
      if (!res || res.success === false) {
        setError(res?.error || '词云生成失败');
        return;
      }
      if (!res.data) {
        setError('词云生成失败：未返回图片数据');
        return;
      }
      setImageData(res.data);
    } catch (err) {
      setError((err as Error).message || '词云生成失败');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!imageData) return;
    try {
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
      const byteChars = atob(base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
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

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zM4 6h2v1H4zm4 0h4v1H8zm-4 3h3v1H4zm5 0h3v1H9zM5 9h1v1H5zm5 0h1v1h-1z" />
        </svg>
        <h1 style={titleStyle}>词云图生成</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Word cloud</span>
        <span style={pythonBadgeStyle}>python</span>
      </div>

      <div style={contentStyle}>
        {/* 模式切换 Tab */}
        <div style={modeTabContainerStyle}>
          <div style={getModeTabStyle(mode === 'freq', colors)} onClick={() => setMode('freq')}>
            频率表模式
          </div>
          <div style={getModeTabStyle(mode === 'text', colors)} onClick={() => setMode('text')}>
            文本直输模式
          </div>
          <div style={getModeTabStyle(mode === 'mask', colors)} onClick={() => setMode('mask')}>
            Mask 模式
          </div>
        </div>

        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          {/* 频率表输入（freq + mask 模式） */}
          {(mode === 'freq' || mode === 'mask') && (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>
                FREQUENCY（JSON 或「词语:次数」每行一条）
              </div>
              <textarea
                placeholder={'例如:\n{"峻影": 15, "柔道": 12}\n或:\n峻影: 15\n柔道: 12'}
                value={freqText}
                onChange={(e) => setFreqText(e.target.value)}
                onFocus={() => setFreqFocused(true)}
                onBlur={() => setFreqFocused(false)}
                style={{ ...getInputStyle(colors), ...textareaStyle, ...(freqFocused ? inputFocusStyle : null) }}
              />
            </div>
          )}

          {/* 文本直输（text 模式） */}
          {mode === 'text' && (
            <>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>原始文本（自动 jieba 分词）</div>
                <textarea
                  placeholder="输入原始文本，将自动使用 jieba 分词并生成词云"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  onFocus={() => setTextFocused(true)}
                  onBlur={() => setTextFocused(false)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, minHeight: 160, ...(textFocused ? inputFocusStyle : null) }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>停用词（可选，逗号分隔）</div>
                  <input
                    type="text"
                    placeholder="不填则用内置停用词库"
                    value={stopwords}
                    onChange={(e) => setStopwords(e.target.value)}
                    style={getInputStyle(colors)}
                  />
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 200 }}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>自定义分词词典（逗号分隔）</div>
                  <input
                    type="text"
                    placeholder="如: 峻影,柔道,云都"
                    value={userdict}
                    onChange={(e) => setUserdict(e.target.value)}
                    style={getInputStyle(colors)}
                  />
                </div>
              </div>
            </>
          )}

          {/* 字体路径 */}
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>FONT PATH（字体文件路径，必填）</div>
            <input
              type="text"
              placeholder="例如: C:\Windows\Fonts\simhei.ttf"
              value={fontPath}
              onChange={(e) => setFontPath(e.target.value)}
              onFocus={() => setFontFocused(true)}
              onBlur={() => setFontFocused(false)}
              style={{ ...getInputStyle(colors), ...(fontFocused ? inputFocusStyle : null) }}
            />
          </div>

          {/* 4 个 slider 参数 */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>最大字号</div>
              <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                <input
                  type="range" min={10} max={200} step={1} value={maxFont}
                  onChange={(e) => setMaxFont(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }}
                />
                <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{maxFont}</span>
              </div>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>最小字号</div>
              <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                <input
                  type="range" min={4} max={200} step={1} value={minFont}
                  onChange={(e) => setMinFont(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }}
                />
                <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{minFont}</span>
              </div>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>词间距</div>
              <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                <input
                  type="range" min={0} max={10} step={1} value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }}
                />
                <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{margin}</span>
              </div>
            </div>
            <div style={{ flex: '1 1 220px', minWidth: 220 }}>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>横向排列概率</div>
              <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
                <input
                  type="range" min={0} max={1} step={0.05} value={preferH}
                  onChange={(e) => setPreferH(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }}
                />
                <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{preferH.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 普通模式/文本模式：宽高 + 背景色 */}
          {mode !== 'mask' && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 120px', minWidth: 120 }}>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>宽度</div>
                <input
                  type="number" min={1} value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  style={getInputStyle(colors)}
                />
              </div>
              <div style={{ flex: '1 1 120px', minWidth: 120 }}>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>高度</div>
                <input
                  type="number" min={1} value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  style={getInputStyle(colors)}
                />
              </div>
              <div style={{ flex: '2 1 200px', minWidth: 200 }}>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>背景色</div>
                <input
                  type="text" value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="颜色名或 hex，如 white 或 #fee2e2"
                  style={getInputStyle(colors)}
                />
              </div>
            </div>
          )}

          {/* Mask 模式：mask 路径 + 颜色蒙版 + 轮廓线 + 背景色 */}
          {mode === 'mask' && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 250px', minWidth: 250 }}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>MASK 图像路径（决定形状）</div>
                  <input
                    type="text" value={maskPath}
                    onChange={(e) => setMaskPath(e.target.value)}
                    placeholder="例如: D:\\images\\mask.png"
                    style={getInputStyle(colors)}
                  />
                </div>
                <div style={{ flex: '2 1 250px', minWidth: 250 }}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>颜色蒙版路径（可选，决定颜色）</div>
                  <input
                    type="text" value={maskColorPath}
                    onChange={(e) => setMaskColorPath(e.target.value)}
                    placeholder="不填则用 MASK 图像的颜色"
                    style={getInputStyle(colors)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px', minWidth: 150 }}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>轮廓线粗细</div>
                  <input
                    type="number" min={0} value={contourWidth}
                    onChange={(e) => setContourWidth(Number(e.target.value))}
                    style={getInputStyle(colors)}
                  />
                </div>
                <div style={{ flex: '2 1 200px', minWidth: 200 }}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>轮廓线颜色</div>
                  <input
                    type="text" value={contourColor}
                    onChange={(e) => setContourColor(e.target.value)}
                    placeholder="如 steelblue 或 #4682b4"
                    style={getInputStyle(colors)}
                  />
                </div>
                <div style={{ flex: '2 1 200px', minWidth: 200 }}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>背景色</div>
                  <input
                    type="text" value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    placeholder="如 white 或 #fee2e2"
                    style={getInputStyle(colors)}
                  />
                </div>
              </div>
            </>
          )}

          {/* 输出格式 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ ...labelStyle, color: colors.textSecondary, marginBottom: 0 }}>输出格式</div>
            {['png', 'jpeg', 'webp'].map((fmt) => (
              <label key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="radio" name="format" value={fmt} checked={outputFormat === fmt}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  style={{ accentColor: '#2f81f7' }}
                />
                {fmt}
              </label>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              ...primaryBtnStyle,
              ...(btnHover && !loading ? primaryBtnHoverStyle : null),
              ...(loading ? disabledBtnStyle : null),
            }}
          >
            {loading ? '生成中...' : '▸ 生成词云'}
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>正在使用 wordcloud 生成词云图... (模式: {mode})</span>
              <span style={{ fontSize: 12, color: colors.textSecondary }}>
                已用时 {(elapsedMs / 1000).toFixed(1)}s
              </span>
            </div>
            <div style={{
              padding: '24px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              flexDirection: 'column',
              minHeight: 100,
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#2f81f7',
                      opacity: 0.3 + (0.7 * Math.abs(Math.sin((elapsedMs / 500) + (i * Math.PI / 4)))),
                      transform: `scale(${0.7 + 0.5 * Math.abs(Math.sin((elapsedMs / 500) + (i * Math.PI / 4)))})`,
                      transition: 'opacity 50ms, transform 50ms',
                    }}
                  />
                ))}
              </div>
              <div style={{
                fontSize: 12,
                color: colors.textSecondary,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              }}>
                使用 Python wordcloud 库渲染图片（增强版集成自 AlionSSS/wordcloud-webui）
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {!loading && error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4', fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ {error}</div>
        )}

        {/* 输出区：图片预览 */}
        {!loading && !error && imageData && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>preview ({outputFormat})</span>
              <button
                onClick={handleCopyImage}
                style={{ ...copyBtnStyle, color: colors.textSecondary }}
              >
                Copy
              </button>
            </div>
            <div style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colors.pageBg,
              minHeight: 200,
            }}>
              <img
                src={imageData.startsWith('data:image') ? imageData : `data:image/${outputFormat};base64,${imageData}`}
                alt="wordcloud"
                style={{ maxWidth: '100%', maxHeight: 600, objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && !imageData && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 选择模式并输入数据，点击「生成词云」将在下方预览图片
            <br />
            # 增强版集成自 AlionSSS/wordcloud-webui (Apache-2.0)
          </div>
        )}
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

export default Wordcloud;
