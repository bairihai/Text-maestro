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

// ------------- CSV 解析工具 -------------
// 解析单行 CSV，处理引号包裹的字段（含逗号、转义双引号）
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // 双引号转义："" 表示一个字面量 "
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// 将字段数组重新序列化为 CSV 行（含特殊字符时加引号）
function toCSVLine(fields: string[]): string {
  return fields.map((f) => {
    if (f.includes(',') || f.includes('"') || f.includes('\n')) {
      return '"' + f.replace(/"/g, '""') + '"';
    }
    return f;
  }).join(',');
}

// ------------- 个人发言提取 -------------
// 筛选 Username == 输入用户名 的所有行，输出含表头的 CSV 文本
function extractUserMessages(csvText: string, username: string): string {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return '（无数据）';
  const header = parseCSVLine(lines[0]);
  const usernameIdx = header.findIndex((h) => h.trim() === 'Username');
  if (usernameIdx === -1) return '✗ 未找到 Username 列';
  const result: string[] = [toCSVLine(header)];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields[usernameIdx] === username) {
      result.push(toCSVLine(fields));
    }
  }
  if (result.length === 1) return `（未找到用户 "${username}" 的发言）`;
  return result.join('\n');
}

// ------------- 发言频率统计 -------------
// 按 N 分钟向下取整分组，统计每组消息数，输出 "时间 -> 消息数"
function countByFrequency(csvText: string, granularityMin: number): string {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return '（无数据）';
  const header = parseCSVLine(lines[0]);
  const dateIdx = header.findIndex((h) => h.trim() === 'Date');
  if (dateIdx === -1) return '✗ 未找到 Date 列';
  // 按时间窗口分组计数
  const counts = new Map<number, number>();
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const raw = (fields[dateIdx] || '').trim();
    if (!raw) continue;
    // 日期格式 %Y-%m-%d,%H:%M:%S，将中间逗号替换为空格以便 Date 解析
    const normalized = raw.replace(',', ' ');
    const dt = new Date(normalized);
    if (isNaN(dt.getTime())) continue;
    // 向下取整到指定分钟数
    const windowMs = granularityMin * 60 * 1000;
    const floored = Math.floor(dt.getTime() / windowMs) * windowMs;
    counts.set(floored, (counts.get(floored) || 0) + 1);
  }
  if (counts.size === 0) return '（无有效日期数据）';
  // 按时间升序输出
  const sorted = Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
  const out: string[] = [];
  const pad = (n: number) => n.toString().padStart(2, '0');
  for (const [ts, cnt] of sorted) {
    const d = new Date(ts);
    const label = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    out.push(`${label} -> ${cnt}`);
  }
  return out.join('\n');
}

// ------------- component -------------
const DiscordAnalysis: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'extract' | 'frequency' | 'timeslot' | 'preference'>('extract');
  const [csvInput, setCsvInput] = useState('');
  const [username, setUsername] = useState('');
  const [granularity, setGranularity] = useState('360');
  const [output, setOutput] = useState('');
  const [csvFocused, setCsvFocused] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [granFocused, setGranFocused] = useState(false);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Tab 3/4 新增状态：频道时频数据、用户时频数据
  const [channelTimeFreqInput, setChannelTimeFreqInput] = useState('');
  const [userTimeFreqInput, setUserTimeFreqInput] = useState('');
  const [channelFreqFocused, setChannelFreqFocused] = useState(false);
  const [userFreqFocused, setUserFreqFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    // Tab 1/2：同步逻辑（纯前端 CSV 处理）
    if (tab === 'extract') {
      if (!csvInput.trim()) { setOutput(''); return; }
      setError(null);
      setOutput(extractUserMessages(csvInput, username.trim()));
      return;
    }
    if (tab === 'frequency') {
      if (!csvInput.trim()) { setOutput(''); return; }
      setError(null);
      const min = parseInt(granularity, 10);
      if (!min || min <= 0) { setOutput('✗ 时间颗粒度需为正整数'); return; }
      setOutput(countByFrequency(csvInput, min));
      return;
    }
    // Tab 3：频道时频统计（调用 Python pandas）
    if (tab === 'timeslot') {
      if (!channelTimeFreqInput.trim()) { setError('请输入频道时频数据'); return; }
      setLoading(true); setError(null); setOutput('');
      try {
        const result = await window.electron?.discordTimeSlot?.(channelTimeFreqInput);
        if (result?.success) { setOutput(result.data || ''); }
        else { setError(result?.error || '统计失败'); }
      } catch (err) { setError((err as Error).message); }
      finally { setLoading(false); }
      return;
    }
    // Tab 4：用户偏好度分析（调用 Python pandas）
    if (tab === 'preference') {
      if (!userTimeFreqInput.trim()) { setError('请输入用户时频数据'); return; }
      if (!channelTimeFreqInput.trim()) { setError('请输入频道时频数据'); return; }
      setLoading(true); setError(null); setOutput('');
      try {
        const result = await window.electron?.discordPreference?.(userTimeFreqInput, channelTimeFreqInput);
        if (result?.success) { setOutput(result.data || ''); }
        else { setError(result?.error || '分析失败'); }
      } catch (err) { setError((err as Error).message); }
      finally { setLoading(false); }
      return;
    }
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
          <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H6l-3 3v-3H3a1 1 0 01-1-1V3zm2 2v1h8V5H4zm0 3v1h6V8H4z"/>
        </svg>
        <h1 style={titleStyle}>Discord 聊天记录分析</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Discord chat analysis</span>
      </div>

      <div style={contentStyle}>
        {/* Tab 切换 */}
        <div style={tabGroupStyle}>
          <button onClick={() => setTab('extract')} style={tab === 'extract' ? tabBtnActive : tabBtnInactive}>
            个人发言提取
          </button>
          <button onClick={() => setTab('frequency')} style={tab === 'frequency' ? tabBtnActive : tabBtnInactive}>
            发言频率统计
          </button>
          <button onClick={() => setTab('timeslot')} style={tab === 'timeslot' ? tabBtnActive : tabBtnInactive}>
            频道时频
          </button>
          <button onClick={() => setTab('preference')} style={tab === 'preference' ? tabBtnActive : tabBtnInactive}>
            偏好度
          </button>
        </div>

        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          {/* Tab 1/2：CSV 聊天记录 + 用户名/颗粒度 */}
          {tab === 'extract' || tab === 'frequency' ? (
            <>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>CSV 聊天记录</div>
                <textarea
                  placeholder="粘贴 Discord 导出的 CSV 聊天记录（含表头）"
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  onFocus={() => setCsvFocused(true)}
                  onBlur={() => setCsvFocused(false)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, ...(csvFocused ? inputFocusStyle : null) }}
                />
              </div>

              {tab === 'extract' ? (
                <div>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>用户名（Username 列）</div>
                  <input
                    type="text"
                    placeholder="例如：john_doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setUserFocused(true)}
                    onBlur={() => setUserFocused(false)}
                    style={{ ...getInputStyle(colors), ...(userFocused ? inputFocusStyle : null) }}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ ...labelStyle, color: colors.textSecondary }}>时间颗粒度（分钟）</div>
                  <input
                    type="number"
                    min={1}
                    placeholder="例如：360"
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value)}
                    onFocus={() => setGranFocused(true)}
                    onBlur={() => setGranFocused(false)}
                    style={{ ...getInputStyle(colors), ...(granFocused ? inputFocusStyle : null) }}
                  />
                </div>
              )}
            </>
          ) : tab === 'timeslot' ? (
            /* Tab 3：频道时频数据 */
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>频道时频数据</div>
              <textarea
                placeholder={'粘贴频道时频数据（每行格式：时间 消息数）\n例如:\n2024-01-15 08:00 -> 42\n2024-01-15 09:00 -> 58'}
                value={channelTimeFreqInput}
                onChange={(e) => setChannelTimeFreqInput(e.target.value)}
                onFocus={() => setChannelFreqFocused(true)}
                onBlur={() => setChannelFreqFocused(false)}
                style={{ ...getInputStyle(colors), ...textareaStyle, ...(channelFreqFocused ? inputFocusStyle : null) }}
              />
            </div>
          ) : (
            /* Tab 4：用户时频数据 + 频道时频数据 */
            <>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>用户时频数据</div>
                <textarea
                  placeholder={'粘贴用户时频数据（每行格式：时间 消息数）\n例如:\n08:00 12\n09:00 25'}
                  value={userTimeFreqInput}
                  onChange={(e) => setUserTimeFreqInput(e.target.value)}
                  onFocus={() => setUserFreqFocused(true)}
                  onBlur={() => setUserFreqFocused(false)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, ...(userFreqFocused ? inputFocusStyle : null) }}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>频道时频数据</div>
                <textarea
                  placeholder={'粘贴频道时频数据（每行格式：时间 消息数）\n例如:\n08:00 120\n09:00 250'}
                  value={channelTimeFreqInput}
                  onChange={(e) => setChannelTimeFreqInput(e.target.value)}
                  onFocus={() => setChannelFreqFocused(true)}
                  onBlur={() => setChannelFreqFocused(false)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, ...(channelFreqFocused ? inputFocusStyle : null) }}
                />
              </div>
            </>
          )}

          <button onClick={handleRun} disabled={loading}
            style={{ ...primaryBtnStyle, ...(loading ? { background: 'rgba(35, 134, 54, 0.5)', cursor: 'not-allowed' } : null) }}>
            {loading ? '处理中...' : `▸ ${tab === 'extract' ? '提取' : tab === 'frequency' ? '统计' : tab === 'timeslot' ? '统计' : '分析'}`}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: `1px solid ${colors.error}`,
            borderRadius: 6, padding: '10px 14px', color: '#ffb4b4', fontSize: 14,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>✗ {error}</div>
        )}

        {/* 加载中提示 */}
        {loading && (
          <div style={getCodeBlockStyle(colors)}>
            <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
              <span>正在调用 Python 分析...</span>
            </div>
            <div style={{ padding: '24px 16px', textAlign: 'center', color: colors.textSecondary, fontSize: 13 }}>
              请稍候，pandas 正在处理数据
            </div>
          </div>
        )}

        {/* 输出区 */}
        {!loading && output && (
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
        {!loading && !output && !error && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 粘贴数据并点击「{tab === 'extract' ? '提取' : tab === 'frequency' ? '统计' : tab === 'timeslot' ? '统计' : '分析'}」，将在代码块中输出结果
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

export default DiscordAnalysis;
