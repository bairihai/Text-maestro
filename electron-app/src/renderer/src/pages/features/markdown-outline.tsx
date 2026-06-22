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

// ------------- utils -------------

// 提取 Markdown 大纲：匹配所有标题行，按层级输出（保留 # 号）
function extractOutline(text: string): string {
  const regex = /^(#{1,6})\s+(.+)$/gm;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    matches.push(`${m[1]} ${m[2]}`);
  }
  return matches.join('\n');
}

// 解析大纲：## 开头是大章节，# 开头（非 ##）是小节
function parseOutline(text: string) {
  const chapters: { name: string | null; sections: string[] }[] = [];
  let current: { name: string | null; sections: string[] } | null = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('## ')) {
      // 大章节
      current = { name: trimmed, sections: [] };
      chapters.push(current);
    } else if (trimmed.startsWith('# ')) {
      // 小节（# 开头但非 ##）
      if (!current) {
        current = { name: null, sections: [] };
        chapters.push(current);
      }
      current.sections.push(trimmed);
    }
  }
  return chapters;
}

// 合并两大纲：按大章节去重合并小节（Set 去重，保留出现顺序）
function mergeOutlines(o1: string, o2: string): string {
  const merged = new Map<string, { name: string | null; sections: Set<string> }>();
  const order: string[] = [];
  for (const outline of [parseOutline(o1), parseOutline(o2)]) {
    for (const ch of outline) {
      const key = ch.name || '';
      if (!merged.has(key)) {
        merged.set(key, { name: ch.name, sections: new Set<string>() });
        order.push(key);
      }
      for (const sec of ch.sections) {
        merged.get(key)!.sections.add(sec);
      }
    }
  }
  const result: string[] = [];
  for (const key of order) {
    const ch = merged.get(key)!;
    if (ch.name) result.push(ch.name);
    for (const sec of ch.sections) result.push(sec);
  }
  return result.join('\n');
}

// 解析原文：按 # 标题分割成 sections（title → content 的映射）
function parseArticle(text: string) {
  const sections = new Map<string, string>();
  const order: string[] = [];
  let currentTitle: string | null = null;
  const currentContent: string[] = [];
  const flush = () => {
    if (currentTitle !== null) {
      sections.set(currentTitle, currentContent.join('\n'));
    }
  };
  for (const line of text.split('\n')) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      // 遇到新标题，先把上一个 section 存起来
      flush();
      currentTitle = line;
      currentContent.length = 0;
      if (!order.includes(currentTitle)) order.push(currentTitle);
    } else {
      currentContent.push(line);
    }
  }
  flush();
  return { sections, order };
}

// 按新大纲顺序重新排列章节内容
function reorganizeArticle(article: string, newOutline: string): string {
  const { sections } = parseArticle(article);
  // 解析新大纲：提取标题列表
  const headings = newOutline.split('\n')
    .map(l => l.trim())
    .filter(l => /^(#{1,6})\s+/.test(l));
  const result: string[] = [];
  for (const heading of headings) {
    result.push(heading);
    const content = sections.get(heading);
    if (content !== undefined) {
      result.push(content);
    }
  }
  // 合并多余空行
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ------------- component -------------
type Tab = 'extract' | 'merge' | 'reorganize';

const MarkdownOutline: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('extract');
  // 提取大纲
  const [mdText, setMdText] = useState('');
  // 合并两大纲
  const [outline1, setOutline1] = useState('');
  const [outline2, setOutline2] = useState('');
  // 按新大纲重组
  const [article, setArticle] = useState('');
  const [newOutline, setNewOutline] = useState('');

  const [output, setOutput] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [copyHover, setCopyHover] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleAction = () => {
    if (tab === 'extract') {
      if (!mdText.trim()) { setOutput(''); return; }
      setOutput(extractOutline(mdText));
    } else if (tab === 'merge') {
      if (!outline1.trim() && !outline2.trim()) { setOutput(''); return; }
      setOutput(mergeOutlines(outline1, outline2));
    } else {
      if (!article.trim() || !newOutline.trim()) { setOutput(''); return; }
      setOutput(reorganizeArticle(article, newOutline));
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); setToast('已复制'); }
    catch { setToast('复制失败'); }
    setTimeout(() => setToast(null), 1800);
  };

  // 按钮文案随 Tab 切换
  const btnLabel = tab === 'extract' ? '提取' : tab === 'merge' ? '合并' : '重组';

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M2 3h12v1.5H2zM2 7.25h12v1.5H2zM2 11.5h12v1.5H2z"/>
        </svg>
        <h1 style={titleStyle}>Markdown 大纲工具</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Outline extractor</span>
      </div>

      <div style={contentStyle}>
        {/* Tab 切换 */}
        <div style={tabGroupStyle}>
          <button onClick={() => { setTab('extract'); setOutput(''); }} style={tab === 'extract' ? tabBtnActive : tabBtnInactive}>
            提取大纲
          </button>
          <button onClick={() => { setTab('merge'); setOutput(''); }} style={tab === 'merge' ? tabBtnActive : tabBtnInactive}>
            合并两大纲
          </button>
          <button onClick={() => { setTab('reorganize'); setOutput(''); }} style={tab === 'reorganize' ? tabBtnActive : tabBtnInactive}>
            按新大纲重组
          </button>
        </div>

        {/* 输入区 */}
        <div style={getConfigBlockStyle(colors)}>
          {tab === 'extract' && (
            <div>
              <div style={{ ...labelStyle, color: colors.textSecondary }}>MARKDOWN 文本</div>
              <textarea
                placeholder={'例如：\n# 标题一\n正文内容\n## 子标题\n正文内容\n# 标题二'}
                value={mdText}
                onChange={(e) => setMdText(e.target.value)}
                onFocus={() => setFocused('md')}
                onBlur={() => setFocused(null)}
                style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused === 'md' ? inputFocusStyle : null) }}
              />
            </div>
          )}

          {tab === 'merge' && (
            <>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>大纲 1（## 大章节 / # 小节）</div>
                <textarea
                  placeholder={'例如：\n## 章节 A\n# 小节 1\n# 小节 2'}
                  value={outline1}
                  onChange={(e) => setOutline1(e.target.value)}
                  onFocus={() => setFocused('o1')}
                  onBlur={() => setFocused(null)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused === 'o1' ? inputFocusStyle : null) }}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>大纲 2（## 大章节 / # 小节）</div>
                <textarea
                  placeholder={'例如：\n## 章节 A\n# 小节 2\n# 小节 3'}
                  value={outline2}
                  onChange={(e) => setOutline2(e.target.value)}
                  onFocus={() => setFocused('o2')}
                  onBlur={() => setFocused(null)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused === 'o2' ? inputFocusStyle : null) }}
                />
              </div>
            </>
          )}

          {tab === 'reorganize' && (
            <>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>原文（按 # 标题分章）</div>
                <textarea
                  placeholder={'粘贴 Markdown 原文，工具会按 # 标题切分章节'}
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  onFocus={() => setFocused('art')}
                  onBlur={() => setFocused(null)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused === 'art' ? inputFocusStyle : null) }}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>新大纲（标题顺序）</div>
                <textarea
                  placeholder={'例如：\n# 标题二\n# 标题一'}
                  value={newOutline}
                  onChange={(e) => setNewOutline(e.target.value)}
                  onFocus={() => setFocused('no')}
                  onBlur={() => setFocused(null)}
                  style={{ ...getInputStyle(colors), ...textareaStyle, ...(focused === 'no' ? inputFocusStyle : null) }}
                />
              </div>
            </>
          )}

          <button onClick={handleAction} style={primaryBtnStyle}>▸ {btnLabel}</button>
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
            # 输入内容并点击「{btnLabel}」，将在代码块中输出结果
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

export default MarkdownOutline;
