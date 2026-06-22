import React, { useState, useEffect, useRef } from 'react';
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

// 单选按钮组样式
const radioGroupStyle: React.CSSProperties = {
  display: 'flex', gap: 16, flexWrap: 'wrap',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
  cursor: 'pointer', userSelect: 'none',
};

const radioStyle: React.CSSProperties = {
  width: 14, height: 14, cursor: 'pointer', accentColor: '#2f81f7',
};

// 当前时间戳实时显示样式
const liveTsStyle: React.CSSProperties = {
  fontSize: 28, fontWeight: 700, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  letterSpacing: 1, color: '#2f81f7',
};

// ------------- 工具函数 -------------

// 时间戳 → 日期
function timestampToDate(ts: number, unit: 'auto' | 'seconds' | 'milliseconds', tz: 'local' | 'utc', fmt: string): string {
  try {
    let seconds = ts;
    // 自动判断单位
    if (unit === 'auto') {
      unit = Math.abs(ts) < 1e12 ? 'seconds' : 'milliseconds';
    }
    if (unit === 'milliseconds') {
      seconds = ts / 1000;
    }

    const date = tz === 'utc' ? new Date(seconds * 1000) : new Date(seconds * 1000);
    // JS Date 默认就是本地时区，UTC 模式需要用 UTC 方法格式化
    return formatDate(date, tz, fmt);
  } catch (e) {
    return `转换失败: ${(e as Error).message}`;
  }
}

// 日期 → 时间戳
function dateToTimestamp(dateStr: string, unit: 'seconds' | 'milliseconds', tz: 'local' | 'utc', fmt: string): string {
  try {
    // 解析日期字符串（按 fmt 格式）
    const date = parseDate(dateStr, fmt, tz);
    if (!date) return '转换失败: 无法解析日期，请检查格式';

    let ts = Math.floor(date.getTime() / 1000);
    if (unit === 'milliseconds') {
      ts = date.getTime();
    }
    return String(ts);
  } catch (e) {
    return `转换失败: ${(e as Error).message}`;
  }
}

// 格式化日期（支持常见格式占位符）
function formatDate(date: Date, tz: 'local' | 'utc', fmt: string): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  const Y = tz === 'utc' ? date.getUTCFullYear() : date.getFullYear();
  const M = tz === 'utc' ? date.getUTCMonth() + 1 : date.getMonth() + 1;
  const D = tz === 'utc' ? date.getUTCDate() : date.getDate();
  const h = tz === 'utc' ? date.getUTCHours() : date.getHours();
  const m = tz === 'utc' ? date.getUTCMinutes() : date.getMinutes();
  const s = tz === 'utc' ? date.getUTCSeconds() : date.getSeconds();

  return fmt
    .replace(/%Y/g, String(Y))
    .replace(/%m/g, pad(M))
    .replace(/%d/g, pad(D))
    .replace(/%H/g, pad(h))
    .replace(/%M/g, pad(m))
    .replace(/%S/g, pad(s));
}

// 解析日期字符串（支持常见格式）
function parseDate(dateStr: string, fmt: string, tz: 'local' | 'utc'): Date | null {
  // 尝试直接用 new Date 解析
  const direct = new Date(dateStr);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // 按 fmt 格式解析（简化版：支持 %Y-%m-%d %H:%M:%S）
  // 提取各部分
  const regexMap: Record<string, RegExp> = {
    '%Y-%m-%d %H:%M:%S': /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    '%Y-%m-%d %H:%M': /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/,
    '%Y-%m-%d': /^(\d{4})-(\d{2})-(\d{2})$/,
    '%Y/%m/%d %H:%M:%S': /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    '%Y/%m/%d': /^(\d{4})\/(\d{2})\/(\d{2})$/,
  };

  const regex = regexMap[fmt];
  if (!regex) {
    // 如果格式不在预设中，尝试通用解析
    const generic = dateStr.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (generic) {
      const [, y, mo, d, h = '0', mi = '0', s = '0'] = generic;
      if (tz === 'utc') {
        return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
      }
      return new Date(+y, +mo - 1, +d, +h, +mi, +s);
    }
    return null;
  }

  const match = dateStr.match(regex);
  if (!match) return null;

  const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
  if (tz === 'utc') {
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  }
  return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

// ------------- component -------------
const TimestampConverter: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'ts2date' | 'date2ts' | 'current'>('ts2date');

  // 时间戳 → 日期
  const [tsInput, setTsInput] = useState('1700000000');
  const [tsUnit, setTsUnit] = useState<'auto' | 'seconds' | 'milliseconds'>('auto');
  const [tsTz, setTsTz] = useState<'local' | 'utc'>('local');
  const [tsFmt, setTsFmt] = useState('%Y-%m-%d %H:%M:%S');
  const [tsOutput, setTsOutput] = useState('');
  const [tsFocused, setTsFocused] = useState(false);
  const [fmtFocused, setFmtFocused] = useState(false);

  // 日期 → 时间戳
  const [dateInput, setDateInput] = useState('2023-11-15 06:13:20');
  const [dateUnit, setDateUnit] = useState<'seconds' | 'milliseconds'>('seconds');
  const [dateTz, setDateTz] = useState<'local' | 'utc'>('local');
  const [dateFmt, setDateFmt] = useState('%Y-%m-%d %H:%M:%S');
  const [dateOutput, setDateOutput] = useState('');
  const [dateFocused, setDateFocused] = useState(false);
  const [dateFmtFocused, setDateFmtFocused] = useState(false);

  // 当前时间戳
  const [curUnit, setCurUnit] = useState<'seconds' | 'milliseconds'>('seconds');
  const [liveTs, setLiveTs] = useState('');
  const [liveDate, setLiveDate] = useState('');
  const [liveEnabled, setLiveEnabled] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 实时更新当前时间戳
  useEffect(() => {
    if (tab === 'current' && liveEnabled) {
      const update = () => {
        const now = Date.now();
        const ts = curUnit === 'seconds' ? Math.floor(now / 1000) : now;
        setLiveTs(String(ts));
        setLiveDate(formatDate(new Date(), 'local', tsFmt));
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [tab, curUnit, liveEnabled, tsFmt]);

  // 通用
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleTs2Date = () => {
    const ts = parseFloat(tsInput.trim());
    if (isNaN(ts)) { setTsOutput('请输入有效数字'); return; }
    setTsOutput(timestampToDate(ts, tsUnit, tsTz, tsFmt));
  };

  const handleDate2Ts = () => {
    if (!dateInput.trim()) { setDateOutput('请输入日期'); return; }
    setDateOutput(dateToTimestamp(dateInput, dateUnit, dateTz, dateFmt));
  };

  const handleCopy = async (text: string) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setToast('已复制'); }
    catch { setToast('复制失败'); }
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5A6.5 6.5 0 1114.5 8 6.5 6.5 0 018 14.5zM8 3a.5.5 0 01.5.5v4.25l3 1.75a.5.5 0 01-.5.866l-3.25-1.88A.5.5 0 017.5 8V3.5A.5.5 0 018 3z"/>
        </svg>
        <h1 style={titleStyle}>Timestamp 时间戳转换</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Timestamp converter</span>
      </div>

      <div style={contentStyle}>
        {/* Tab */}
        <div style={tabGroupStyle}>
          <button onClick={() => setTab('ts2date')} style={tab === 'ts2date' ? tabBtnActive : tabBtnInactive}>
            时间戳 → 日期
          </button>
          <button onClick={() => setTab('date2ts')} style={tab === 'date2ts' ? tabBtnActive : tabBtnInactive}>
            日期 → 时间戳
          </button>
          <button onClick={() => setTab('current')} style={tab === 'current' ? tabBtnActive : tabBtnInactive}>
            当前时间戳
          </button>
        </div>

        {/* Tab 1: 时间戳 → 日期 */}
        {tab === 'ts2date' && (
          <div style={getConfigBlockStyle(colors)}>
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>TIMESTAMP</div>
              <input type="text" placeholder="例如：1700000000 或 1700000000000"
                value={tsInput} onChange={(e) => setTsInput(e.target.value)}
                onFocus={() => setTsFocused(true)} onBlur={() => setTsFocused(false)}
                style={{ ...getInputStyle(colors), ...(tsFocused ? inputFocusStyle : null) }} />
            </div>

            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>单位</div>
              <div style={radioGroupStyle}>
                {(['auto', 'seconds', 'milliseconds'] as const).map(u => (
                  <label key={u} style={{ ...radioLabelStyle, color: colors.textPrimary }}>
                    <input type="radio" checked={tsUnit === u} onChange={() => setTsUnit(u)} style={radioStyle} />
                    {u === 'auto' ? '自动判断' : u === 'seconds' ? '秒（10位）' : '毫秒（13位）'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>时区</div>
              <div style={radioGroupStyle}>
                {(['local', 'utc'] as const).map(tz => (
                  <label key={tz} style={{ ...radioLabelStyle, color: colors.textPrimary }}>
                    <input type="radio" checked={tsTz === tz} onChange={() => setTsTz(tz)} style={radioStyle} />
                    {tz === 'local' ? '本地时区' : 'UTC'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>输出格式（Python strftime 风格）</div>
              <input type="text" placeholder="%Y-%m-%d %H:%M:%S"
                value={tsFmt} onChange={(e) => setTsFmt(e.target.value)}
                onFocus={() => setFmtFocused(true)} onBlur={() => setFmtFocused(false)}
                style={{ ...getInputStyle(colors), ...(fmtFocused ? inputFocusStyle : null) }} />
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                支持：%Y 年 %m 月 %d 日 %H 时 %M 分 %S 秒
              </div>
            </div>

            <button onClick={handleTs2Date} style={primaryBtnStyle}>▸ 转换</button>

            {tsOutput && (
              <div style={getCodeBlockStyle(colors)}>
                <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
                  <span>result</span>
                  <button onClick={() => handleCopy(tsOutput)}
                    onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                    style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
                </div>
                <pre style={getCodeBodyStyle(colors)}>{tsOutput}</pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 日期 → 时间戳 */}
        {tab === 'date2ts' && (
          <div style={getConfigBlockStyle(colors)}>
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>DATE STRING</div>
              <input type="text" placeholder="例如：2023-11-15 06:13:20"
                value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                onFocus={() => setDateFocused(true)} onBlur={() => setDateFocused(false)}
                style={{ ...getInputStyle(colors), ...(dateFocused ? inputFocusStyle : null) }} />
            </div>

            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>输出单位</div>
              <div style={radioGroupStyle}>
                {(['seconds', 'milliseconds'] as const).map(u => (
                  <label key={u} style={{ ...radioLabelStyle, color: colors.textPrimary }}>
                    <input type="radio" checked={dateUnit === u} onChange={() => setDateUnit(u)} style={radioStyle} />
                    {u === 'seconds' ? '秒（10位）' : '毫秒（13位）'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>时区</div>
              <div style={radioGroupStyle}>
                {(['local', 'utc'] as const).map(tz => (
                  <label key={tz} style={{ ...radioLabelStyle, color: colors.textPrimary }}>
                    <input type="radio" checked={dateTz === tz} onChange={() => setDateTz(tz)} style={radioStyle} />
                    {tz === 'local' ? '本地时区' : 'UTC'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>输入格式</div>
              <input type="text" placeholder="%Y-%m-%d %H:%M:%S"
                value={dateFmt} onChange={(e) => setDateFmt(e.target.value)}
                onFocus={() => setDateFmtFocused(true)} onBlur={() => setDateFmtFocused(false)}
                style={{ ...getInputStyle(colors), ...(dateFmtFocused ? inputFocusStyle : null) }} />
            </div>

            <button onClick={handleDate2Ts} style={primaryBtnStyle}>▸ 转换</button>

            {dateOutput && (
              <div style={getCodeBlockStyle(colors)}>
                <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
                  <span>result</span>
                  <button onClick={() => handleCopy(dateOutput)}
                    onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                    style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
                </div>
                <pre style={getCodeBodyStyle(colors)}>{dateOutput}</pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: 当前时间戳 */}
        {tab === 'current' && (
          <div style={getConfigBlockStyle(colors)}>
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>单位</div>
              <div style={radioGroupStyle}>
                {(['seconds', 'milliseconds'] as const).map(u => (
                  <label key={u} style={{ ...radioLabelStyle, color: colors.textPrimary }}>
                    <input type="radio" checked={curUnit === u} onChange={() => setCurUnit(u)} style={radioStyle} />
                    {u === 'seconds' ? '秒（10位）' : '毫秒（13位）'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>显示格式</div>
              <input type="text" placeholder="%Y-%m-%d %H:%M:%S"
                value={tsFmt} onChange={(e) => setTsFmt(e.target.value)}
                onFocus={() => setFmtFocused(true)} onBlur={() => setFmtFocused(false)}
                style={{ ...getInputStyle(colors), ...(fmtFocused ? inputFocusStyle : null) }} />
            </div>

            <label style={{ ...radioLabelStyle, color: colors.textPrimary }}>
              <input type="checkbox" checked={liveEnabled} onChange={() => setLiveEnabled(!liveEnabled)} style={radioStyle} />
              实时更新（每秒刷新）
            </label>

            {liveTs && (
              <div style={getCodeBlockStyle(colors)}>
                <div style={{ ...codeHeaderStyle, color: colors.textSecondary }}>
                  <span>current timestamp ({curUnit})</span>
                  <button onClick={() => handleCopy(liveTs)}
                    onMouseEnter={() => setCopyHover(true)} onMouseLeave={() => setCopyHover(false)}
                    style={{ ...copyBtnStyle, color: copyHover ? colors.textPrimary : colors.textSecondary }}>Copy</button>
                </div>
                <div style={{ ...getCodeBodyStyle(colors), textAlign: 'center', padding: '24px 16px' }}>
                  <div style={liveTsStyle}>{liveTs}</div>
                  <div style={{ marginTop: 12, fontSize: 14, color: colors.textSecondary }}>{liveDate}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 空状态提示 */}
        {tab === 'ts2date' && !tsOutput && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 输入时间戳并点击「转换」，将在代码块中输出结果
          </div>
        )}
        {tab === 'date2ts' && !dateOutput && (
          <div style={{
            padding: '40px 20px', textAlign: 'center', color: colors.textSecondary,
            fontSize: 13, border: `1px dashed ${colors.border}`, borderRadius: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          }}>
            # 输入日期并点击「转换」，将在代码块中输出时间戳
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

export default TimestampConverter;
