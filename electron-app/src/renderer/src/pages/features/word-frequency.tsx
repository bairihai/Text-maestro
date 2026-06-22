import React, { useState } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';

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

const getCodeBodyStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '16px', margin: 0, color: colors.textPrimary,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: 13, lineHeight: '1.6', whiteSpace: 'pre-wrap',
  wordBreak: 'break-all', minHeight: 60,
  userSelect: 'text', WebkitUserSelect: 'text',
});

const copyBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--arco-color-border)', borderRadius: 6, padding: '3px 10px',
  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
};

const primaryBtnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff',
  border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6,
  padding: '5px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  lineHeight: '20px', alignSelf: 'flex-start', transition: 'background 0.15s',
};

const primaryBtnHoverStyle: React.CSSProperties = { background: '#2ea043' };
const disabledBtnStyle: React.CSSProperties = { background: 'rgba(35, 134, 54, 0.5)', cursor: 'not-allowed' };

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

// ------------- component -------------
const WordFrequency: React.FC = () => {
  const { colors } = useTheme();
  // 默认中文示例文本
  const [text, setText] = useState(
    '峻影在云都的柔道馆里练习柔道，云都的天气很好，峻影很喜欢柔道，柔道让峻影感到快乐。'
  );
  const [stopwords, setStopwords] = useState('我,的,和,有,不,是');
  const [customDict, setCustomDict] = useState('峻影,柔道,云都');
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copyHover, setCopyHover] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [textFocused, setTextFocused] = useState(false);
  const [stopFocused, setStopFocused] = useState(false);
  const [dictFocused, setDictFocused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('请输入待分析文本');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setElapsedMs(0);

    // 开始计时动画
    const startTime = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - startTime), 50);

    try {
      const fn = (window as any).electron?.wordFrequency;
      if (typeof fn !== 'function') {
        setError('当前环境不支持词频统计（缺少 wordFrequency IPC 方法）');
        return;
      }
      const res = await fn(text, stopwords, customDict);
      if (!res || res.success === false) {
        setError(res?.error || '词频统计失败');
        return;
      }
      setResult(res.data || {});
    } catch (err) {
      setError((err as Error).message || '词频统计失败');
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  // 将词频结果格式化为文本（按次数降序）
  const resultText = React.useMemo(() => {
    if (!result) return '';
    const entries = Object.entries(result);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.map(([word, count]) => `${word}: ${count}`).join('\n');
  }, [result]);

  const handleCopy = async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      showToast('已复制');
    } catch {
      showToast('复制失败');
    }
  };

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M2 2h12v3H2zm0 4h7v8H2zm9 0h3v8h-3z" />
        </svg>
        <h1 style={titleStyle}>词频统计</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Word frequency</span>
        <span style={pythonBadgeStyle}>python</span>
      </div>

      <div style={contentStyle}>
        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>TEXT</div>
            <textarea
              placeholder="请输入待分析的中文文本..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setTextFocused(true)}
              onBlur={() => setTextFocused(false)}
              style={{ ...getInputStyle(colors), ...textareaStyle, ...(textFocused ? inputFocusStyle : null) }}
            />
          </div>

          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>STOPWORDS（逗号分隔）</div>
            <input
              type="text"
              placeholder="例如: 我,的,和,有,不,是"
              value={stopwords}
              onChange={(e) => setStopwords(e.target.value)}
              onFocus={() => setStopFocused(true)}
              onBlur={() => setStopFocused(false)}
              style={{ ...getInputStyle(colors), ...(stopFocused ? inputFocusStyle : null) }}
            />
          </div>

          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>CUSTOM DICT（自定义分词词典，逗号分隔）</div>
            <input
              type="text"
              placeholder="例如: 峻影,柔道,云都"
              value={customDict}
              onChange={(e) => setCustomDict(e.target.value)}
              onFocus={() => setDictFocused(true)}
              onBlur={() => setDictFocused(false)}
              style={{ ...getInputStyle(colors), ...(dictFocused ? inputFocusStyle : null) }}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            style={{
              ...primaryBtnStyle,
              ...(btnHover && !loading ? primaryBtnHoverStyle : null),
              ...(loading ? disabledBtnStyle : null),
            }}
          >
            {loading ? '统计中...' : '▸ 统计词频'}
          </button>
        </div>

        {/* 加载状态 */}
        {loading && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>正在使用 jieba 分词统计...</span>
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
              {/* 脉冲点动画 */}
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
                使用 Python jieba 进行中文分词
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

        {/* 输出区 */}
        {!loading && !error && result && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>output</span>
              <button
                onClick={handleCopy}
                onMouseEnter={() => setCopyHover(true)}
                onMouseLeave={() => setCopyHover(false)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}
              >
                Copy
              </button>
            </div>
            <pre style={getCodeBodyStyle(colors)}>{resultText || '# 无统计结果'}</pre>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && !result && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 输入文本并点击「统计词频」，将在代码块中输出结果（按次数降序排列）
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

export default WordFrequency;
