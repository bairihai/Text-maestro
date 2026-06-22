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
const FileReaderPage: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'path' | 'upload'>('path');
  const [filePath, setFilePath] = useState('');
  const [pathFocused, setPathFocused] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 通过路径读取文件（安全调用 IPC 方法）
  const handleReadByPath = async () => {
    const p = filePath.trim();
    if (!p) { setOutput(''); setError(null); return; }
    setError(null);
    // 安全调用，若 IPC 方法未注册则提示
    const fn = (window as any).electron?.readFileByPath;
    if (typeof fn !== 'function') {
      setError('该功能需要主进程支持');
      setOutput('');
      return;
    }
    try {
      const content = await fn(p);
      setOutput(content ?? '');
    } catch (e) {
      setError((e as Error).message || '读取失败');
      setOutput('');
    }
  };

  // 通过文件上传读取（FileReader 读取为 utf-8 文本）
  const handleReadByUpload = () => {
    if (!selectedFile) { setError('请先选择文件'); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setOutput(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      setError('文件读取失败');
      setOutput('');
    };
    reader.readAsText(selectedFile, 'utf-8');
  };

  // 统一读取入口
  const handleRead = () => {
    if (tab === 'path') handleReadByPath();
    else handleReadByUpload();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file ?? null);
    setOutput('');
    setError(null);
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
          <path d="M2 1.5A1.5 1.5 0 013.5 0h9A1.5 1.5 0 0114 1.5v13a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 14.5v-13zM3.5 1a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-13a.5.5 0 00-.5-.5h-9zM5 4h6v1H5V4zm0 2h6v1H5V6zm0 2h6v1H5V8zm0 2h4v1H5v-1z"/>
        </svg>
        <h1 style={titleStyle}>文本读取 / 文件内容读取</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· File reader</span>
      </div>

      <div style={contentStyle}>
        {/* Tab 切换 */}
        <div style={tabGroupStyle}>
          <button onClick={() => setTab('path')} style={tab === 'path' ? tabBtnActive : tabBtnInactive}>
            通过路径读取
          </button>
          <button onClick={() => setTab('upload')} style={tab === 'upload' ? tabBtnActive : tabBtnInactive}>
            通过文件上传
          </button>
        </div>

        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          {tab === 'path' ? (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>FILE PATH</div>
              <input
                type="text"
                placeholder="例如：D:\\projects\\test.txt"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                onFocus={() => setPathFocused(true)}
                onBlur={() => setPathFocused(false)}
                style={{ ...getInputStyle(colors), ...(pathFocused ? inputFocusStyle : null) }}
              />
            </div>
          ) : (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>SELECT FILE</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
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
                  {selectedFile ? selectedFile.name : '未选择文件'}
                </span>
              </div>
            </div>
          )}
          <button onClick={handleRead} style={primaryBtnStyle}>▸ 读取</button>
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
            # 选择读取方式并提供文件，点击「读取」后在代码块中输出内容
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

export default FileReaderPage;
