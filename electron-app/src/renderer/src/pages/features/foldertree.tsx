import React, { useState } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';
import { useEverything } from '@renderer/context/EverythingContext';
import { EverythingBadge } from '@renderer/components/EverythingRequiredWrapper';

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

const inputFocusStyle: React.CSSProperties = {
  borderColor: '#2f81f7', boxShadow: '0 0 0 3px rgba(31, 111, 235, 0.4)',
};

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
};

const sliderValueStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontWeight: 600, minWidth: 16, textAlign: 'right',
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

const checkboxGroupStyle: React.CSSProperties = { display: 'flex', gap: 20, alignItems: 'center' };

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', userSelect: 'none',
};

const checkboxStyle: React.CSSProperties = { width: 16, height: 16, cursor: 'pointer', accentColor: '#2f81f7' };

// ---------------- component ----------------
const FolderTree: React.FC = () => {
  const { colors } = useTheme();
  const { isConnected, status } = useEverything();
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
  const [toast, setToast] = useState<string | null>(null);

  // Everything 快速搜索状态
  const [quickSearchPath, setQuickSearchPath] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<string[]>([]);
  const [quickSearchLoading, setQuickSearchLoading] = useState(false);
  const [quickSearched, setQuickSearched] = useState(false);
  const [quickSearchFocused, setQuickSearchFocused] = useState(false);

  const toggleOption = (opt: string) => {
    setOptions((prev) => prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]);
  };

  const handleGenerate = async () => {
    if (!path.trim()) { setError('请输入文件夹路径'); return; }
    setLoading(true); setError(null);
    try {
      const includeStats = options.includes('统计目录信息');
      const result = await (window as any).electron.ipcRenderer.invoke('generate-tree', path, maxDepth, includeStats);
      if (result.error) { setError(result.error); setTree(null); setStats(null); }
      else { setTree(result.tree); setStats(result.stats || null); }
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  // Everything 快速搜索
  const handleQuickSearch = async () => {
    if (!quickSearchPath.trim()) { return; }
    setQuickSearchLoading(true);
    setQuickSearched(true);
    setQuickSearchResults([]);
    try {
      const results = await (window as any).electron.ipcRenderer.invoke(
        'everything-search',
        quickSearchPath.trim(),
        true,  // searchSubdirs
        false, // onlyFiles
        true   // fullPath
      );
      if (Array.isArray(results)) {
        setQuickSearchResults(results);
      }
    } catch (err) {
      console.error('[FolderTree] Everything 搜索失败:', err);
    } finally {
      setQuickSearchLoading(false);
    }
  };

  const handleCopyQuickResults = async () => {
    if (quickSearchResults.length === 0) return;
    try {
      await navigator.clipboard.writeText(quickSearchResults.join('\n'));
      showToast('已复制到剪贴板');
    } catch (err) {
      showToast('复制失败');
    }
  };

  const handleCopy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); showToast('已复制到剪贴板'); }
    catch (err) { showToast('复制失败: ' + (err as Error).message); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); };

  const statsText = stats
    ? `目录总大小:      ${formatSize(stats.totalSize)}
硬盘总大小:      ${formatSize(stats.diskTotal)}
已用空间:        ${formatSize(stats.diskUsed)}
剩余空间:        ${formatSize(stats.diskFree)}
目录占用百分比:  ${stats.percentUsed !== undefined ? stats.percentUsed.toFixed(2) + '%' : '—'}
` : '';

  const treeText = tree ? treeToText(tree) : '';

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M11.5 2h-7C2.67 2 1 3.67 1 5.5v5C1 12.33 2.67 14 4.5 14h7c1.83 0 3.5-1.67 3.5-3.5v-5C15 3.67 13.33 2 11.5 2zm-4 3h3v1h-3V5zm0 3h3v1h-3V8zm0 3h3v1h-3v-1zm-2.5-4a.5.5 0 11-1 0 .5.5 0 011 0zm0 3a.5.5 0 11-1 0 .5.5 0 011 0zm0 3a.5.5 0 11-1 0 .5.5 0 011 0z"/>
        </svg>
        <h1 style={titleStyle}>文件夹目录树生成</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Directory tree generator</span>
      </div>

      <div style={contentStyle}>
        {/* Everything 快速搜索区块 */}
        <div style={{
          ...getConfigBlockStyle(colors),
          border: isConnected ? `1px solid ${colors.border}` : `1px solid #FF8000`,
          opacity: isConnected ? 1 : 0.7,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ ...labelStyle, color: colors.textSecondary, marginBottom: 0 }}>QUICK SEARCH</span>
            <EverythingBadge />
            {!isConnected && (
              <span style={{ fontSize: 11, color: '#FF8000', marginLeft: 'auto' }}>
                未连接 Everything
              </span>
            )}
            {isConnected && status.indexCount > 0 && (
              <span style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 'auto' }}>
                已索引 {status.indexCount.toLocaleString()} 个文件
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="输入文件夹路径进行快速搜索..."
              value={quickSearchPath} onChange={(e) => setQuickSearchPath(e.target.value)}
              onFocus={() => setQuickSearchFocused(true)} onBlur={() => setQuickSearchFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSearch(); }}
              disabled={!isConnected}
              style={{
                ...getInputStyle(colors),
                ...(quickSearchFocused ? inputFocusStyle : null),
                opacity: isConnected ? 1 : 0.5,
                flex: 1,
              }} />
            <button onClick={handleQuickSearch} disabled={!isConnected || quickSearchLoading || !quickSearchPath.trim()}
              style={{
                ...primaryBtnStyle,
                opacity: (!isConnected || !quickSearchPath.trim()) ? 0.5 : 1,
              }}>
              {quickSearchLoading ? '搜索中...' : '▸ 搜索'}
            </button>
          </div>

          {!isConnected && (
            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: 'rgba(255,128,0,0.1)', borderRadius: 4,
              fontSize: 12, color: '#FF8000',
            }}>
              ⚠️ 此功能需要 Everything 后台运行并启用 HTTP API
            </div>
          )}

          {/* 快速搜索结果 */}
          {quickSearched && (
            <div style={{
              marginTop: 12,
              background: colors.pageBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              maxHeight: 200,
              overflow: 'auto',
            }}>
              <div style={{
                ...codeHeaderStyle,
                padding: '6px 12px',
                fontSize: 11,
                color: colors.textSecondary,
              }}>
                <span>搜索结果</span>
                {quickSearchResults.length > 0 && (
                  <button onClick={handleCopyQuickResults}
                    style={{ ...copyBtnStyle, padding: '2px 8px', fontSize: 11 }}>
                    复制全部
                  </button>
                )}
              </div>
              <pre style={{
                ...getCodeBodyStyle(colors),
                padding: '10px 12px',
                fontSize: 12,
                maxHeight: 160,
              }}>
                {quickSearchResults.length > 0
                  ? quickSearchResults.slice(0, 200).join('\n')
                  : quickSearchLoading ? '' : '未找到文件'}
              </pre>
              {quickSearchResults.length > 200 && (
                <div style={{
                  padding: '4px 12px', fontSize: 11, color: colors.textSecondary,
                  borderTop: `1px solid ${colors.border}`,
                }}>
                  ...还有 {quickSearchResults.length - 200} 个结果未显示
                </div>
              )}
            </div>
          )}
        </div>

        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>PATH</div>
            <input type="text" placeholder="例如: D:\projects\my-app"
              value={path} onChange={(e) => setPath(e.target.value)}
              onFocus={() => setPathFocused(true)} onBlur={() => setPathFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              style={{ ...getInputStyle(colors), ...(pathFocused ? inputFocusStyle : null) }} />
          </div>

          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>MAX DEPTH</div>
            <div style={{ ...sliderContainerStyle, color: colors.textSecondary }}>
              <input type="range" min={1} max={10} step={1} value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#2f81f7', cursor: 'pointer' }} />
              <span style={{ ...sliderValueStyle, color: colors.textPrimary }}>{maxDepth}</span>
            </div>
          </div>

          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>OPTIONS</div>
            <div style={checkboxGroupStyle}>
              <label style={{ ...checkboxLabelStyle, color: colors.textPrimary }}>
                <input type="checkbox" checked={options.includes('生成目录树')}
                  onChange={() => toggleOption('生成目录树')} style={checkboxStyle} />
                生成目录树
              </label>
              <label style={{ ...checkboxLabelStyle, color: colors.textPrimary }}>
                <input type="checkbox" checked={options.includes('统计目录信息')}
                  onChange={() => toggleOption('统计目录信息')} style={checkboxStyle} />
                统计目录信息
              </label>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading}
            onMouseEnter={() => setBtnHover(true)} onMouseLeave={() => setBtnHover(false)}
            style={{ ...primaryBtnStyle, ...(btnHover && !loading ? primaryBtnHoverStyle : null), ...(loading ? disabledBtnStyle : null) }}>
            {loading ? '生成中...' : '▸ 生成'}
          </button>
        </div>

        {!loading && error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4', fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ {error}</div>
        )}

        {!loading && !error && tree && options.includes('生成目录树') && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>tree</span>
              <button onClick={() => handleCopy(treeText)}
                onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
            </div>
            <pre style={getCodeBodyStyle(colors)}>{treeText}</pre>
          </div>
        )}

        {!loading && !error && stats && options.includes('统计目录信息') && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>stats</span>
              <button onClick={() => handleCopy(statsText)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
            </div>
            <pre style={getCodeBodyStyle(colors)}>{statsText}</pre>
          </div>
        )}

        {!loading && !error && !tree && !stats && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}># 输入文件夹路径并点击「生成」，将以 Markdown 代码块形式输出结果</div>
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

export default FolderTree;