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
  borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 16,
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
  lineHeight: '20px', alignSelf: 'flex-start',
};

const sliderRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  fontSize: 13,
};

// ---- utils ----
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).toUpperCase().padStart(2, '0');
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace('#', '').trim().match(/^([0-9a-fA-F]{6})$/);
  if (!m) return null;
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
  };
}

// ---- component ----
const ColorConverter: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'rgb2hex' | 'hex2rgb'>('rgb2hex');
  const [r, setR] = useState(47);
  const [g, setG] = useState(129);
  const [b, setB] = useState(247);
  const [hex, setHex] = useState('2F81F7');
  const [hexFocused, setHexFocused] = useState(false);
  const [rFocused, setRFocused] = useState(false);
  const [gFocused, setGFocused] = useState(false);
  const [bFocused, setBFocused] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const previewHex = tab === 'rgb2hex'
    ? `#${rgbToHex(r, g, b)}`
    : `#${hex}`;

  const handleRgb2Hex = () => {
    setHex(rgbToHex(r, g, b));
  };

  const handleHex2Rgb = () => {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    setR(rgb.r); setG(rgb.g); setB(rgb.b);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); showToast('已复制'); }
    catch { showToast('复制失败'); }
  };

  const hexOutput = hexToRgb(hex);
  const hexValid = hexOutput !== null;

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <circle cx="3.5" cy="8" r="2.5" fill="#f85149" />
          <circle cx="8" cy="8" r="2.5" fill="#d29922" />
          <circle cx="12.5" cy="8" r="2.5" fill="#238636" />
        </svg>
        <h1 style={titleStyle}>RGB / 十六进制颜色码 双向转换</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Color code converter</span>
      </div>

      <div style={contentStyle}>
        <div style={tabGroupStyle}>
          <button onClick={() => setTab('rgb2hex')} style={tab === 'rgb2hex' ? tabBtnActive : tabBtnInactive}>RGB → Hex</button>
          <button onClick={() => setTab('hex2rgb')} style={tab === 'hex2rgb' ? tabBtnActive : tabBtnInactive}>Hex → RGB</button>
        </div>

        {/* RGB to Hex */}
        {tab === 'rgb2hex' && (
          <>
            <div style={getConfigBlockStyle(colors)}>
              <div style={{ height: 48, borderRadius: 6, border: `1px solid ${colors.border}`, background: `rgb(${r}, ${g}, ${b})` }} />
              {[{ label: 'R', v: r, set: setR, focus: rFocused, setFocus: setRFocused },
                { label: 'G', v: g, set: setG, focus: gFocused, setFocus: setGFocused },
                { label: 'B', v: b, set: setB, focus: bFocused, setFocus: setBFocused },
              ].map((it) => (
                <div key={it.label}>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>{it.label} ({it.v})</div>
                  <div style={{ ...sliderRowStyle, color: colors.textSecondary }}>
                    <input type="range" min={0} max={255} value={it.v}
                      onChange={(e) => it.set(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }} />
                    <input type="number" min={0} max={255} value={it.v}
                      onChange={(e) => it.set(Number(e.target.value))}
                      onFocus={() => it.setFocus(true)} onBlur={() => it.setFocus(false)}
                      style={{ width: 80, ...getInputStyle(colors), ...(it.focus ? inputFocusStyle : null) }} />
                  </div>
                </div>
              ))}
              <button onClick={handleRgb2Hex} style={primaryBtnStyle}>▸ 转换</button>
            </div>

            <div style={getCodeBlockStyle(colors)}>
              <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
                <span>hex</span>
                <button onClick={() => handleCopy(`#${rgbToHex(r, g, b)}`)}
                  onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                  style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
              </div>
              <pre style={getCodeBodyStyle(colors)}>#{rgbToHex(r, g, b)}</pre>
            </div>
          </>
        )}

        {/* Hex to RGB */}
        {tab === 'hex2rgb' && (
          <>
            <div style={getConfigBlockStyle(colors)}>
              <div style={{ height: 48, borderRadius: 6, border: `1px solid ${colors.border}`, background: hexValid ? previewHex : colors.cardBg }} />
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>HEX</div>
                <input type="text" placeholder="例如: FF8000 或 #FF8000"
                  value={hex}
                  onChange={(e) => setHex(e.target.value.replace('#', '').trim().toUpperCase())}
                  onFocus={() => setHexFocused(true)} onBlur={() => setHexFocused(false)}
                  style={{ ...getInputStyle(colors), ...(hexFocused ? inputFocusStyle : null) }} />
              </div>
              <button onClick={handleHex2Rgb} style={primaryBtnStyle}>▸ 转换</button>
            </div>

            <div style={getCodeBlockStyle(colors)}>
              <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
                <span>rgb</span>
                <button onClick={() => hexOutput && handleCopy(`rgb(${hexOutput.r}, ${hexOutput.g}, ${hexOutput.b})`)}
                  onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                  style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
              </div>
              <pre style={getCodeBodyStyle(colors)}>
                {hexValid
                  ? `R: ${hexOutput.r}\nG: ${hexOutput.g}\nB: ${hexOutput.b}\n\nrgb(${hexOutput.r}, ${hexOutput.g}, ${hexOutput.b})`
                  : '无效的 HEX 颜色码（需要 6 位十六进制字符）'}
              </pre>
            </div>
          </>
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

export default ColorConverter;