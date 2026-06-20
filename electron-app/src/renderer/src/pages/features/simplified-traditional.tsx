import React, { useState } from 'react';
import { Converter } from 'opencc-js';
import { useTheme } from '@renderer/context/ThemeContext';

// ---------------- styles ----------------
const getPageStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  minHeight: '100vh', background: colors.pageBg,
  color: colors.textPrimary, display: 'flex', flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
});

const headerStyle: React.CSSProperties = {
  padding: '16px 20px', borderBottom: '1px solid var(--arco-color-border)',
  display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
};

const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 600, margin: 0 };

const contentStyle: React.CSSProperties = {
  padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16,
};

const getConfigBlockStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
});

const labelStyle: React.CSSProperties = {
  fontSize: 12, marginBottom: 4,
  fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '5px 12px', fontSize: 14, lineHeight: '20px',
  borderRadius: 6, outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
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
  userSelect: 'text', WebkitUserSelect: 'text', minHeight: 80,
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
  lineHeight: '20px', alignSelf: 'flex-start',
};

// ---- converters ----
const s2t = Converter({ from: 'cn', to: 'tw' });
const t2s = Converter({ from: 'tw', to: 'cn' });

// ---- component ----
const SimplifiedTraditional: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'s2t' | 't2s'>('s2t');
  const [input, setInput] = useState('这是简体中文的测试文本。');
  const [output, setOutput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleConvert = () => {
    if (!input.trim()) { setOutput(''); return; }
    setOutput(tab === 's2t' ? s2t(input) : t2s(input));
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
          <path d="M3 2h10v2H3V2zm0 4h10v2H3V6zm0 4h10v2H3v-2z"/>
        </svg>
        <h1 style={titleStyle}>简体 / 繁体中文 转换</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Chinese S/T converter</span>
      </div>

      <div style={contentStyle}>
        <div style={tabGroupStyle}>
          <button onClick={() => { setTab('s2t'); setOutput(''); }} style={tab === 's2t' ? tabBtnActive : tabBtnInactive}>简体 → 繁体</button>
          <button onClick={() => { setTab('t2s'); setOutput(''); }} style={tab === 't2s' ? tabBtnActive : tabBtnInactive}>繁体 → 简体</button>
        </div>

        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>INPUT 文本</div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setInputFocused(true)} onBlur={() => setInputFocused(false)}
              style={{
                ...textareaStyle,
                background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`,
                ...(inputFocused ? inputFocusStyle : null),
              }}
            />
          </div>
          <button onClick={handleConvert} style={primaryBtnStyle}>▸ 转换</button>
        </div>

        {output && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>output</span>
              <button onClick={handleCopy}
                onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
            </div>
            <pre style={getCodeBodyStyle(colors)}>{output}</pre>
          </div>
        )}

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

export default SimplifiedTraditional;