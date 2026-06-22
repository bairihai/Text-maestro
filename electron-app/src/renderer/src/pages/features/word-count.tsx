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
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
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
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const getCodeBodyStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '16px', margin: 0, color: colors.textPrimary,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 13, lineHeight: '1.6', whiteSpace: 'pre-wrap',
  wordBreak: 'break-all', minHeight: 60,
  userSelect: 'text', WebkitUserSelect: 'text',
});

const copyBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--arco-color-border)', borderRadius: 6, padding: '3px 10px',
  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
};

const primaryBtnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff',
  border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6,
  padding: '5px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  lineHeight: '20px', alignSelf: 'flex-start', transition: 'background 0.15s',
};

// 数字卡片样式
const statCardStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  flex: 1, padding: '24px 16px', textAlign: 'center',
  background: colors.inputBg, borderRadius: 6,
  border: `1px solid ${colors.border}`,
});

const statNumberStyle: React.CSSProperties = {
  fontSize: 36, fontWeight: 700, margin: 0, color: '#2f81f7',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 12, marginTop: 8,
  textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: 600,
};

// ------------- utils -------------
// 统计字符数和词数（移植自 Python jieba 分词思路）
// - 总字符数 = text.length（含空格）
// - 总词数：中文按字符计数（每个中文字符算一个词），英文按空格分词计数
function countText(text: string): { chars: number; words: number } {
  const chars = text.length;
  // 匹配中文字符，每个算 1 词
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 移除中文字符后，剩余部分按空格分词计数
  const nonChinese = text.replace(/[\u4e00-\u9fa5]/g, ' ');
  const englishWords = nonChinese.split(/\s+/).filter((s) => s.length > 0).length;
  const words = chineseChars + englishWords;
  return { chars, words };
}

// ------------- component -------------
const WordCount: React.FC = () => {
  const { colors } = useTheme();
  const [input, setInput] = useState('你好世界 Hello World\n这是一个测试文本 testing text');
  const [result, setResult] = useState<{ chars: number; words: number } | null>(null);
  const [focused, setFocused] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleCount = () => {
    if (!input) { setResult({ chars: 0, words: 0 }); return; }
    setResult(countText(input));
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = `总字符数: ${result.chars}\n总词数: ${result.words}`;
    try { await navigator.clipboard.writeText(text); setToast('已复制'); }
    catch { setToast('复制失败'); }
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M2 3h12v1.5H2V3zm0 4h12v1.5H2V7zm0 4h8v1.5H2V11z"/>
          <circle cx="13" cy="11.75" r="1.5"/>
        </svg>
        <h1 style={titleStyle}>字数词数统计</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Word count</span>
      </div>

      <div style={contentStyle}>
        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>INPUT（输入文本）</div>
            <textarea
              placeholder="例如：你好世界 Hello World"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused ? inputFocusStyle : null) }}
            />
          </div>
          <button onClick={handleCount} style={primaryBtnStyle}>▸ 统计</button>
        </div>

        {/* 输出区：数字卡片 */}
        {result && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>result</span>
              <button
                onClick={handleCopy}
                onMouseEnter={() => setCopyHover(true)}
                onMouseLeave={() => setCopyHover(false)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}
              >
                Copy
              </button>
            </div>
            <div style={{ ...getCodeBodyStyle(colors), display: 'flex', gap: 12 }}>
              <div style={statCardStyle(colors)}>
                <div style={statNumberStyle}>{result.chars}</div>
                <div style={{ ...statLabelStyle, color: colors.textSecondary }}>总字符数</div>
              </div>
              <div style={statCardStyle(colors)}>
                <div style={statNumberStyle}>{result.words}</div>
                <div style={{ ...statLabelStyle, color: colors.textSecondary }}>总词数</div>
              </div>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!result && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 输入文本并点击「统计」，将显示字符数和词数
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

export default WordCount;
