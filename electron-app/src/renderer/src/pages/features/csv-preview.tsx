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

// 简单 CSV 解析器：按逗号分割字段，处理双引号包裹的字段（引号内的逗号不算分隔符）
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        // 双引号转义："" 表示一个字面量 "
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else if (ch === '\r') {
        // 跳过 \r，由 \n 统一处理换行
      } else {
        field += ch;
      }
    }
  }
  // 处理最后一个字段
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 过滤掉完全空的行
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

// ------------- component -------------
type Tab = 'paste' | 'file';

const CsvPreview: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('paste');
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 预览粘贴的 CSV 文本
  const handlePreview = () => {
    if (!csvText.trim()) { setRows(null); return; }
    try {
      const parsed = parseCSV(csvText);
      if (parsed.length === 0) { setRows(null); return; }
      setRows(parsed);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setRows(null);
    }
  };

  // 读取上传的 CSV 文件（按 UTF-8 读取，规避 WPS 默认 GBK 乱码）
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // 去除可能的 BOM 头
      const text = String(e.target?.result || '').replace(/^\uFEFF/, '');
      setCsvText(text);
      try {
        const parsed = parseCSV(text);
        setRows(parsed.length ? parsed : null);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setRows(null);
      }
    };
    reader.onerror = () => {
      setError('文件读取失败');
      setRows(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  // 复制为 CSV 文本
  const handleCopy = async () => {
    if (!rows) return;
    const text = rows.map(r => r.join(',')).join('\n');
    try { await navigator.clipboard.writeText(text); setToast('已复制'); }
    catch { setToast('复制失败'); }
    setTimeout(() => setToast(null), 1800);
  };

  const headerRow = rows && rows.length > 0 ? rows[0] : [];
  const bodyRows = rows && rows.length > 1 ? rows.slice(1) : [];

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke={colors.textPrimary} strokeWidth="1.2">
          <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
          <line x1="2" y1="6" x2="14" y2="6" />
          <line x1="2" y1="9.5" x2="14" y2="9.5" />
          <line x1="6" y1="2.5" x2="6" y2="13.5" />
          <line x1="10" y1="2.5" x2="10" y2="13.5" />
        </svg>
        <h1 style={titleStyle}>CSV 预览</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· CSV preview</span>
      </div>

      <div style={contentStyle}>
        {/* Tab 切换 */}
        <div style={tabGroupStyle}>
          <button onClick={() => { setTab('paste'); setRows(null); setError(null); }} style={tab === 'paste' ? tabBtnActive : tabBtnInactive}>
            粘贴文本
          </button>
          <button onClick={() => { setTab('file'); setRows(null); setError(null); }} style={tab === 'file' ? tabBtnActive : tabBtnInactive}>
            文件上传
          </button>
        </div>

        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          {tab === 'paste' ? (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>CSV 文本</div>
              <textarea
                placeholder={'例如：\nname,age,city\n张三,20,北京\n李四,25,"上海,浦东"'}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused ? inputFocusStyle : null) }}
              />
            </div>
          ) : (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>上传 CSV 文件（UTF-8 读取，规避 WPS 默认 GBK 乱码）</div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                style={{ fontSize: 13, color: colors.textPrimary }}
              />
            </div>
          )}

          {tab === 'paste' && (
            <button onClick={handlePreview} style={primaryBtnStyle}>▸ 预览</button>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4',
            fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ 解析错误：{error}</div>
        )}

        {/* 输出表格 */}
        {rows && rows.length > 0 && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>preview · {rows.length} 行</span>
              <button
                onClick={handleCopy}
                onMouseEnter={() => setCopyHover(true)}
                onMouseLeave={() => setCopyHover(false)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}
              >
                Copy
              </button>
            </div>
            <div style={{ overflow: 'auto', maxHeight: 480 }}>
              <table style={{
                borderCollapse: 'collapse', width: '100%',
                fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              }}>
                <thead>
                  <tr>
                    {headerRow.map((cell, i) => (
                      <th key={i} style={{
                        border: `1px solid ${colors.border}`,
                        padding: '6px 12px', textAlign: 'left',
                        background: 'rgba(255,255,255,0.05)',
                        fontWeight: 600, color: colors.textPrimary,
                        whiteSpace: 'nowrap', position: 'sticky', top: 0,
                      }}>{cell}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((r, ri) => (
                    // 斑马纹：偶数行透明，奇数行轻微高亮
                    <tr key={ri} style={{
                      background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)',
                    }}>
                      {r.map((cell, ci) => (
                        <td key={ci} style={{
                          border: `1px solid ${colors.border}`,
                          padding: '6px 12px', color: colors.textPrimary,
                          whiteSpace: 'nowrap',
                        }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!rows && !error && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # {tab === 'paste' ? '粘贴 CSV 文本并点击「预览」' : '上传 CSV 文件'}，将以表格形式渲染
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

export default CsvPreview;
