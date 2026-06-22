import React, { useState } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';

// PythonBadge 组件（橙色标签，与 Navbar.tsx 中的样式一致）
const PythonBadge: React.FC = () => (
  <span style={{
    backgroundColor: '#FF8000',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: '0.7em',
    color: '#fff',
    fontWeight: 600,
    marginLeft: 8,
    verticalAlign: 'middle',
  }}>
    python
  </span>
);

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
  wordBreak: 'break-all', overflowX: 'auto',
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

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', userSelect: 'none',
};

const checkboxStyle: React.CSSProperties = { width: 16, height: 16, cursor: 'pointer', accentColor: '#2f81f7' };

// ---------------- component ----------------
const WeeklyFolder: React.FC = () => {
  const { colors } = useTheme();
  const [fileList, setFileList] = useState('');
  const [timeFormat, setTimeFormat] = useState('MM.DD-HHmm a');
  const [targetFolder, setTargetFolder] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [autoCreate, setAutoCreate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const [copyHover, setCopyHover] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [fileListFocused, setFileListFocused] = useState(false);
  const [timeFormatFocused, setTimeFormatFocused] = useState(false);
  const [targetFocused, setTargetFocused] = useState(false);
  const [yearFocused, setYearFocused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const handleGenerate = async () => {
    if (!fileList.trim()) { setError('请输入待整理的文件列表'); return; }
    if (!targetFolder.trim()) { setError('请输入目标文件夹路径'); return; }

    setLoading(true); setError(null); setOutput('');

    try {
      const result = await window.electron?.weeklyFolder?.(fileList, timeFormat, targetFolder, year, autoCreate);
      if (result?.success) {
        setOutput(result.data || '');
        showToast('BAT 脚本生成成功');
      } else {
        setError(result?.error || '生成失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); showToast('已复制到剪贴板'); }
    catch (err) { showToast('复制失败: ' + (err as Error).message); }
  };

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/>
        </svg>
        <h1 style={titleStyle}>周回文件夹管理</h1>
        <PythonBadge />
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Weekly folder organizer</span>
      </div>

      <div style={contentStyle}>
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>待整理文件列表（每行一个绝对路径）</div>
            <textarea
              placeholder={'例如:\nD:\\Downloads\\file 01.15-1430 下午.txt\nD:\\Downloads\\file 01.16-0930 上午.txt'}
              value={fileList}
              onChange={(e) => setFileList(e.target.value)}
              onFocus={() => setFileListFocused(true)}
              onBlur={() => setFileListFocused(false)}
              style={{ ...getInputStyle(colors), ...textareaStyle, ...(fileListFocused ? inputFocusStyle : null) }}
            />
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>文件名时间格式</div>
              <input type="text" placeholder="MM.DD-HHmm a"
                value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)}
                onFocus={() => setTimeFormatFocused(true)} onBlur={() => setTimeFormatFocused(false)}
                style={{ ...getInputStyle(colors), ...(timeFormatFocused ? inputFocusStyle : null) }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>年份</div>
              <input type="number" min={2000} max={2100}
                value={year} onChange={(e) => setYear(Number(e.target.value))}
                onFocus={() => setYearFocused(true)} onBlur={() => setYearFocused(false)}
                style={{ ...getInputStyle(colors), ...(yearFocused ? inputFocusStyle : null) }} />
            </div>
          </div>

          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>目标文件夹路径</div>
            <input type="text" placeholder="例如: D:\\Sorted\\Weekly"
              value={targetFolder} onChange={(e) => setTargetFolder(e.target.value)}
              onFocus={() => setTargetFocused(true)} onBlur={() => setTargetFocused(false)}
              style={{ ...getInputStyle(colors), ...(targetFocused ? inputFocusStyle : null) }} />
          </div>

          <div>
            <label style={{ ...checkboxLabelStyle, color: colors.textPrimary }}>
              <input type="checkbox" checked={autoCreate}
                onChange={() => setAutoCreate((v) => !v)} style={checkboxStyle} />
              自动创建不存在的周回文件夹
            </label>
          </div>

          <button onClick={handleGenerate} disabled={loading}
            onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)}
            style={{ ...primaryBtnStyle, ...(btnHover && !loading ? primaryBtnHoverStyle : null), ...(loading ? disabledBtnStyle : null) }}>
            {loading ? '生成中...' : '▸ 生成 BAT'}
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4', fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ {error}</div>
        )}

        {output && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>weekly_organize.bat</span>
              <button onClick={handleCopy}
                onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
            </div>
            <pre style={getCodeBodyStyle(colors)}>{output}</pre>
          </div>
        )}

        {!output && !error && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}># 输入文件列表并点击「生成 BAT」，将在代码块中输出周回文件夹整理脚本</div>
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

export default WeeklyFolder;
