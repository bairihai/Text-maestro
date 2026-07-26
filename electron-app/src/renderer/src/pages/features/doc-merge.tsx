import React, { useState, useRef } from 'react';
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

// 文件选择按钮样式（适配深色/浅色主题）
const getFileBtnStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '5px 12px', fontSize: 13, cursor: 'pointer',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 6,
  fontFamily: 'inherit', whiteSpace: 'nowrap',
});

// ------------- component -------------
const DocMerge: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'text' | 'csv'>('text');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setSelectedFiles(Array.from(files));
    setOutput('');
    setError(null);
  };

  // 文本拼接：逐个读取文件内容，用 \n\n 分隔拼接
  const handleMergeText = () => {
    if (selectedFiles.length === 0) { setError('请先选择文件'); return; }
    setError(null);
    const results: string[] = [];
    let done = 0;
    const total = selectedFiles.length;
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        results.push(String(reader.result ?? ''));
        done++;
        if (done === total) {
          setOutput(results.join('\n\n'));
        }
      };
      reader.onerror = () => {
        setError(`读取文件失败：${file.name}`);
        done++;
        if (done === total && results.length > 0) {
          setOutput(results.join('\n\n'));
        }
      };
      reader.readAsText(file, 'utf-8');
    });
  };

  // CSV 拼接：第一个文件保留表头，后续文件跳过表头行
  const handleMergeCsv = () => {
    if (selectedFiles.length === 0) { setError('请先选择文件'); return; }
    setError(null);
    const allLines: string[] = [];
    let done = 0;
    const total = selectedFiles.length;
    let headerKept = false;
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
        if (!headerKept && lines.length > 0) {
          // 第一个文件：保留表头及所有行
          allLines.push(...lines);
          headerKept = true;
        } else {
          // 后续文件：跳过表头行
          allLines.push(...lines.slice(1));
        }
        done++;
        if (done === total) {
          setOutput(allLines.join('\n'));
        }
      };
      reader.onerror = () => {
        setError(`读取文件失败：${file.name}`);
        done++;
        if (done === total && allLines.length > 0) {
          setOutput(allLines.join('\n'));
        }
      };
      reader.readAsText(file, 'utf-8');
    });
  };

  // 统一拼接入口
  const handleMerge = () => {
    if (tab === 'text') handleMergeText();
    else handleMergeCsv();
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
          <path d="M1 2h6v1H1V2zm0 3h6v1H1V5zm0 3h6v1H1V8zm0 3h6v1H1v-1zM9 2h6v1H9V2zm0 3h6v1H9V5zm0 3h6v1H9V8zm0 3h6v1H9v-1z"/>
        </svg>
        <h1 style={titleStyle}>多文档拼接 / 文本合并</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Doc merge</span>
      </div>

      <div style={contentStyle}>
        {/* Tab 切换 */}
        <div style={tabGroupStyle}>
          <button onClick={() => setTab('text')} style={tab === 'text' ? tabBtnActive : tabBtnInactive}>
            文本拼接
          </button>
          <button onClick={() => setTab('csv')} style={tab === 'csv' ? tabBtnActive : tabBtnInactive}>
            CSV 拼接
          </button>
        </div>

        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>
              {tab === 'text' ? 'SELECT FILES（多选）' : 'SELECT CSV FILES（多选）'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={tab === 'csv' ? '.csv' : undefined}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={getFileBtnStyle(colors)}
              >
                选择文件
              </button>
              <span style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>
                {selectedFiles.length > 0
                  ? `已选 ${selectedFiles.length} 个文件：${selectedFiles.map((f) => f.name).join(', ')}`
                  : '未选择文件'}
              </span>
            </div>
          </div>
          <button onClick={handleMerge} style={primaryBtnStyle}>▸ 拼接</button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4',
            fontSize: 14, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ {error}</div>
        )}

        {/* 输出区 */}
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
            <textarea
              readOnly
              value={output}
              style={{
                ...getCodeBodyStyle(colors),
                border: 'none', outline: 'none', resize: 'vertical',
                background: 'transparent', width: '100%', display: 'block',
                minHeight: 120,
              }}
            />
          </div>
        )}

        {/* 空状态 */}
        {!output && !error && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 选择多个文件并点击「拼接」，将在代码块中输出合并结果
          </div>
        )}
      </div>

      {/* Toast 提示 */}
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

export default DocMerge;
