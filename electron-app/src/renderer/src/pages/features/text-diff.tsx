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

// 差异片段类型：equal=不变, delete=删除(红色), add=新增(绿色)
type DiffSegment = { type: 'equal' | 'delete' | 'add'; text: string };

// ------------- utils -------------
// 基于 LCS 的逐字符 diff 算法（移植自 Python difflib.Differ 思路）
function diffChars(a: string, b: string): DiffSegment[] {
  const aChars = Array.from(a);
  const bChars = Array.from(b);
  const m = aChars.length;
  const n = bChars.length;

  // 构建 LCS 最长公共子序列表
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aChars[i - 1] === bChars[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯生成差异片段
  const result: DiffSegment[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aChars[i - 1] === bChars[j - 1]) {
      result.push({ type: 'equal', text: aChars[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'add', text: bChars[j - 1] });
      j--;
    } else {
      result.push({ type: 'delete', text: aChars[i - 1] });
      i--;
    }
  }
  result.reverse();

  // 合并相邻同类型片段
  const merged: DiffSegment[] = [];
  for (const seg of result) {
    if (merged.length > 0 && merged[merged.length - 1].type === seg.type) {
      merged[merged.length - 1].text += seg.text;
    } else {
      merged.push({ type: seg.type, text: seg.text });
    }
  }
  return merged;
}

// 将差异片段转为可复制的纯文本（用 [-del-] / {+add+} 标记）
function diffToText(segments: DiffSegment[]): string {
  return segments.map((seg) => {
    if (seg.type === 'delete') return `[-${seg.text}-]`;
    if (seg.type === 'add') return `{+${seg.text}+}`;
    return seg.text;
  }).join('');
}

// ------------- component -------------
const TextDiff: React.FC = () => {
  const { colors } = useTheme();
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [segments, setSegments] = useState<DiffSegment[] | null>(null);
  const [focused1, setFocused1] = useState(false);
  const [focused2, setFocused2] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleCompare = () => {
    if (!text1 && !text2) { setSegments(null); return; }
    setSegments(diffChars(text1, text2));
  };

  const handleCopy = async () => {
    if (!segments) return;
    try { await navigator.clipboard.writeText(diffToText(segments)); setToast('已复制'); }
    catch { setToast('复制失败'); }
    setTimeout(() => setToast(null), 1800);
  };

  // 统计差异信息
  const diffInfo = segments
    ? {
        del: segments.filter((s) => s.type === 'delete').reduce((sum, s) => sum + Array.from(s.text).length, 0),
        add: segments.filter((s) => s.type === 'add').reduce((sum, s) => sum + Array.from(s.text).length, 0),
      }
    : null;

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M6 1H1v6h5V1zm9 0h-5v6h5V1zM6 9H1v6h5V9zm9 0h-5v6h5V9z" opacity="0.4"/>
          <path d="M2 2v4h3V2H2zm9 0v4h3V2h-3zM2 10v4h3v-4H2zm9 0v4h3v-4h-3z"/>
        </svg>
        <h1 style={titleStyle}>文本比较 / 逐字符差异</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Text diff</span>
      </div>

      <div style={contentStyle}>
        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>TEXT 1（原始文本）</div>
            <textarea
              placeholder="例如：Hello World"
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              onFocus={() => setFocused1(true)}
              onBlur={() => setFocused1(false)}
              style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused1 ? inputFocusStyle : null) }}
            />
          </div>
          <div>
            <div style={{ ...labelStyle, color: colors.textSecondary }}>TEXT 2（修改后文本）</div>
            <textarea
              placeholder="例如：Hello React"
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              onFocus={() => setFocused2(true)}
              onBlur={() => setFocused2(false)}
              style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused2 ? inputFocusStyle : null) }}
            />
          </div>
          <button onClick={handleCompare} style={primaryBtnStyle}>▸ 比较</button>
        </div>

        {/* 输出区 */}
        {segments && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>diff {diffInfo && `· -${diffInfo.del} +${diffInfo.add}`}</span>
              <button
                onClick={handleCopy}
                onMouseEnter={() => setCopyHover(true)}
                onMouseLeave={() => setCopyHover(false)}
                style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}
              >
                Copy
              </button>
            </div>
            <div style={getCodeBodyStyle(colors)}>
              {segments.map((seg, idx) => {
                if (seg.type === 'delete') {
                  return (
                    <span key={idx} style={{ background: 'rgba(248,81,73,0.35)', color: '#ffb4b4' }}>
                      {seg.text}
                    </span>
                  );
                }
                if (seg.type === 'add') {
                  return (
                    <span key={idx} style={{ background: 'rgba(63,185,80,0.35)', color: '#7ee787' }}>
                      {seg.text}
                    </span>
                  );
                }
                return <span key={idx}>{seg.text}</span>;
              })}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!segments && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 输入两段文本并点击「比较」，将以高亮形式展示字符差异
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

export default TextDiff;
