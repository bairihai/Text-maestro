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

const tabGroupStyle: React.CSSProperties = {
  display: 'flex', gap: 0, borderBottom: '1px solid var(--arco-color-border)',
};

const tabBtnActive: React.CSSProperties = {
  padding: '8px 16px', background: 'transparent',
  border: 'none', borderBottom: '2px solid #2f81f7',
  cursor: 'pointer', fontSize: 13, fontWeight: 500,
};

const tabBtnInactive: React.CSSProperties = {
  padding: '8px 16px', background: 'transparent',
  border: 'none', cursor: 'pointer', fontSize: 13,
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

// ------------- utils -------------
function chineseToUnicode(text: string): string {
  return text.split('').map((ch) => {
    const code = ch.charCodeAt(0);
    return '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
  }).join('');
}

function unicodeToChinese(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

// ------------- component -------------
const UnicodeConverter: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'c2u' | 'u2c'>('c2u');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [focused, setFocused] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleConvert = () => {
    if (!input.trim()) { setOutput(''); return; }
    setOutput(tab === 'c2u' ? chineseToUnicode(input) : unicodeToChinese(input));
  };

  const handleCopy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); setToast('已复制'); }
    catch { setToast('复制失败'); }
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M10.9 5.4 6.3 10.3l-2.4-2.4L3 8.7 6.3 12 12 6.4z"/>
        </svg>
        <h1 style={titleStyle}>Unicode / 中文 双向转换</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Unicode converter</span>
      </div>

      <div style={contentStyle}>
        {/* Tab */}
        <div style={tabGroupStyle}>
          <button onClick={() => setTab('c2u')} style={tab === 'c2u' ? tabBtnActive : tabBtnInactive}>
            中文 → Unicode
          </button>
          <button onClick={() => setTab('u2c')} style={tab === 'u2c' ? tabBtnActive : tabBtnInactive}>
            Unicode → 中文
          </button>
        </div>

        {/* Input */}
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>INPUT</div>
            <textarea
              placeholder={tab === 'c2u' ? '例如：你好世界' : '例如：\\u4F60\\u597D\\u4E16\\u754C'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused ? inputFocusStyle : null) }}
            />
          </div>
          <button onClick={handleConvert} style={primaryBtnStyle}>▸ 转换</button>
        </div>

        {/* Output */}
        {output && (
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
            <pre style={getCodeBodyStyle(colors)}>{output}</pre>
          </div>
        )}

        {/* Empty */}
        {!output && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 输入文本并点击「转换」，将在代码块中输出结果
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

export default UnicodeConverter;