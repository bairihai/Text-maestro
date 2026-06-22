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

// ------------- Twitch 数据类型 -------------
interface TwitchBadge { _id: string; }
interface TwitchComment {
  content_offset_seconds: number;
  commenter: { display_name: string };
  message: { user_badges?: TwitchBadge[] };
}
interface TwitchData {
  comments?: TwitchComment[];
}

// ------------- 分析逻辑（移植自 Python utils_social_media.py）-------------
function analyzeTwitch(data: unknown): string {
  const obj = data as TwitchData;
  if (!obj || !Array.isArray(obj.comments) || obj.comments.length === 0) {
    return '✗ 未找到 comments 数组或数据为空';
  }
  const comments = obj.comments;
  const total = comments.length;

  // 1. 基础活跃度：统计独立发言人数与平均发言数
  const userCounts = new Map<string, number>();
  for (const c of comments) {
    const name = c.commenter?.display_name ?? '未知';
    userCounts.set(name, (userCounts.get(name) || 0) + 1);
  }
  const uniqueUsers = userCounts.size;
  const avgPerUser = uniqueUsers > 0 ? (total / uniqueUsers).toFixed(1) : '0.0';

  // 2. 高光时刻 Top3：按 10 秒窗口分组，取弹幕最密集的 3 个区间
  const windowCounts = new Map<number, number>();
  for (const c of comments) {
    const sec = c.content_offset_seconds ?? 0;
    const win = Math.floor(sec / 10) * 10;
    windowCounts.set(win, (windowCounts.get(win) || 0) + 1);
  }
  const top3 = Array.from(windowCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // 3. 核心粉丝 Top5：按发言数排序取前 5
  const top5 = Array.from(userCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 4. 粉丝画像：统计所有徽章出现次数
  const badgeCounts = new Map<string, number>();
  for (const c of comments) {
    const badges = c.message?.user_badges;
    if (Array.isArray(badges)) {
      for (const b of badges) {
        const id = b?._id ?? 'unknown';
        badgeCounts.set(id, (badgeCounts.get(id) || 0) + 1);
      }
    }
  }
  const badgesSorted = Array.from(badgeCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  // 组装报告
  const lines: string[] = [];
  const sep = '========================================';
  lines.push(sep);
  lines.push('📈 直播间弹幕高阶分析报告');
  lines.push(sep);
  lines.push(`🔹 总弹幕数: ${total} 条`);
  lines.push(`🔹 独立发言人数: ${uniqueUsers} 人`);
  lines.push(`🔹 平均每人发言: ${avgPerUser} 条`);
  lines.push('');
  lines.push('🔥 互动最高光时刻 (Top 3):');
  if (top3.length === 0) {
    lines.push('   - （无数据）');
  } else {
    for (const [start, cnt] of top3) {
      lines.push(`   - 视频第 ${start}s 到 ${start + 10}s: 爆发了 ${cnt} 条弹幕`);
    }
  }
  lines.push('');
  lines.push('👑 最活跃核心粉丝 (Top 5):');
  if (top5.length === 0) {
    lines.push('   - （无数据）');
  } else {
    for (const [name, cnt] of top5) {
      lines.push(`   - ${name}: 发言 ${cnt} 次`);
    }
  }
  lines.push('');
  lines.push('💎 粉丝成分/付费身份画像:');
  if (badgesSorted.length === 0) {
    lines.push('   - （无徽章数据）');
  } else {
    for (const [id, cnt] of badgesSorted) {
      lines.push(`   - ${id}: ${cnt} 人次`);
    }
  }
  lines.push(sep);
  return lines.join('\n');
}

// ------------- component -------------
const TwitchAnalysis: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [output, setOutput] = useState('');
  const [textFocused, setTextFocused] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 执行分析（可传入文件读取后的文本，否则使用 textarea 内容）
  const handleAnalyze = (text?: string) => {
    const raw = text ?? jsonText;
    if (!raw.trim()) { setOutput(''); return; }
    try {
      const data = JSON.parse(raw);
      setOutput(analyzeTwitch(data));
    } catch (e) {
      setOutput('✗ JSON 解析失败：' + (e as Error).message);
    }
  };

  // 读取本地 JSON 文件
  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      handleAnalyze(text);
    };
    reader.onerror = () => {
      setOutput('✗ 文件读取失败');
    };
    reader.readAsText(file);
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
          <path d="M2 2.5A1.5 1.5 0 013.5 1h9A1.5 1.5 0 0114 2.5v7A1.5 1.5 0 0112.5 11H6l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-7zM7 4v5l4-2.5L7 4z"/>
        </svg>
        <h1 style={titleStyle}>Twitch 弹幕分析</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Twitch chat analysis</span>
      </div>

      <div style={contentStyle}>
        {/* Tab 切换 */}
        <div style={tabGroupStyle}>
          <button onClick={() => setTab('file')} style={tab === 'file' ? tabBtnActive : tabBtnInactive}>
            从 JSON 文件导入
          </button>
          <button onClick={() => setTab('text')} style={tab === 'text' ? tabBtnActive : tabBtnInactive}>
            从 JSON 文本导入
          </button>
        </div>

        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          {tab === 'file' ? (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>选择 JSON 文件</div>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                style={{ ...getInputStyle(colors), padding: '4px 8px' }}
              />
              {fileName && (
                <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
                  已加载：{fileName}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>粘贴 JSON 文本</div>
              <textarea
                placeholder='例如：{"comments":[{"content_offset_seconds":10,"commenter":{"display_name":"user1"},"message":{"user_badges":[{"_id":"subscriber"}]}}]}'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                onFocus={() => setTextFocused(true)}
                onBlur={() => setTextFocused(false)}
                style={{ ...getInputStyle(colors), ...textareaStyle, ...(textFocused ? inputFocusStyle : null) }}
              />
            </div>
          )}

          <button onClick={() => handleAnalyze()} style={primaryBtnStyle}>▸ 分析</button>
        </div>

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
            <pre style={getCodeBodyStyle(colors)}>{output}</pre>
          </div>
        )}

        {/* 空状态 */}
        {!output && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # {tab === 'file' ? '选择 Twitch 聊天 JSON 文件' : '粘贴 Twitch 聊天 JSON 文本'}并点击「分析」，将在代码块中输出报告
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

export default TwitchAnalysis;
