import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';
import {
  MdToWebRule,
  DEFAULT_PRESETS,
  convert,
  loadPresets,
  savePresets,
  downloadFile,
  buildMultiFileAssets,
  parseFrontmatter,
} from '@renderer/utils/md-to-web';

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

const mainStyle: React.CSSProperties = {
  flex: 1, display: 'flex', minHeight: 0,
};

const leftPaneStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  width: 460, flexShrink: 0, borderRight: `1px solid ${colors.border}`,
  display: 'flex', flexDirection: 'column', minHeight: 0,
});

const rightPaneStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: colors.cardBg,
});

const tabGroupStyle: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid var(--arco-color-border)', flexShrink: 0,
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px', background: 'transparent', border: 'none',
  borderBottom: active ? '2px solid #2f81f7' : '2px solid transparent',
  cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400,
  color: 'inherit',
});

const scrollAreaStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '12px 16px', minHeight: 0,
};

const cardStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, marginBottom: 10, overflow: 'hidden',
});

const cardHeaderStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  padding: '8px 12px', cursor: 'pointer', userSelect: 'none',
  background: 'rgba(255,255,255,0.02)', fontSize: 13, fontWeight: 600,
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  borderBottom: colors.border,
});

const cardBodyStyle: React.CSSProperties = {
  padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
  color: 'inherit', opacity: 0.7, marginBottom: 2,
};

const inputStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  width: '100%', padding: '4px 8px', fontSize: 13, lineHeight: '20px',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 4, outline: 'none',
  boxSizing: 'border-box',
});

const textareaStyle: React.CSSProperties = {
  minHeight: 200, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const selectStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  ...inputStyle(colors),
  cursor: 'pointer',
});

const primaryBtnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff',
  border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6,
  padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const secondaryBtnStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: 'transparent', color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 6,
  padding: '5px 12px', fontSize: 13, cursor: 'pointer',
});

const previewBtnRowStyle: React.CSSProperties = {
  padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center',
  borderBottom: '1px solid var(--arco-color-border)', flexShrink: 0,
};

const iframeStyle: React.CSSProperties = {
  flex: 1, border: 'none', minHeight: 0, background: '#fff',
};

const presetRowStyle = (colors: ReturnType<typeof useTheme>['colors'], active: boolean): React.CSSProperties => ({
  padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: active ? 'rgba(47, 129, 235, 0.12)' : 'transparent',
  border: `1px solid ${active ? '#2f81f7' : colors.border}`, borderRadius: 4,
  marginBottom: 6, fontSize: 13, cursor: 'pointer',
});

const helpTextStyle: React.CSSProperties = {
  fontSize: 11, opacity: 0.6, marginTop: 2, lineHeight: 1.4,
};

// ---------------- 默认规则（Obsidian→Wiki）----------------
const DEFAULT_RULE: MdToWebRule = DEFAULT_PRESETS[0].rule;

// 辅助：通用 textarea 输入
const Area = (p: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
  const { colors } = useTheme();
  return (
    <textarea
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
      placeholder={p.placeholder}
      style={{ ...inputStyle(colors), ...textareaStyle }}
    />
  );
};

// 辅助：列表输入（每行一项）
const ListInput = (p: { value: string[] | undefined; onChange: (v: string[]) => void; placeholder?: string }) => {
  const { colors } = useTheme();
  const text = (p.value || []).join('\n');
  return (
    <textarea
      value={text}
      onChange={(e) => p.onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
      placeholder={p.placeholder || '每行一项'}
      style={{ ...inputStyle(colors), minHeight: 60, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
    />
  );
};

// ---------------- 主组件 ----------------
type Tab = 'content' | 'rule' | 'preset';

const MdToWeb: React.FC = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('content');
  const [mdText, setMdText] = useState('');
  const [filename, setFilename] = useState('');
  const [rule, setRule] = useState<MdToWebRule>(DEFAULT_RULE);
  const [presets, setPresets] = useState<{ name: string; rule: MdToWebRule }[]>([]);
  const [activePresetName, setActivePresetName] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // 折叠卡片状态
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    style: false, content: false, transform: false, filter: false, output: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importPresetRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = loadPresets();
    setPresets(loaded);
    if (loaded.length > 0) {
      setActivePresetName(loaded[0].name);
      setRule(loaded[0].rule);
    }
  }, []);

  // frontmatter 预览
  const fmPreview = useMemo(() => {
    if (!mdText.trim()) return '';
    const { frontmatter } = parseFrontmatter(mdText);
    if (Object.keys(frontmatter).length === 0) return '(无 frontmatter)';
    return Object.entries(frontmatter)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`)
      .join('\n');
  }, [mdText]);

  // 修改规则某字段
  const updateRule = (section: keyof MdToWebRule, field: string, value: unknown) => {
    setRule((r) => ({ ...r, [section]: { ...r[section], [field]: value } }));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleGenerate = () => {
    if (!mdText.trim()) {
      setPreviewHtml('');
      showToast('请输入 Markdown 内容');
      return;
    }
    const result = convert(mdText, rule, { filename });
    setPreviewHtml(result.html);
    showToast('已生成预览');
  };

  const handleCopyHtml = async () => {
    if (!previewHtml) {
      showToast('请先生成预览');
      return;
    }
    try {
      await navigator.clipboard.writeText(previewHtml);
      showToast('HTML 已复制');
    } catch {
      showToast('复制失败');
    }
  };

  // 解析文件名模板
  const resolveFilename = (template: string): string => {
    const result = convert(mdText, rule, { filename });
    const meta = result.meta;
    let name = template;
    name = name.replace(/\{\{title\}\}/g, meta.title || 'document');
    name = name.replace(/\{\{filename\}\}/g, (filename || 'document').replace(/\.[^.]+$/, ''));
    name = name.replace(/\{\{date\}\}/g, new Date().toISOString().slice(0, 10));
    name = name.replace(/\{\{tags\}\}/g, meta.tags.join('-') || 'untagged');
    if (meta.frontmatter) {
      for (const [k, v] of Object.entries(meta.frontmatter)) {
        const val = Array.isArray(v) ? v.join('-') : String(v);
        name = name.replace(new RegExp(`\\{\\{frontmatter\\.${k}\\}\\}`, 'g'), val);
      }
    }
    return name.endsWith('.html') ? name : `${name}.html`;
  };

  const handleDownloadHtml = () => {
    if (!previewHtml) {
      showToast('请先生成预览');
      return;
    }
    const name = resolveFilename(rule.output.filenameTemplate);
    downloadFile(name, previewHtml);
    showToast(`已下载 ${name}`);
  };

  const handleDownloadMulti = () => {
    if (!mdText.trim()) {
      showToast('请输入内容');
      return;
    }
    const result = convert(mdText, rule, { filename });
    const assets = buildMultiFileAssets(rule);
    const baseName = resolveFilename(rule.output.filenameTemplate).replace(/\.html$/, '');
    downloadFile(`${baseName}.html`, result.html);
    setTimeout(() => downloadFile('style.css', assets.css, 'text/css'), 200);
    if (rule.output.includeScript) {
      setTimeout(() => downloadFile('script.js', assets.js, 'text/javascript'), 400);
    }
    showToast('已下载 HTML + CSS + JS');
  };

  // 文件读取
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMdText(String(reader.result || ''));
      setFilename(file.name);
      showToast(`已读取 ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 预设管理
  const handleApplyPreset = (name: string) => {
    const p = presets.find((x) => x.name === name);
    if (p) {
      setRule(p.rule);
      setActivePresetName(name);
      showToast(`已应用预设: ${name}`);
    }
  };

  const handleSavePreset = () => {
    const name = window.prompt('预设名称', activePresetName || '我的预设');
    if (!name) return;
    const idx = presets.findIndex((p) => p.name === name);
    const newPresets = [...presets];
    if (idx >= 0) {
      newPresets[idx] = { name, rule };
    } else {
      newPresets.push({ name, rule });
    }
    setPresets(newPresets);
    savePresets(newPresets);
    setActivePresetName(name);
    showToast(`已保存预设: ${name}`);
  };

  const handleDeletePreset = (name: string) => {
    if (!window.confirm(`删除预设 "${name}"？`)) return;
    const newPresets = presets.filter((p) => p.name !== name);
    setPresets(newPresets);
    savePresets(newPresets);
    if (activePresetName === name) {
      setActivePresetName(newPresets[0]?.name || '');
      if (newPresets[0]) setRule(newPresets[0].rule);
    }
    showToast('已删除');
  };

  const handleExportPreset = (name: string) => {
    const p = presets.find((x) => x.name === name);
    if (!p) return;
    downloadFile(`${name}.json`, JSON.stringify(p, null, 2), 'application/json');
    showToast('已导出预设');
  };

  const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        if (obj.name && obj.rule) {
          const newPresets = [...presets.filter((p) => p.name !== obj.name), { name: obj.name, rule: obj.rule }];
          setPresets(newPresets);
          savePresets(newPresets);
          showToast(`已导入预设: ${obj.name}`);
        } else {
          showToast('预设格式无效');
        }
      } catch {
        showToast('解析失败');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleCollapse = (key: string) => {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  };

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <svg width="22" height="22" viewBox="0 0 16 16" fill={colors.textPrimary}>
          <path d="M1 1h14v14H1V1zm1 1v12h12V2H2zm2 2h8v1H4V4zm0 3h8v1H4V7zm0 3h6v1H4v-1z"/>
        </svg>
        <h1 style={titleStyle}>Markdown → 静态网页</h1>
        <span style={{ color: colors.textSecondary, fontSize: 12 }}>· Obsidian 转 Wiki 形式</span>
      </div>

      <div style={mainStyle}>
        {/* 左栏 */}
        <div style={leftPaneStyle(colors)}>
          <div style={tabGroupStyle}>
            <button style={tabBtn(tab === 'content')} onClick={() => setTab('content')}>内容</button>
            <button style={tabBtn(tab === 'rule')} onClick={() => setTab('rule')}>规则</button>
            <button style={tabBtn(tab === 'preset')} onClick={() => setTab('preset')}>预设</button>
          </div>

          <div style={scrollAreaStyle}>
            {tab === 'content' && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <button style={secondaryBtnStyle(colors)} onClick={() => fileInputRef.current?.click()}>
                    📂 读取 .md 文件
                  </button>
                  <input
                    ref={fileInputRef} type="file" accept=".md,.markdown,.txt"
                    style={{ display: 'none' }} onChange={handleFileChange}
                  />
                  {filename && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: colors.textSecondary }}>
                      {filename}
                    </span>
                  )}
                </div>
                <div style={{ marginBottom: 4, ...labelStyle, color: colors.textSecondary }}>MARKDOWN 内容</div>
                <Area value={mdText} onChange={setMdText} placeholder={'粘贴 Markdown，例如：\n---\ntitle: 笔记标题\ntags: [笔记, wiki]\n---\n# 标题\n正文 [[链接]] #tag\n> [!note] 提示\n> 内容'} />
                <div style={{ marginTop: 10, marginBottom: 4, ...labelStyle, color: colors.textSecondary }}>FRONTMATTER 预览</div>
                <pre style={{
                  ...inputStyle(colors), padding: '8px',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  minHeight: 40, fontSize: 12, margin: 0,
                  color: colors.textSecondary,
                }}>{fmPreview}</pre>
              </>
            )}

            {tab === 'rule' && (
              <>
                {/* 样式外观 */}
                <RuleCard
                  title="样式外观" colors={colors} collapsed={collapsed.style}
                  onToggle={() => toggleCollapse('style')}
                >
                  <Field label="主题">
                    <select style={selectStyle(colors)} value={rule.style.theme}
                      onChange={(e) => updateRule('style', 'theme', e.target.value)}>
                      <option value="light">light</option>
                      <option value="dark">dark</option>
                      <option value="sepia">sepia</option>
                      <option value="obsidian">obsidian</option>
                    </select>
                  </Field>
                  <Field label="字体">
                    <input style={inputStyle(colors)} value={rule.style.fontFamily}
                      onChange={(e) => updateRule('style', 'fontFamily', e.target.value)} />
                  </Field>
                  <Field label="正文最大宽度 (px)">
                    <input type="number" style={inputStyle(colors)} value={rule.style.maxWidth}
                      onChange={(e) => updateRule('style', 'maxWidth', parseInt(e.target.value) || 800)} />
                  </Field>
                  <Field label="左侧 TOC 侧栏">
                    <input type="checkbox" checked={rule.style.sidebar}
                      onChange={(e) => updateRule('style', 'sidebar', e.target.checked)} />
                  </Field>
                  <Field label="代码高亮主题">
                    <select style={selectStyle(colors)} value={rule.style.codeHighlight}
                      onChange={(e) => updateRule('style', 'codeHighlight', e.target.value)}>
                      <option value="github">github</option>
                      <option value="dracula">dracula</option>
                      <option value="monokai">monokai</option>
                    </select>
                  </Field>
                  <Field label="自定义 CSS（追加）">
                    <textarea style={{ ...inputStyle(colors), minHeight: 60, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
                      value={rule.style.customCss || ''}
                      onChange={(e) => updateRule('style', 'customCss', e.target.value)}
                      placeholder="/* 例如 */\n.doc-title { text-align: center; }" />
                  </Field>
                </RuleCard>

                {/* 内容结构 */}
                <RuleCard
                  title="内容结构" colors={colors} collapsed={collapsed.content}
                  onToggle={() => toggleCollapse('content')}
                >
                  <Field label="生成 TOC">
                    <input type="checkbox" checked={rule.content.generateToc}
                      onChange={(e) => updateRule('content', 'generateToc', e.target.checked)} />
                  </Field>
                  <Field label="TOC 深度">
                    <select style={selectStyle(colors)} value={rule.content.tocDepth}
                      onChange={(e) => updateRule('content', 'tocDepth', parseInt(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label="标题锚点">
                    <input type="checkbox" checked={rule.content.headingAnchors}
                      onChange={(e) => updateRule('content', 'headingAnchors', e.target.checked)} />
                  </Field>
                  <Field label="显示 frontmatter 表">
                    <input type="checkbox" checked={rule.content.showFrontmatter}
                      onChange={(e) => updateRule('content', 'showFrontmatter', e.target.checked)} />
                  </Field>
                  <Field label="显示标签区">
                    <input type="checkbox" checked={rule.content.showTags}
                      onChange={(e) => updateRule('content', 'showTags', e.target.checked)} />
                  </Field>
                  <Field label="Callout 样式">
                    <select style={selectStyle(colors)} value={rule.content.calloutStyle}
                      onChange={(e) => updateRule('content', 'calloutStyle', e.target.value)}>
                      <option value="obsidian">obsidian</option>
                      <option value="github">github</option>
                      <option value="plain">plain</option>
                    </select>
                  </Field>
                </RuleCard>

                {/* 文本转换 */}
                <RuleCard
                  title="文本转换" colors={colors} collapsed={collapsed.transform}
                  onToggle={() => toggleCollapse('transform')}
                >
                  <Field label="[[wikilink]] 处理">
                    <select style={selectStyle(colors)} value={rule.transform.wikilinkMode}
                      onChange={(e) => updateRule('transform', 'wikilinkMode', e.target.value)}>
                      <option value="link">链接</option>
                      <option value="plain">纯文本</option>
                      <option value="strip">剔除</option>
                    </select>
                  </Field>
                  <Field label="wikilink 前缀（支持 {{frontmatter.vault}}）">
                    <input style={inputStyle(colors)} value={rule.transform.wikilinkBaseUrl}
                      onChange={(e) => updateRule('transform', 'wikilinkBaseUrl', e.target.value)}
                      placeholder="{{frontmatter.vault}}/" />
                  </Field>
                  <Field label="![[embed]] 处理">
                    <select style={selectStyle(colors)} value={rule.transform.embedMode}
                      onChange={(e) => updateRule('transform', 'embedMode', e.target.value)}>
                      <option value="link">链接</option>
                      <option value="placeholder">占位</option>
                      <option value="strip">剔除</option>
                    </select>
                  </Field>
                  <Field label="#tag 处理">
                    <select style={selectStyle(colors)} value={rule.transform.tagMode}
                      onChange={(e) => updateRule('transform', 'tagMode', e.target.value)}>
                      <option value="badge">徽章</option>
                      <option value="link">链接</option>
                      <option value="plain">纯文本</option>
                    </select>
                  </Field>
                  <Field label="剔除 %%注释%%">
                    <input type="checkbox" checked={rule.transform.stripComments}
                      onChange={(e) => updateRule('transform', 'stripComments', e.target.checked)} />
                  </Field>
                </RuleCard>

                {/* 内容筛选 */}
                <RuleCard
                  title="内容筛选" colors={colors} collapsed={collapsed.filter}
                  onToggle={() => toggleCollapse('filter')}
                >
                  <div style={helpTextStyle}>支持正则，每行一条。仅保留/剔除命中的标题 section。</div>
                  <Field label="includeHeadings（仅保留匹配标题）">
                    <ListInput value={rule.filter.includeHeadings}
                      onChange={(v) => updateRule('filter', 'includeHeadings', v)}
                      placeholder={'例如：\n笔记\n^第.+章'} />
                  </Field>
                  <Field label="excludeHeadings（剔除匹配标题）">
                    <ListInput value={rule.filter.excludeHeadings}
                      onChange={(v) => updateRule('filter', 'excludeHeadings', v)} />
                  </Field>
                  <Field label="includeTags（仅保留含此标签的 section）">
                    <ListInput value={rule.filter.includeTags}
                      onChange={(v) => updateRule('filter', 'includeTags', v)} />
                  </Field>
                  <Field label="excludeTags（剔除含此标签的 section）">
                    <ListInput value={rule.filter.excludeTags}
                      onChange={(v) => updateRule('filter', 'excludeTags', v)} />
                  </Field>
                </RuleCard>

                {/* 输出形式 */}
                <RuleCard
                  title="输出形式" colors={colors} collapsed={collapsed.output}
                  onToggle={() => toggleCollapse('output')}
                >
                  <Field label="输出模式">
                    <select style={selectStyle(colors)} value={rule.output.mode}
                      onChange={(e) => updateRule('output', 'mode', e.target.value)}>
                      <option value="single-file">单文件（内联 CSS/JS）</option>
                      <option value="multi-file">多文件（HTML + CSS + JS）</option>
                    </select>
                  </Field>
                  <Field label="包含交互脚本">
                    <input type="checkbox" checked={rule.output.includeScript}
                      onChange={(e) => updateRule('output', 'includeScript', e.target.checked)} />
                  </Field>
                  <Field label="文件名模板（支持 {{...}}）">
                    <input style={inputStyle(colors)} value={rule.output.filenameTemplate}
                      onChange={(e) => updateRule('output', 'filenameTemplate', e.target.value)}
                      placeholder="{{title}}.html" />
                  </Field>
                  <Field label="html lang">
                    <input style={inputStyle(colors)} value={rule.output.htmlLang}
                      onChange={(e) => updateRule('output', 'htmlLang', e.target.value)} />
                  </Field>
                </RuleCard>
              </>
            )}

            {tab === 'preset' && (
              <>
                <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={primaryBtnStyle} onClick={handleSavePreset}>💾 保存当前为预设</button>
                  <button style={secondaryBtnStyle(colors)} onClick={() => importPresetRef.current?.click()}>
                    📥 导入 JSON
                  </button>
                  <input ref={importPresetRef} type="file" accept=".json"
                    style={{ display: 'none' }} onChange={handleImportPreset} />
                </div>
                <div style={{ ...labelStyle, color: colors.textSecondary }}>预设列表（点击应用）</div>
                {presets.map((p) => (
                  <div key={p.name} style={presetRowStyle(colors, activePresetName === p.name)}
                    onClick={() => handleApplyPreset(p.name)}>
                    <span>{p.name}</span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button title="导出" onClick={(e) => { e.stopPropagation(); handleExportPreset(p.name); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: colors.textSecondary }}>⬇</button>
                      <button title="删除" onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.name); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, color: '#f85149' }}>✕</button>
                    </span>
                  </div>
                ))}
                {presets.length === 0 && (
                  <div style={{ ...helpTextStyle, color: colors.textSecondary, textAlign: 'center', padding: 20 }}>
                    暂无预设，点击「保存当前为预设」创建
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 右栏：预览 */}
        <div style={rightPaneStyle(colors)}>
          <div style={previewBtnRowStyle}>
            <button style={primaryBtnStyle} onClick={handleGenerate}>▸ 生成预览</button>
            <button style={secondaryBtnStyle(colors)} onClick={handleCopyHtml}>复制 HTML</button>
            <button style={secondaryBtnStyle(colors)} onClick={handleDownloadHtml}>下载 .html</button>
            {rule.output.mode === 'multi-file' && (
              <button style={secondaryBtnStyle(colors)} onClick={handleDownloadMulti}>下载多文件</button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textSecondary }}>
              {previewHtml ? `${previewHtml.length} 字符` : '未生成'}
            </span>
          </div>
          {previewHtml ? (
            <iframe title="preview" srcDoc={previewHtml} style={iframeStyle} sandbox="allow-scripts" />
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.textSecondary, fontSize: 13,
            }}>
              # 输入 Markdown 并点击「生成预览」
            </div>
          )}
        </div>
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

// ---------------- 子组件 ----------------
const RuleCard: React.FC<{
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, colors, collapsed, onToggle, children }) => (
  <div style={cardStyle(colors)}>
    <div style={cardHeaderStyle(colors)} onClick={onToggle}>
      <span>{title}</span>
      <span style={{ fontSize: 11, opacity: 0.6 }}>{collapsed ? '展开 ▸' : '收起 ▾'}</span>
    </div>
    {!collapsed && <div style={cardBodyStyle}>{children}</div>}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={labelStyle}>{label}</div>
    {children}
  </div>
);

export default MdToWeb;
