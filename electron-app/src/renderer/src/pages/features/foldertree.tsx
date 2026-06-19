import React, { useState } from 'react';

/* =========================================================
 * GitHub / Markdown 风格的目录树生成器
 * 参考 GitHub 深色主题配色 (github-dark / Primer)
 *   页面背景  #0d1117    卡片/代码块背景 #161b22
 *   输入框    #0d1117    边框 #30363d
 *   focus     边框 #2f81f7 + 外环 rgba(31,111,235,0.4)
 *   主文字    #e6edf3    次文字 #8b949e
 *   按钮绿    #238636    hover #2ea043
 *   等宽字体  ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
 *   圆角       6px
 * =======================================================*/

// ------------- colors & tokens -------------
const COLORS = {
  pageBg: '#0d1117',
  cardBg: '#161b22',
  border: '#30363d',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  focusRing: 'rgba(31, 111, 235, 0.4)',
  focusBorder: '#2f81f7',
  btnGreen: '#238636',
  btnGreenHover: '#2ea043',
  btnBorder: 'rgba(240,246,252,0.1)',
  inputBg: '#0d1117',
  error: '#f85149',
};

// ------------- types -------------
interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  size?: number;
  children?: TreeNode[];
}

// ------------- helpers -------------
function formatSize(bytes: number): string {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function treeToText(node: TreeNode, depth: number = 0): string {
  const indent = '    '.repeat(depth);
  const suffix = node.type === 'directory' ? '/' : '';
  const sizeText = node.size !== undefined ? `  (${formatSize(node.size)})` : '';
  let text = `${indent}${node.name}${suffix}${sizeText}\n`;
  if (node.children) {
    for (const child of node.children) {
      text += treeToText(child, depth + 1);
    }
  }
  return text;
}

// ---------------- styles ----------------
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'rgba(13, 17, 23, 0.92)',
  color: COLORS.textPrimary,
  display: 'flex',
  flexDirection: 'column',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: `1px solid ${COLORS.border}`,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: 0,
  color: COLORS.textPrimary,
};

const contentStyle: React.CSSProperties = {
  padding: '16px 24px 32px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const configBlockStyle: React.CSSProperties = {
  background: COLORS.cardBg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: COLORS.textSecondary,
  marginBottom: 4,
  fontWeight: 600,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 12px',
  fontSize: 14,
  lineHeight: '20px',
  background: COLORS.inputBg,
  color: COLORS.textPrimary,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  outline: 'none',
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: COLORS.focusBorder,
  boxShadow: `0 0 0 3px ${COLORS.focusRing}`,
};

// slider 自定义（原生 input[type=range]）
const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: COLORS.textSecondary,
  fontSize: 13,
};

const sliderValueStyle: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  color: COLORS.textPrimary,
  fontWeight: 600,
  minWidth: 16,
  textAlign: 'right',
};

// 代码块外观（GitHub 代码围栏）
const codeBlockStyle: React.CSSProperties = {
  background: COLORS.cardBg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const codeHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 12px',
  background: 'rgba(255,255,255,0.03)',
  borderBottom: `1px solid ${COLORS.border}`,
  fontSize: 12,
  color: COLORS.textSecondary,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

const codeBodyStyle: React.CSSProperties = {
  padding: '16px',
  margin: 0,
  color: COLORS.textPrimary,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: 13,
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  overflowX: 'auto',
  userSelect: 'text',
  WebkitUserSelect: 'text',
};

// Copy 按钮 + 通用按钮
const copyBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: COLORS.textSecondary,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 6,
  padding: '3px 10px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
};

const copyBtnHoverStyle: React.CSSProperties = {
  background: COLORS.cardBg,
  color: COLORS.textPrimary,
  borderColor: '#8b949e',
};

const primaryBtnStyle: React.CSSProperties = {
  background: COLORS.btnGreen,
  color: '#fff',
  border: `1px solid rgba(240,246,252,0.1)`,
  borderRadius: 6,
  padding: '5px 16px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  lineHeight: '20px',
  alignSelf: 'flex-start',
  transition: 'background 0.15s',
};

const primaryBtnHoverStyle: React.CSSProperties = {
  background: COLORS.btnGreenHover,
};

const disabledBtnStyle: React.CSSProperties = {
  background: 'rgba(35, 134, 54, 0.5)',
  cursor: 'not-allowed',
};

const checkboxGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  alignItems: 'center',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  color: COLORS.textPrimary,
  cursor: 'pointer',
  userSelect: 'none',
};

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  cursor: 'pointer',
  accentColor: COLORS.focusBorder,
};

// ---------------- component ----------------
const FolderTree: React.FC = () => {
  const [path, setPath] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [options, setOptions] = useState<string[]>(['生成目录树', '统计目录信息']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [copyHover, setCopyHover] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [pathFocused, setPathFocused] = useState(false);

  const toggleOption = (opt: string) => {
    setOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const handleGenerate = async () => {
    if (!path.trim()) {
      setError('请输入文件夹路径');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const includeStats = options.includes('统计目录信息');
      const result = await (window as any).electron.ipcRenderer.invoke(
        'generate-tree',
        path,
        maxDepth,
        includeStats
      );
      if (result.error) {
        setError(result.error);
        setTree(null);
        setStats(null);
      } else {
        setTree(result.tree);
        setStats(result.stats || null);
      }
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 简单 toast：用 Alert 替换
      showToast('已复制到剪贴板');
    } catch (err) {
      showToast('复制失败: ' + (err as Error).message);
    }
  };

  // 简单的 toast 提示（不依赖 Arco）
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const statsText = stats
    ? `目录总大小:      ${formatSize(stats.totalSize)}
硬盘总大小:      ${formatSize(stats.diskTotal)}
已用空间:        ${formatSize(stats.diskUsed)}
剩余空间:        ${formatSize(stats.diskFree)}
目录占用百分比:  ${stats.percentUsed !== undefined ? stats.percentUsed.toFixed(2) + '%' : '—'}
`
    : '';

  const treeText = tree ? treeToText(tree) : '';

  return (
    <div style={pageStyle}>
      {/* ======= 顶栏 ======= */}
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={COLORS.textPrimary}>
          <path d="M11.5 2h-7C2.67 2 1 3.67 1 5.5v5C1 12.33 2.67 14 4.5 14h7c1.83 0 3.5-1.67 3.5-3.5v-5C15 3.67 13.33 2 11.5 2zm-4 3h3v1h-3V5zm0 3h3v1h-3V8zm0 3h3v1h-3v-1zm-2.5-4a.5.5 0 11-1 0 .5.5 0 011 0zm0 3a.5.5 0 11-1 0 .5.5 0 011 0zm0 3a.5.5 0 11-1 0 .5.5 0 011 0z"/>
        </svg>
        <h1 style={titleStyle}>文件夹目录树生成</h1>
        <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>
          · Directory tree generator
        </span>
      </div>

      {/* ======= 内容区 ======= */}
      <div style={contentStyle}>
        {/* --- 配置区 --- */}
        <div style={configBlockStyle}>
          {/* 路径输入 */}
          <div>
            <div style={labelStyle}>PATH</div>
            <input
              type="text"
              placeholder="例如: D:\projects\my-app"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onFocus={() => setPathFocused(true)}
              onBlur={() => setPathFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate();
              }}
              style={{
                ...inputStyle,
                ...(pathFocused ? inputFocusStyle : null),
              }}
            />
          </div>

          {/* 最大深度 */}
          <div>
            <div style={labelStyle}>MAX DEPTH</div>
            <div style={sliderContainerStyle}>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: COLORS.focusBorder,
                  cursor: 'pointer',
                }}
              />
              <span style={sliderValueStyle}>{maxDepth}</span>
            </div>
          </div>

          {/* 选项 */}
          <div>
            <div style={labelStyle}>OPTIONS</div>
            <div style={checkboxGroupStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={options.includes('生成目录树')}
                  onChange={() => toggleOption('生成目录树')}
                  style={checkboxStyle}
                />
                生成目录树
              </label>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={options.includes('统计目录信息')}
                  onChange={() => toggleOption('统计目录信息')}
                  style={checkboxStyle}
                />
                统计目录信息
              </label>
            </div>
          </div>

          {/* 生成按钮 */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                ...primaryBtnStyle,
                ...(btnHover && !loading ? primaryBtnHoverStyle : null),
                ...(loading ? disabledBtnStyle : null),
              }}
            >
              {loading ? '生成中...' : '▸ 生成'}
            </button>
          </div>
        </div>

        {/* --- 错误提示 --- */}
        {!loading && error && (
          <div
            style={{
              background: 'rgba(248,81,73,0.1)',
              border: `1px solid ${COLORS.error}`,
              borderRadius: 6,
              padding: '10px 14px',
              color: '#ffb4b4',
              fontSize: 14,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          >
            ✗ {error}
          </div>
        )}

        {/* --- 目录树 --- */}
        {!loading && !error && tree && options.includes('生成目录树') && (
          <div style={codeBlockStyle}>
            <div style={codeHeaderStyle}>
              <span>tree</span>
              <button
                onClick={() => handleCopy(treeText)}
                onMouseEnter={() => setCopyHover(true)}
                onMouseLeave={() => setCopyHover(false)}
                style={{
                  ...copyBtnStyle,
                  ...(copyHover ? copyBtnHoverStyle : null),
                }}
              >
                Copy
              </button>
            </div>
            <pre style={codeBodyStyle}>{treeText}</pre>
          </div>
        )}

        {/* --- 统计信息 --- */}
        {!loading && !error && stats && options.includes('统计目录信息') && (
          <div style={codeBlockStyle}>
            <div style={codeHeaderStyle}>
              <span>stats</span>
              <button
                onClick={() => handleCopy(statsText)}
                style={{
                  ...copyBtnStyle,
                  ...(copyHover ? copyBtnHoverStyle : null),
                }}
              >
                Copy
              </button>
            </div>
            <pre style={codeBodyStyle}>{statsText}</pre>
          </div>
        )}

        {/* --- 空态 --- */}
        {!loading && !error && !tree && !stats && (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: COLORS.textSecondary,
              fontSize: 13,
              border: `1px dashed ${COLORS.border}`,
              borderRadius: 6,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            }}
          >
            # 输入文件夹路径并点击「生成」，将以 Markdown 代码块形式输出结果
          </div>
        )}
      </div>

      {/* ======= Toast ======= */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: COLORS.cardBg,
            color: COLORS.textPrimary,
            padding: '8px 16px',
            borderRadius: 6,
            border: `1px solid ${COLORS.border}`,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default FolderTree;
