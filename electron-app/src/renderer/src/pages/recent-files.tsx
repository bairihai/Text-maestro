import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';

// ------------- types -------------
// 与 preload/index.d.ts 中的 RecentEntry 保持结构一致
interface RecentEntry {
  path: string;
  type: 'file' | 'directory';
  source?: string;
  timestamp: number;
  useCount: number;
}

// ------------- helpers -------------

// 来源标识 → 用户友好标签
const SOURCE_LABELS: Record<string, string> = {
  'folder-tree': '目录树',
  'file-reader': '文件读取',
  'multi-file-reader': '批量读取',
  'weekly-folder': '周回文件夹',
  'wordcloud-font': '词云·字体',
  'wordcloud-mask': '词云·蒙版',
  'wordcloud-mask-color': '词云·蒙版色',
  'wordcloud-stopwords': '词云·停用词',
  'wordcloud-userdict': '词云·自定义词',
  'qrcode-logo': '二维码·Logo',
  'wechat-font': '微信·字体',
  'workflow-select-folder': '工作流·选择目录',
  'workflow-save-folder': '工作流·输出目录',
  'workflow-list-files': '工作流·扫描目录',
  'workflow-write-directory': '工作流·写入目录',
};

function formatSource(source?: string): string {
  if (!source) return '其他';
  return SOURCE_LABELS[source] || source;
}

// 相对时间格式化：刚刚 / N 分钟前 / N 小时前 / N 天前 / 超过一周
function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  // 超过一周回退到日期
  try {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return '—';
  }
}

// 路径分两段：父目录（灰） + 末段名（亮）
function splitPath(p: string): { parent: string; name: string } {
  if (!p) return { parent: '', name: '' };
  // 同时兼容 / 和 \
  const norm = p.replace(/\\/g, '/');
  const idx = norm.lastIndexOf('/');
  if (idx < 0) return { parent: '', name: p };
  // parent 保留原始分隔符风格
  return { parent: p.substring(0, idx + 1), name: p.substring(idx + 1) };
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
  padding: '16px 24px 32px',
  display: 'flex', flexDirection: 'column', gap: 16,
  flex: 1,
};

const getToolbarStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
});

const filterBtnActiveStyle: React.CSSProperties = {
  padding: '4px 12px', fontSize: 12, cursor: 'pointer',
  background: '#2f81f7', color: '#fff',
  border: '1px solid #2f81f7', borderRadius: 14,
};

const getFilterBtnStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '4px 12px', fontSize: 12, cursor: 'pointer',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 14,
});

const getGhostBtnStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '4px 12px', fontSize: 12, cursor: 'pointer',
  background: 'transparent', color: colors.textSecondary,
  border: `1px solid ${colors.border}`, borderRadius: 6,
  fontFamily: 'inherit',
});

const dangerGhostBtnHoverStyle: React.CSSProperties = {
  color: '#ffb4b4', borderColor: '#f85149',
};

const getListStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, overflow: 'hidden',
});

const getRowStyle = (
  colors: ReturnType<typeof useTheme>['colors'],
  isHover: boolean,
  resolvedTheme: 'light' | 'dark',
): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: '28px 1fr auto',
  alignItems: 'center', gap: 12,
  padding: '10px 14px',
  borderBottom: `1px solid ${colors.border}`,
  background: isHover ? (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent',
  transition: 'background 0.1s',
});

const pathNameStyle: React.CSSProperties = {
  fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  color: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const pathParentStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  fontSize: 12, color: colors.textSecondary,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
});

const metaStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: colors.textSecondary,
  marginTop: 2, flexWrap: 'wrap',
});

const tagStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '1px 6px', fontSize: 10, borderRadius: 3,
  border: `1px solid ${colors.border}`, color: colors.textSecondary,
  background: colors.inputBg,
});

const actionBtnStyle: React.CSSProperties = {
  padding: '3px 8px', fontSize: 11, cursor: 'pointer',
  background: 'transparent', border: '1px solid var(--arco-color-border)',
  borderRadius: 4, fontFamily: 'inherit', color: 'inherit',
};

// ---------------- component ----------------
const RecentFilesPage: React.FC = () => {
  const { colors, resolvedTheme } = useTheme();
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'file' | 'directory'>('all');
  const [search, setSearch] = useState('');
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [clearHover, setClearHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  // 拉取列表
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.electron.recentList();
      setEntries(Array.isArray(list) ? list : []);
    } catch (err) {
      setError((err as Error).message || '读取失败');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 过滤 + 搜索
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false;
      if (search.trim() && !e.path.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [entries, filter, search]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制路径');
    } catch {
      showToast('复制失败');
    }
  };

  const handleOpen = async (entry: RecentEntry) => {
    try {
      // open-folder 仅对目录生效；对文件则打开其所在目录
      const target = entry.type === 'directory' ? entry.path : entry.path.replace(/[\\/][^\\/]+$/, '');
      const res = await window.electron.openFolder(target);
      if (!res.success) {
        showToast(res.error || '打开失败');
      }
    } catch (err) {
      showToast('打开失败: ' + (err as Error).message);
    }
  };

  const handleRemove = async (path: string) => {
    try {
      const list = await window.electron.recentRemove(path);
      setEntries(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast('删除失败: ' + (err as Error).message);
    }
  };

  const handleClear = async () => {
    if (entries.length === 0) return;
    if (!window.confirm(`确认清空全部 ${entries.length} 条记录？此操作不可撤销。`)) return;
    try {
      const list = await window.electron.recentClear();
      setEntries(Array.isArray(list) ? list : []);
      showToast('已清空');
    } catch (err) {
      showToast('清空失败: ' + (err as Error).message);
    }
  };

  const counts = useMemo(() => {
    let files = 0, dirs = 0;
    for (const e of entries) {
      if (e.type === 'file') files++;
      else dirs++;
    }
    return { total: entries.length, files, dirs };
  }, [entries]);

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M6 2.5a.5.5 0 01.5-.5h7a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-11zM2 4.5a.5.5 0 01.5-.5H5v1H3v9h2v1H2.5a.5.5 0 01-.5-.5v-10zm3.5 0a.5.5 0 01.5.5v6.793l1.146-1.147a.5.5 0 01.708.708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 11.708-.708L6 11.793V5.5a.5.5 0 01.5-.5H5.5z"/>
        </svg>
        <h1 style={titleStyle}>最近使用</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Recent files & directories</span>
        <span style={{ marginLeft: 'auto', color: colors.textSecondary, fontSize: 11 }}>
          {counts.total > 0 ? `共 ${counts.total} 条（${counts.dirs} 目录 / ${counts.files} 文件）` : ''}
        </span>
      </div>

      <div style={contentStyle}>
        {/* 工具栏：过滤 + 搜索 + 刷新/清空 */}
        <div style={getToolbarStyle(colors)}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setFilter('all')}
              style={filter === 'all' ? filterBtnActiveStyle : getFilterBtnStyle(colors)}
            >全部</button>
            <button
              onClick={() => setFilter('directory')}
              style={filter === 'directory' ? filterBtnActiveStyle : getFilterBtnStyle(colors)}
            >目录</button>
            <button
              onClick={() => setFilter('file')}
              style={filter === 'file' ? filterBtnActiveStyle : getFilterBtnStyle(colors)}
            >文件</button>
          </div>
          <input
            type="text"
            placeholder="搜索路径..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '5px 12px', fontSize: 13,
              background: colors.inputBg, color: colors.textPrimary,
              border: `1px solid ${colors.border}`, borderRadius: 6, outline: 'none',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              boxSizing: 'border-box',
            }}
          />
          <button onClick={refresh} style={getGhostBtnStyle(colors)}>刷新</button>
          <button
            onClick={handleClear}
            disabled={entries.length === 0}
            onMouseEnter={() => setClearHover(true)}
            onMouseLeave={() => setClearHover(false)}
            style={{
              ...getGhostBtnStyle(colors),
              ...(clearHover && entries.length > 0 ? dangerGhostBtnHoverStyle : null),
              opacity: entries.length === 0 ? 0.5 : 1,
              cursor: entries.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >清空全部</button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4', fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ {error}</div>
        )}

        {/* 列表 */}
        {!loading && !error && filtered.length > 0 && (
          <div style={getListStyle(colors)}>
            {filtered.map((entry) => {
              const { parent, name } = splitPath(entry.path);
              const isHover = hoveredPath === entry.path;
              return (
                <div
                  key={entry.path}
                  onMouseEnter={() => setHoveredPath(entry.path)}
                  onMouseLeave={() => setHoveredPath(null)}
                  style={getRowStyle(colors, isHover, resolvedTheme)}
                >
                  {/* 类型图标 */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {entry.type === 'directory' ? (
                      <svg width="18" height="18" viewBox="0 0 16 16" fill={colors.textSecondary}>
                        <path d="M1.5 2A1.5 1.5 0 003 .5h3.379a1.5 1.5 0 011.06.44L8.062 1.5h4.438A1.5 1.5 0 0114 3v8.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5V2z"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 16 16" fill={colors.textSecondary}>
                        <path d="M4 1.5A1.5 1.5 0 015.5 0h5A1.5 1.5 0 0112 1.5V3h.5A1.5 1.5 0 0114 4.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 13.5v-11zm1 1V13h6V2.5H5zm1 2h4v1H6V5zm0 2h4v1H6V7zm0 2h3v1H6V9z"/>
                      </svg>
                    )}
                  </div>
                  {/* 路径 + 元信息 */}
                  <div style={{ minWidth: 0 }}>
                    <div style={pathNameStyle} title={entry.path}>
                      {parent && <span style={pathParentStyle(colors)}>{parent}</span>}
                      <span style={{ color: colors.textPrimary }}>{name}</span>
                    </div>
                    <div style={metaStyle(colors)}>
                      <span style={tagStyle(colors)}>{entry.type === 'directory' ? '目录' : '文件'}</span>
                      {entry.source && <span style={tagStyle(colors)}>{formatSource(entry.source)}</span>}
                      <span>使用 {entry.useCount} 次</span>
                      <span>·</span>
                      <span>{formatRelativeTime(entry.timestamp)}</span>
                    </div>
                  </div>
                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: 6, opacity: isHover ? 1 : 0.4, transition: 'opacity 0.1s' }}>
                    <button onClick={() => handleCopy(entry.path)} style={actionBtnStyle} title="复制路径">
                      复制
                    </button>
                    <button onClick={() => handleOpen(entry)} style={actionBtnStyle} title="在文件管理器中打开">
                      打开
                    </button>
                    <button
                      onClick={() => handleRemove(entry.path)}
                      style={{ ...actionBtnStyle, color: '#ffb4b4' }}
                      title="从列表移除"
                    >
                      移除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            {entries.length === 0
              ? '# 暂无最近使用记录 — 在其他功能页面读取文件 / 选择目录后会自动出现在这里'
              : '# 当前过滤条件下没有匹配项'}
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div style={{
            padding: '24px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>加载中...</div>
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

export default RecentFilesPage;
