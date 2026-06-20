import React, { useState } from 'react';
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

const getInputStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  width: '100%', padding: '5px 12px', fontSize: 14, lineHeight: '20px',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 6, outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
});

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
  cursor: 'pointer', userSelect: 'none',
};

const checkboxStyle: React.CSSProperties = {
  width: 14, height: 14, cursor: 'pointer', accentColor: '#2f81f7',
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
  wordBreak: 'break-all', userSelect: 'text', WebkitUserSelect: 'text',
  minHeight: 80,
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

// ---- component ----
const RegexFiler: React.FC = () => {
  const { colors } = useTheme();
  const [fileList, setFileList] = useState('D:\\projects\\my-app\\src\\index.js\nD:\\projects\\my-app\\src\\utils\\helpers.js\nD:\\projects\\my-app\\src\\assets\\logo.svg\nD:\\projects\\my-app\\README.md\nD:\\projects\\my-app\\package.json\nC:\\Users\\admin\\Desktop\\notes.txt');
  const [pattern, setPattern] = useState('.*\\.(js|ts|tsx)$');
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [listFocused, setListFocused] = useState(false);
  const [patternFocused, setPatternFocused] = useState(false);
  const [matches, setMatches] = useState<string[] | null>(null);
  const [unmatches, setUnmatches] = useState<string[] | null>(null);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [copyHover, setCopyHover] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleFilter = () => {
    try {
      const flags = caseSensitive ? '' : 'i';
      const regex = new RegExp(pattern, flags);
      const matched: string[] = [];
      const unmatched: string[] = [];
      for (const line of fileList.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (regex.test(trimmed)) matched.push(trimmed);
        else unmatched.push(trimmed);
      }
      setMatches(matched);
      setUnmatches(unmatched);
      setRegexError(null);
    } catch (e) {
      setRegexError((e as Error).message);
      setMatches(null);
      setUnmatches(null);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setToast(`${label} 已复制`); }
    catch { setToast('复制失败'); }
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M2 2.5A1.5 1.5 0 013.5 1h9A1.5 1.5 0 0114 2.5v11a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-11zM3.5 2v11h10V2h-10z"/>
        </svg>
        <h1 style={titleStyle}>正则筛选 / 文件列表过滤</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Regex filter</span>
      </div>

      <div style={contentStyle}>
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>FILE LIST（每行一个路径）</div>
            <textarea
              value={fileList}
              onChange={(e) => setFileList(e.target.value)}
              onFocus={() => setListFocused(true)} onBlur={() => setListFocused(false)}
              style={{
                ...textareaStyle,
                background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`,
                ...(listFocused ? inputFocusStyle : null),
              }}
            />
          </div>

          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>REGEX PATTERN</div>
            <input type="text" placeholder="例如：.*\\.(js|ts|tsx)$"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              onFocus={() => setPatternFocused(true)} onBlur={() => setPatternFocused(false)}
              style={{ ...getInputStyle(colors), ...(patternFocused ? inputFocusStyle : null) }} />
          </div>

          <label style={{ ...checkboxLabelStyle, color: colors.textPrimary }}>
            <input type="checkbox" checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)} style={checkboxStyle} />
            区分大小写
          </label>

          <button onClick={handleFilter} style={primaryBtnStyle}>▸ 筛选</button>
        </div>

        {regexError && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4',
            fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ 正则表达式错误：{regexError}</div>
        )}

        {matches && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>matched · {matches.length} 行</span>
              <button onClick={() => handleCopy(matches.join('\n'), 'matched')}
                onMouseEnter={() => setCopyHover('match')} onMouseLeave={() => setCopyHover(null)}
                style={{ ...copyBtnStyle, color: copyHover === 'match' ? colors.textPrimary : colors.textSecondary }}>Copy</button>
            </div>
            <pre style={getCodeBodyStyle(colors)}>{matches.length ? matches.join('\n') : '（无匹配结果）'}</pre>
          </div>
        )}

        {unmatches && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>unmatched · {unmatches.length} 行</span>
              <button onClick={() => handleCopy(unmatches.join('\n'), 'unmatched')}
                onMouseEnter={() => setCopyHover('unmatch')} onMouseLeave={() => setCopyHover(null)}
                style={{ ...copyBtnStyle, color: copyHover === 'unmatch' ? colors.textPrimary : colors.textSecondary }}>Copy</button>
            </div>
            <pre style={getCodeBodyStyle(colors)}>{unmatches.length ? unmatches.join('\n') : '（全部匹配）'}</pre>
          </div>
        )}

        {!matches && !regexError && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 粘贴文件列表并输入正则表达式，点击「筛选」后在代码块中输出结果
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

export default RegexFiler;