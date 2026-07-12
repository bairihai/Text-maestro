/**
 * Markdown → 静态网页 转换逻辑
 *
 * 流水线：frontmatter 解析 → 元数据提取 → 规则模板替换 → 内容筛选
 *        → Obsidian 语法预处理 → markdown-it 渲染 → TOC 生成 → HTML 包装
 *
 * 核心场景：Obsidian 笔记 → Wiki 形式静态 HTML
 */
import MarkdownIt from 'markdown-it';

// ============================================================
// 一、规则 Schema
// ============================================================

export interface MdToWebRule {
  style: {
    theme: 'light' | 'dark' | 'sepia' | 'obsidian';
    fontFamily: string;
    maxWidth: number;
    sidebar: boolean;
    codeHighlight: 'github' | 'dracula' | 'monokai';
    customCss?: string;
  };
  content: {
    generateToc: boolean;
    tocDepth: 1 | 2 | 3 | 4 | 5 | 6;
    headingAnchors: boolean;
    showFrontmatter: boolean;
    showTags: boolean;
    calloutStyle: 'obsidian' | 'github' | 'plain';
  };
  transform: {
    wikilinkMode: 'link' | 'plain' | 'strip';
    wikilinkBaseUrl: string;
    embedMode: 'link' | 'placeholder' | 'strip';
    tagMode: 'badge' | 'link' | 'plain';
    stripComments: boolean;
    customReplacements?: { pattern: string; replacement: string; flags?: string }[];
  };
  filter: {
    includeHeadings?: string[];
    excludeHeadings?: string[];
    includeTags?: string[];
    excludeTags?: string[];
    frontmatterFilter?: { field: string; value: string }[];
  };
  output: {
    mode: 'single-file' | 'multi-file';
    includeScript: boolean;
    filenameTemplate: string;
    htmlLang: string;
  };
}

// ============================================================
// 二、内置预设
// ============================================================

export const DEFAULT_PRESETS: { name: string; rule: MdToWebRule }[] = [
  {
    name: 'Obsidian→Wiki',
    rule: {
      style: {
        theme: 'obsidian',
        fontFamily: '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        maxWidth: 820,
        sidebar: true,
        codeHighlight: 'dracula',
      },
      content: {
        generateToc: true,
        tocDepth: 3,
        headingAnchors: true,
        showFrontmatter: true,
        showTags: true,
        calloutStyle: 'obsidian',
      },
      transform: {
        wikilinkMode: 'link',
        wikilinkBaseUrl: '{{frontmatter.vault}}/',
        embedMode: 'link',
        tagMode: 'badge',
        stripComments: true,
      },
      filter: {},
      output: {
        mode: 'single-file',
        includeScript: true,
        filenameTemplate: '{{title}}.html',
        htmlLang: 'zh-CN',
      },
    },
  },
  {
    name: '极简纯文本',
    rule: {
      style: {
        theme: 'light',
        fontFamily: 'Georgia, "Times New Roman", serif',
        maxWidth: 680,
        sidebar: false,
        codeHighlight: 'github',
      },
      content: {
        generateToc: false,
        tocDepth: 3,
        headingAnchors: false,
        showFrontmatter: false,
        showTags: false,
        calloutStyle: 'plain',
      },
      transform: {
        wikilinkMode: 'plain',
        wikilinkBaseUrl: '',
        embedMode: 'strip',
        tagMode: 'plain',
        stripComments: true,
      },
      filter: {},
      output: {
        mode: 'single-file',
        includeScript: false,
        filenameTemplate: '{{title}}.html',
        htmlLang: 'zh-CN',
      },
    },
  },
  {
    name: 'GitHub 文档风格',
    rule: {
      style: {
        theme: 'light',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        maxWidth: 980,
        sidebar: true,
        codeHighlight: 'github',
      },
      content: {
        generateToc: true,
        tocDepth: 4,
        headingAnchors: true,
        showFrontmatter: true,
        showTags: false,
        calloutStyle: 'github',
      },
      transform: {
        wikilinkMode: 'link',
        wikilinkBaseUrl: '',
        embedMode: 'link',
        tagMode: 'badge',
        stripComments: true,
      },
      filter: {},
      output: {
        mode: 'single-file',
        includeScript: true,
        filenameTemplate: '{{filename}}.html',
        htmlLang: 'zh-CN',
      },
    },
  },
];

// ============================================================
// 三、内容元数据
// ============================================================

export interface ContentMeta {
  frontmatter: Record<string, unknown>;
  body: string;
  title: string;
  headings: { level: number; text: string; slug: string }[];
  tags: string[];
  filename: string;
}

/** 解析首部 YAML frontmatter（仅支持扁平 key:value 与 - item 列表） */
export function parseFrontmatter(text: string): { frontmatter: Record<string, unknown>; body: string } {
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!fmMatch) return { frontmatter: {}, body: text };

  const fmText = fmMatch[1];
  const body = text.slice(fmMatch[0].length);
  const frontmatter: Record<string, unknown> = {};
  let currentKey = '';

  for (const line of fmText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 列表项
    if (trimmed.startsWith('- ') && currentKey) {
      const existing = frontmatter[currentKey];
      const item = trimmed.slice(2).replace(/^["']|["']$/g, '');
      if (Array.isArray(existing)) {
        existing.push(item);
      } else if (existing !== undefined) {
        frontmatter[currentKey] = [String(existing), item];
      } else {
        frontmatter[currentKey] = [item];
      }
      continue;
    }

    // key: value
    const kvMatch = trimmed.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kvMatch) {
      const [, key, rawVal] = kvMatch;
      currentKey = key;
      let val: unknown = rawVal.trim();
      // 去引号
      if (typeof val === 'string' && /^["'].*["']$/.test(val)) {
        val = val.slice(1, -1);
      }
      // 类型推断
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === '' || val === undefined) val = ''; // 空值，可能是后续列表
      else if (typeof val === 'string' && /^\d+$/.test(val)) val = parseInt(val, 10);
      else if (typeof val === 'string' && /^\d+\.\d+$/.test(val)) val = parseFloat(val);
      frontmatter[key] = val;
    }
  }
  return { frontmatter, body };
}

/** 将标题文本转为 slug（用于锚点） */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** 提取元数据：首个 H1、所有标题、所有 #tag */
export function extractMeta(body: string, filename = ''): Omit<ContentMeta, 'frontmatter'> {
  const headings: ContentMeta['headings'] = [];
  let title = '';
  const tags = new Set<string>();

  // 首个 H1 作为 title
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match) title = h1Match[1].trim();

  // 所有标题
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(body)) !== null) {
    const level = m[1].length;
    const text = m[2].trim();
    headings.push({ level, text, slug: slugify(text) });
  }

  // #tag（行首或行内，需前后是空白或行首/行尾）
  const tagRegex = /(?:^|\s)#([\w\u4e00-\u9fa5][\w\u4e00-\u9fa5/-]*)/g;
  while ((m = tagRegex.exec(body)) !== null) {
    tags.add(m[1]);
  }

  // 若无 H1，用 filename
  if (!title && filename) {
    title = filename.replace(/\.[^.]+$/, '');
  }

  return {
    body,
    title,
    headings,
    tags: Array.from(tags),
    filename,
  };
}

// ============================================================
// 四、规则模板替换（动态规则，读取内容源）
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 对单个字符串做 {{...}} 模板替换 */
function substituteTemplate(value: string, meta: ContentMeta): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (_, expr: string) => {
    const path = expr.trim();
    if (path === 'title') return escapeHtml(meta.title);
    if (path === 'tags') return escapeHtml(meta.tags.join(' '));
    if (path === 'filename') return escapeHtml(meta.filename.replace(/\.[^.]+$/, ''));
    if (path === 'date') return formatDate();
    if (path.startsWith('frontmatter.')) {
      const key = path.slice('frontmatter.'.length);
      const val = meta.frontmatter[key];
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return escapeHtml(val.join(', '));
      return escapeHtml(String(val));
    }
    return `{{${expr}}}`; // 未知占位符保留原样
  });
}

/** 深度遍历规则对象，对每个字符串值做模板替换 */
export function resolveRule(rule: MdToWebRule, meta: ContentMeta): MdToWebRule {
  const clone = JSON.parse(JSON.stringify(rule)) as MdToWebRule;
  const walk = (obj: unknown): unknown => {
    if (typeof obj === 'string') return substituteTemplate(obj, meta);
    if (Array.isArray(obj)) return obj.map(walk);
    if (obj && typeof obj === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj)) out[k] = walk((obj as Record<string, unknown>)[k]);
      return out;
    }
    return obj;
  };
  return walk(clone) as MdToWebRule;
}

// ============================================================
// 五、内容筛选（section 级别）
// ============================================================

interface Section {
  headingLine: string | null; // 完整标题行（含 #）或 null
  headingText: string;
  level: number;
  body: string;
  tags: string[];
}

/** 按标题切分 sections（复用 markdown-outline.tsx parseArticle 思路） */
function splitSections(body: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  const lines = body.split('\n');
  const tagRegex = /(?:^|\s)#([\w\u4e00-\u9fa5][\w\u4e00-\u9fa5/-]*)/g;

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      const level = m[1].length;
      const headingText = m[2].trim();
      current = {
        headingLine: line,
        headingText,
        level,
        body: '',
        tags: [],
      };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
      let tm: RegExpExecArray | null;
      while ((tm = tagRegex.exec(line)) !== null) {
        current.tags.push(tm[1]);
      }
    } else {
      // 标题前的前言部分
      current = {
        headingLine: null,
        headingText: '',
        level: 0,
        body: line,
        tags: [],
      };
    }
  }
  if (current) sections.push(current);
  return sections;
}

/** 按 filter 规则保留或剔除 section */
export function applyFilter(
  body: string,
  filter: MdToWebRule['filter'],
  meta: ContentMeta,
): string {
  const hasIncludeHeadings = filter.includeHeadings && filter.includeHeadings.length > 0;
  const hasExcludeHeadings = filter.excludeHeadings && filter.excludeHeadings.length > 0;
  const hasIncludeTags = filter.includeTags && filter.includeTags.length > 0;
  const hasExcludeTags = filter.excludeTags && filter.excludeTags.length > 0;
  const hasFmFilter = filter.frontmatterFilter && filter.frontmatterFilter.length > 0;

  // frontmatter 过滤：文档级（任一不满足即整体剔除）
  if (hasFmFilter) {
    for (const f of filter.frontmatterFilter!) {
      const val = meta.frontmatter[f.field];
      const valStr = val === undefined ? '' : Array.isArray(val) ? val.join(',') : String(val);
      if (valStr !== f.value) return '';
    }
  }

  if (!hasIncludeHeadings && !hasExcludeHeadings && !hasIncludeTags && !hasExcludeTags) {
    return body;
  }

  const sections = splitSections(body);
  const kept: Section[] = [];

  for (const sec of sections) {
    // 前言（无标题）总保留
    if (sec.level === 0) {
      kept.push(sec);
      continue;
    }
    // include headings：必须命中其一（若启用）
    if (hasIncludeHeadings) {
      let matched = false;
      for (const pat of filter.includeHeadings!) {
        try {
          if (new RegExp(pat).test(sec.headingText)) {
            matched = true;
            break;
          }
        } catch {
          if (sec.headingText.includes(pat)) {
            matched = true;
            break;
          }
        }
      }
      if (!matched) continue;
    }
    // exclude headings：命中则剔除
    if (hasExcludeHeadings) {
      let excluded = false;
      for (const pat of filter.excludeHeadings!) {
        try {
          if (new RegExp(pat).test(sec.headingText)) {
            excluded = true;
            break;
          }
        } catch {
          if (sec.headingText.includes(pat)) {
            excluded = true;
            break;
          }
        }
      }
      if (excluded) continue;
    }
    // include tags：section 必须含任一指定 tag
    if (hasIncludeTags) {
      if (!filter.includeTags!.some((t) => sec.tags.includes(t))) continue;
    }
    // exclude tags：section 含任一即剔除
    if (hasExcludeTags) {
      if (filter.excludeTags!.some((t) => sec.tags.includes(t))) continue;
    }
    kept.push(sec);
  }

  // 重组
  return kept
    .map((sec) => (sec.headingLine ? `${sec.headingLine}\n${sec.body}` : sec.body))
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================
// 六、Obsidian 语法预处理
// ============================================================

/** 处理 [[wikilink]]、![[embed]]、#tag、%%comment%%、> [!note] callout */
export function preprocessObsidian(
  body: string,
  transform: MdToWebRule['transform'],
  wikiLinkMap?: Map<string, string>,
): string {
  let out = body;

  // %%comment%%
  if (transform.stripComments) {
    out = out.replace(/%%([\s\S]*?)%%/g, '');
  } else {
    out = out.replace(/%%([\s\S]*?)%%/g, (_, c: string) => `<!-- ${c.trim()} -->`);
  }

  // ![[embed]]
  const embedFn = (inner: string): string => {
    switch (transform.embedMode) {
      case 'strip':
        return '';
      case 'placeholder':
        return `<div class="embed-placeholder">[嵌入: ${escapeHtml(inner)}]</div>`;
      case 'link':
      default:
        return `<a class="embed-link" href="${escapeHtml(inner)}">嵌入: ${escapeHtml(inner)}</a>`;
    }
  };
  out = out.replace(/!\[\[([^\]]+)\]\]/g, (_, inner: string) => embedFn(inner));

  // [[wikilink]] 或 [[wikilink|display]]
  const wikiFn = (target: string, display?: string): string => {
    const showText = display || target;
    // 优先查跨文件映射表
    if (wikiLinkMap && wikiLinkMap.has(target)) {
      return `<a class="wikilink" href="${wikiLinkMap.get(target)}">${escapeHtml(showText)}</a>`;
    }
    // map 存在但未命中，且模式为 link → 标记 broken（不静默丢失）
    if (wikiLinkMap && transform.wikilinkMode === 'link') {
      return `<a class="wikilink broken" title="未找到目标文件">${escapeHtml(showText)}</a>`;
    }
    // 无 map 时回退到原逻辑（单文档行为保持不变）
    switch (transform.wikilinkMode) {
      case 'strip':
        return escapeHtml(showText);
      case 'plain':
        return escapeHtml(showText);
      case 'link':
      default: {
        const url = `${transform.wikilinkBaseUrl || ''}${encodeURIComponent(target)}`;
        return `<a class="wikilink" href="${url}">${escapeHtml(showText)}</a>`;
      }
    }
  };
  out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, display?: string) =>
    wikiFn(target, display),
  );

  // #tag（行首或行内；正则要求 # 后紧跟 word/中文字符，天然跳过 ATX 标题 `# 标题`）
  const tagFn = (tag: string): string => {
    switch (transform.tagMode) {
      case 'plain':
        return `#${tag}`;
      case 'badge':
        return `<span class="tag-badge">#${escapeHtml(tag)}</span>`;
      case 'link':
        return `<a class="tag-link" href="#tag-${encodeURIComponent(tag)}">#${escapeHtml(tag)}</a>`;
      default:
        return `#${tag}`;
    }
  };
  out = out.replace(/(^|[^\w#])(#([\w\u4e00-\u9fa5][\w\u4e00-\u9fa5/-]*))/g, (_, pre: string, _full: string, tag: string) => {
    return `${pre}${tagFn(tag)}`;
  });

  // > [!note|warning|tip|...] callout
  out = out.replace(
    /^>\s*\[!(\w+)\](?:[^\n]*)\n((?:>\s?.*(?:\n|$))+)/gm,
    (_, type: string, content: string) => {
      const inner = content
        .split('\n')
        .map((l: string) => l.replace(/^>\s?/, ''))
        .join('\n')
        .trim();
      return `<div class="callout callout-${type.toLowerCase()}"><div class="callout-title">${type.toUpperCase()}</div>\n<div class="callout-body">\n\n${inner}\n\n</div></div>`;
    },
  );

  // 用户自定义替换
  if (transform.customReplacements) {
    for (const r of transform.customReplacements) {
      try {
        const flags = r.flags || 'g';
        out = out.replace(new RegExp(r.pattern, flags), r.replacement);
      } catch {
        // 非法正则忽略
      }
    }
  }

  return out;
}

// ============================================================
// 七、markdown-it 渲染
// ============================================================

let mdInstance: MarkdownIt | null = null;
function getMd(): MarkdownIt {
  if (mdInstance) return mdInstance;
  mdInstance = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
    typographer: true,
  });
  // 在 heading_open token 上注入 id 属性（用于锚点跳转）
  mdInstance.core.ruler.push('inject_heading_id', (state) => {
    for (let i = 0; i < state.tokens.length - 1; i++) {
      const tok = state.tokens[i];
      if (tok.type === 'heading_open' && state.tokens[i + 1].type === 'inline') {
        const text = state.tokens[i + 1].content;
        tok.attrSet('id', slugify(text));
      }
    }
    return true;
  });
  return mdInstance;
}

export function renderMarkdown(mdText: string): string {
  return getMd().render(mdText);
}

// ============================================================
// 八、TOC 生成
// ============================================================

export function buildToc(headings: ContentMeta['headings'], maxDepth: number): string {
  const filtered = headings.filter((h) => h.level <= maxDepth);
  if (filtered.length === 0) return '';

  const lines: string[] = ['<nav class="toc">', '<ul>'];
  let prevLevel = 0;
  for (const h of filtered) {
    if (h.level > prevLevel) {
      for (let i = prevLevel; i < h.level; i++) lines.push('<ul>');
    } else if (h.level < prevLevel) {
      for (let i = h.level; i < prevLevel; i++) lines.push('</li></ul>');
    } else if (prevLevel > 0) {
      lines.push('</li>');
    }
    lines.push(
      `<li><a href="#${escapeHtml(h.slug)}">${escapeHtml(h.text)}</a>`,
    );
    prevLevel = h.level;
  }
  // 关闭
  for (let i = 0; i < prevLevel; i++) lines.push('</li></ul>');
  lines.push('</ul>', '</nav>');
  return lines.join('\n');
}

// ============================================================
// 九、HTML 包装
// ============================================================

function buildFrontmatterTable(fm: Record<string, unknown>): string {
  const keys = Object.keys(fm);
  if (keys.length === 0) return '';
  const rows = keys
    .map((k) => {
      const v = fm[k];
      const valStr = Array.isArray(v) ? v.join(', ') : String(v);
      return `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(valStr)}</td></tr>`;
    })
    .join('\n');
  return `<table class="frontmatter"><tbody>\n${rows}\n</tbody></table>`;
}

function buildTagsHtml(tags: string[]): string {
  if (tags.length === 0) return '';
  const badges = tags
    .map((t) => `<a class="tag-link" href="#tag-${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`)
    .join(' ');
  return `<div class="tags">${badges}</div>`;
}

export interface ConvertResult {
  html: string;
  innerHtml: string;
  meta: ContentMeta;
  resolvedRule: MdToWebRule;
}

export interface ConvertOptions {
  filename?: string;
}

/** 流水线总入口 */
export function convert(text: string, rule: MdToWebRule, options: ConvertOptions = {}): ConvertResult {
  const filename = options.filename || '';

  // 1. frontmatter
  const { frontmatter, body: bodyAfterFm } = parseFrontmatter(text);

  // 2. 元数据
  const metaBase = extractMeta(bodyAfterFm, filename);
  const meta: ContentMeta = { frontmatter, ...metaBase };

  // 3. 规则模板替换
  const resolvedRule = resolveRule(rule, meta);

  // 4. 内容筛选
  const filteredBody = applyFilter(bodyAfterFm, resolvedRule.filter, meta);

  // 5. Obsidian 预处理
  const preprocessed = preprocessObsidian(filteredBody, resolvedRule.transform);

  // 6. 渲染（heading id 已由 markdown-it ruler 自动注入）
  const innerHtml = renderMarkdown(preprocessed);

  // 7. TOC
  const tocHtml = resolvedRule.content.generateToc
    ? buildToc(meta.headings, resolvedRule.content.tocDepth)
    : '';

  // 8. frontmatter 表 / 标签
  const fmTable = resolvedRule.content.showFrontmatter ? buildFrontmatterTable(frontmatter) : '';
  const tagsHtml = resolvedRule.content.showTags ? buildTagsHtml(meta.tags) : '';

  // 9. 包装完整 HTML
  const html = wrapHtml({
    innerHtml,
    tocHtml,
    fmTable,
    tagsHtml,
    title: meta.title || filename || 'Document',
    rule: resolvedRule,
  });

  return { html, innerHtml, meta, resolvedRule };
}

interface WrapParams {
  innerHtml: string;
  tocHtml: string;
  fmTable: string;
  tagsHtml: string;
  title: string;
  rule: MdToWebRule;
}

function wrapHtml(p: WrapParams): string {
  const { rule } = p;
  const isSingleFile = rule.output.mode === 'single-file';
  const cssHref = isSingleFile ? null : 'assets/style.css';
  const jsHref = isSingleFile ? null : 'assets/script.js';

  const themeCss = THEME_CSS[rule.style.theme];
  const codeCss = CODE_THEME_CSS[rule.style.codeHighlight];
  const customCss = rule.style.customCss || '';

  const inlineStyle = isSingleFile
    ? `<style>\n${themeCss}\n${codeCss}\n${BASE_CSS}\n${customCss}\n</style>`
    : `<link rel="stylesheet" href="${cssHref}">`;
  const inlineScript =
    rule.output.includeScript && isSingleFile
      ? `<script>\n${INTERACTIVE_JS}\n</script>`
      : rule.output.includeScript
        ? `<script src="${jsHref}"></script>`
        : '';

  const layoutClass = rule.style.sidebar && p.tocHtml ? 'layout-with-sidebar' : 'layout-single';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(rule.output.htmlLang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(p.title)}</title>
${inlineStyle}
</head>
<body>
<div class="${layoutClass}">
${rule.style.sidebar && p.tocHtml ? `<aside class="sidebar">\n${p.tocHtml}\n</aside>\n` : ''}
<main class="content" style="max-width:${rule.style.maxWidth}px;font-family:${escapeHtml(rule.style.fontFamily)}">
<h1 class="doc-title">${escapeHtml(p.title)}</h1>
${p.fmTable}
${p.tocHtml && !rule.style.sidebar ? `<section class="toc-inline">\n${p.tocHtml}\n</section>` : ''}
<article class="article-body">
${p.innerHtml}
</article>
${p.tagsHtml}
<footer class="doc-footer">生成于 {{date}} · Text-maestro</footer>
</main>
</div>
${inlineScript}
</body>
</html>`.replace('{{date}}', formatDate());
}

/** 多文件模式：返回各资源内容 */
export function buildMultiFileAssets(rule: MdToWebRule): { css: string; js: string } {
  const themeCss = THEME_CSS[rule.style.theme];
  const codeCss = CODE_THEME_CSS[rule.style.codeHighlight];
  const customCss = rule.style.customCss || '';
  return {
    css: `${themeCss}\n\n${codeCss}\n\n${BASE_CSS}\n\n${customCss}`,
    js: INTERACTIVE_JS,
  };
}

// ============================================================
// 十、主题 CSS
// ============================================================

const BASE_CSS = `
* { box-sizing: border-box; }
body { margin: 0; padding: 0; line-height: 1.6; }
.layout-with-sidebar { display: flex; min-height: 100vh; }
.sidebar { position: sticky; top: 0; align-self: flex-start; width: 260px; max-height: 100vh; overflow-y: auto; padding: 24px 16px; border-right: 1px solid var(--border-color); flex-shrink: 0; }
.content { margin: 0 auto; padding: 40px 24px 80px; flex: 1; }
.layout-single .content { margin: 0 auto; }
.doc-title { font-size: 2em; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
.article-body h1 { font-size: 1.6em; margin-top: 32px; }
.article-body h2 { font-size: 1.4em; margin-top: 28px; }
.article-body h3 { font-size: 1.2em; margin-top: 24px; }
.article-body h4 { font-size: 1.05em; margin-top: 20px; }
.article-body h5, .article-body h6 { font-size: 1em; margin-top: 16px; }
.article-body p { margin: 12px 0; }
.article-body ul, .article-body ol { padding-left: 24px; }
.article-body code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; background: var(--code-bg); }
.article-body pre { padding: 16px; border-radius: 6px; overflow-x: auto; }
.article-body pre code { padding: 0; background: transparent; }
.article-body blockquote { margin: 16px 0; padding: 8px 16px; border-left: 4px solid var(--border-strong); color: var(--text-secondary); }
.article-body table { border-collapse: collapse; margin: 16px 0; width: 100%; }
.article-body th, .article-body td { border: 1px solid var(--border-color); padding: 6px 12px; text-align: left; }
.article-body th { background: var(--code-bg); font-weight: 600; }
.article-body img { max-width: 100%; }
.frontmatter { margin: 16px 0; font-size: 13px; }
.frontmatter th { background: var(--code-bg); width: 120px; }
.tags { margin: 24px 0 8px; padding-top: 12px; border-top: 1px solid var(--border-color); }
.tag-badge, .tag-link { display: inline-block; padding: 2px 8px; margin: 2px 4px 2px 0; border-radius: 10px; font-size: 12px; background: var(--tag-bg); color: var(--tag-text); text-decoration: none; }
.wikilink { color: var(--link-color); text-decoration: none; border-bottom: 1px dashed var(--link-color); }
.embed-link { color: var(--link-color); font-style: italic; }
.embed-placeholder { padding: 8px 12px; margin: 8px 0; border: 1px dashed var(--border-strong); border-radius: 4px; color: var(--text-secondary); }
.callout { margin: 16px 0; padding: 12px 16px; border-radius: 4px; border-left: 4px solid var(--callout-border); background: var(--callout-bg); }
.callout-title { font-weight: 600; font-size: 13px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.callout-body > :first-child { margin-top: 0; }
.callout-body > :last-child { margin-bottom: 0; }
.doc-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary); text-align: center; }
.toc { font-size: 13px; }
.toc ul { list-style: none; padding-left: 12px; margin: 4px 0; }
.toc > ul { padding-left: 0; }
.toc a { color: var(--text-secondary); text-decoration: none; display: block; padding: 2px 4px; border-radius: 3px; }
.toc a:hover { background: var(--code-bg); color: var(--text-primary); }
.toc-inline { margin: 16px 0 24px; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 6px; }
.toc-inline .toc { padding-left: 0; }
`;

const THEME_CSS: Record<string, string> = {
  light: `
:root {
  --bg: #ffffff;
  --text-primary: #1f2328;
  --text-secondary: #656d76;
  --border-color: #d0d7de;
  --border-strong: #8c959f;
  --code-bg: #f6f8fa;
  --link-color: #0969da;
  --tag-bg: #ddf4ff;
  --tag-text: #0969da;
  --callout-border: #0969da;
  --callout-bg: #ddf4ff;
}
body { background: var(--bg); color: var(--text-primary); }
`,
  dark: `
:root {
  --bg: #0d1117;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --border-color: #30363d;
  --border-strong: #6e7681;
  --code-bg: #161b22;
  --link-color: #58a6ff;
  --tag-bg: #1f6feb33;
  --tag-text: #79c0ff;
  --callout-border: #58a6ff;
  --callout-bg: #1f6feb22;
}
body { background: var(--bg); color: var(--text-primary); }
`,
  sepia: `
:root {
  --bg: #f4ecd8;
  --text-primary: #5b4636;
  --text-secondary: #8a7a66;
  --border-color: #d4c5a9;
  --border-strong: #b8a584;
  --code-bg: #ebe0c5;
  --link-color: #8b4513;
  --tag-bg: #e8d5b0;
  --tag-text: #8b4513;
  --callout-border: #8b4513;
  --callout-bg: #ead9b8;
}
body { background: var(--bg); color: var(--text-primary); }
`,
  obsidian: `
:root {
  --bg: #1e1e2e;
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
  --border-color: #45475a;
  --border-strong: #585b70;
  --code-bg: #181825;
  --link-color: #89b4fa;
  --tag-bg: #313244;
  --tag-text: #f9e2af;
  --callout-border: #f9e2af;
  --callout-bg: #313244;
}
body { background: var(--bg); color: var(--text-primary); }
.callout-note { --callout-border: #89b4fa; --callout-bg: #1e1e2e; }
.callout-warning { --callout-border: #fab387; --callout-bg: #241a1e; }
.callout-tip { --callout-border: #a6e3a1; --callout-bg: #1e2e1e; }
.callout-danger { --callout-border: #f38ba8; --callout-bg: #2e1e1e; }
`,
};

const CODE_THEME_CSS: Record<string, string> = {
  github: `
.article-body pre { background: #f6f8fa; color: #1f2328; }
.article-body code { color: #1f2328; }
`,
  dracula: `
.article-body pre { background: #282a36; color: #f8f8f2; }
.article-body pre code { color: #f8f8f2; }
.article-body code { color: #ff79c6; }
`,
  monokai: `
.article-body pre { background: #272822; color: #f8f8f2; }
.article-body pre code { color: #f8f8f2; }
.article-body code { color: #66d9ef; }
`,
};

const INTERACTIVE_JS = `
document.addEventListener('DOMContentLoaded', function() {
  // 锚点平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target) { e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });
  // sidebar TOC 高亮当前章节
  var headings = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3');
  if (headings.length && 'IntersectionObserver' in window) {
    var links = document.querySelectorAll('.sidebar .toc a');
    var map = {};
    links.forEach(function(l){ map[l.getAttribute('href').slice(1)] = l; });
    new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) {
          links.forEach(function(l){ l.style.fontWeight=''; });
          var active = map[en.target.id];
          if (active) active.style.fontWeight = '700';
        }
      });
    }, {rootMargin:'0px 0px -70% 0px'}).observe;
  }
});
`;

// ============================================================
// 十一、预设持久化（localStorage）
// ============================================================

const STORAGE_KEY = 'md-to-web:presets';

export function loadPresets(): { name: string; rule: MdToWebRule }[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    return parsed;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  }
}

export function savePresets(presets: { name: string; rule: MdToWebRule }[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function downloadFile(filename: string, content: string, mime = 'text/html'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
