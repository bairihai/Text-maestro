/**
 * 站点级 Markdown → Wiki 转换器
 *
 * 核心能力：把多个 md 文件批量转成一组 wiki 形式静态网页，
 * 文件间 [[wikilink]] 正确解析为跨页链接，并生成站点级 index 与导航。
 *
 * 遍历流程（两阶段）：
 *   阶段1 预扫描：遍历所有文件 → 解析 frontmatter/meta → 建 linkMap
 *   阶段2 转换：  遍历所有文件 → convert(传 linkMap) → 收集结果 + brokenLinks
 *   阶段3 index： 遍历 pageMetas → 生成 index.html
 *   阶段4 导航：  遍历 outputs → 为每个页面注入面包屑 + 侧边栏
 *   阶段5 assets：生成 style.css + script.js
 */
import {
  convert,
  parseFrontmatter,
  extractMeta,
  resolveRule,
  buildMultiFileAssets,
  type MdToWebRule,
  type ContentMeta,
} from './md-to-web';

// ============================================================
// 一、类型定义
// ============================================================

export interface SiteFile {
  name: string; // 文件名，如 "笔记A.md"
  content: string; // 文件内容
}

export interface SiteConvertOptions {
  files: SiteFile[];
  rule: MdToWebRule;
  onProgress?: (current: number, total: number, fileName: string) => void;
}

export interface SiteOutput {
  path: string; // 相对路径，如 "index.html" / "assets/style.css"
  content: string;
}

export interface SiteConvertResult {
  outputs: SiteOutput[];
  linkMap: Map<string, string>; // wikiName → outputFile
  brokenLinks: { from: string; target: string }[];
  pageMetas: ContentMeta[];
}

// ============================================================
// 二、辅助函数
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 解析文件名模板（与 md-to-web.tsx 中的 resolveFilename 逻辑一致） */
function resolveOutputFilename(template: string, meta: ContentMeta, filename: string): string {
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
}

/** 从文件名提取 wikiName（去掉 .md 扩展名） */
function getWikiName(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}

// ============================================================
// 三、站点 index.html 生成
// ============================================================

function buildSiteIndex(
  pageMetas: { meta: ContentMeta; outputFile: string; sourceFile: string }[],
  rule: MdToWebRule,
): string {
  const items = pageMetas
    .map(({ meta, outputFile }) => {
      const title = escapeHtml(meta.title || outputFile);
      const link = escapeHtml(outputFile);
      const tags = meta.tags
        .map((t) => `<span class="tag-badge">#${escapeHtml(t)}</span>`)
        .join(' ');
      // 首段摘要：取 body 第一个非标题非空行的前 120 字
      const firstLine = meta.body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && !l.startsWith('---'))
        .slice(0, 2)
        .join(' ');
      const summary = escapeHtml(firstLine.slice(0, 120) + (firstLine.length > 120 ? '...' : ''));
      return `<li class="page-item">
  <a class="page-link" href="${link}">${title}</a>
  <p class="page-summary">${summary}</p>
  <div class="page-tags">${tags}</div>
</li>`;
    })
    .join('\n');

  // 标签云：统计所有标签出现次数
  const tagCount = new Map<string, number>();
  for (const { meta } of pageMetas) {
    for (const t of meta.tags) {
      tagCount.set(t, (tagCount.get(t) || 0) + 1);
    }
  }
  const tagCloud = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `<a class="tag-cloud-item" href="#tag-${escapeHtml(tag)}">#${escapeHtml(tag)}<sup>${count}</sup></a>`)
    .join(' ');

  const title = '站点首页';
  const lang = rule.output.htmlLang || 'zh-CN';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="site-index">
<div class="site-index-container">
<h1 class="site-title">${title}</h1>
<p class="site-subtitle">共 ${pageMetas.length} 个页面</p>
${tagCloud ? `<section class="tag-cloud"><h2>标签</h2><div class="tag-cloud-list">${tagCloud}</div></section>` : ''}
<section class="page-list">
<h2>页面列表</h2>
<ul class="page-items">
${items}
</ul>
</section>
<footer class="doc-footer">由 Text-maestro 工作流生成 · ${new Date().toISOString().slice(0, 10)}</footer>
</div>
<script src="assets/script.js"></script>
</body>
</html>`;
}

// ============================================================
// 四、站点导航注入（面包屑 + 侧边栏）
// ============================================================

function wrapSiteNav(
  html: string,
  currentFile: string,
  pageMetas: { meta: ContentMeta; outputFile: string; sourceFile: string }[],
): string {
  // 找到当前页面的标题
  const currentMeta = pageMetas.find((p) => p.outputFile === currentFile);
  const currentTitle = currentMeta?.meta.title || currentFile;

  // 构建侧边栏页面列表
  const sidebarItems = pageMetas
    .map(({ meta, outputFile }) => {
      const isActive = outputFile === currentFile;
      const cls = isActive ? 'site-nav-item active' : 'site-nav-item';
      return `<li class="${cls}"><a href="${escapeHtml(outputFile)}">${escapeHtml(meta.title || outputFile)}</a></li>`;
    })
    .join('\n');

  const siteNavHtml = `
<nav class="site-sidebar">
  <div class="site-sidebar-header">
    <a href="index.html" class="site-home-link">首页</a>
  </div>
  <ul class="site-nav-list">
${sidebarItems}
  </ul>
</nav>
<div class="site-breadcrumb">
  <a href="index.html">首页</a>
  <span class="separator">›</span>
  <span class="current">${escapeHtml(currentTitle)}</span>
</div>
`;

  // 在 <body> 后注入站点导航，原内容用 site-content-wrapper 包裹
  return html.replace(
    /(<body[^>]*>)([\s\S]*?)(<\/body>)/,
    (_, bodyOpen: string, bodyContent: string, bodyClose: string) => {
      return `${bodyOpen}\n<div class="site-layout">\n${siteNavHtml}\n<div class="site-content-wrapper">\n${bodyContent}\n</div>\n</div>\n${bodyClose}`;
    },
  );
}

// ============================================================
// 五、站点级 CSS/JS（在原有基础上追加站点布局样式）
// ============================================================

const SITE_CSS = `
/* === 站点级布局 === */
.site-layout { display: flex; min-height: 100vh; }
.site-sidebar {
  position: sticky; top: 0; width: 240px; max-height: 100vh; overflow-y: auto;
  padding: 16px 12px; border-right: 1px solid var(--border-color);
  background: var(--code-bg); flex-shrink: 0;
}
.site-sidebar-header { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
.site-home-link { color: var(--link-color); text-decoration: none; font-weight: 600; }
.site-nav-list { list-style: none; padding: 0; margin: 0; }
.site-nav-item { margin: 2px 0; }
.site-nav-item a { display: block; padding: 4px 8px; color: var(--text-secondary); text-decoration: none; border-radius: 3px; font-size: 13px; }
.site-nav-item a:hover { background: var(--bg); color: var(--text-primary); }
.site-nav-item.active a { background: var(--link-color); color: #fff; }
.site-content-wrapper { flex: 1; min-width: 0; }
.site-breadcrumb {
  padding: 8px 24px; background: var(--code-bg); border-bottom: 1px solid var(--border-color);
  font-size: 13px; color: var(--text-secondary);
}
.site-breadcrumb a { color: var(--link-color); text-decoration: none; }
.site-breadcrumb .separator { margin: 0 6px; opacity: 0.6; }
.site-breadcrumb .current { color: var(--text-primary); }

/* === 站点首页 === */
body.site-index { background: var(--bg); }
.site-index-container { max-width: 820px; margin: 0 auto; padding: 40px 24px; }
.site-title { font-size: 2em; margin: 0 0 8px; }
.site-subtitle { color: var(--text-secondary); margin: 0 0 32px; }
.tag-cloud { margin: 24px 0; padding: 16px; background: var(--code-bg); border-radius: 6px; }
.tag-cloud h2 { font-size: 14px; margin: 0 0 12px; color: var(--text-secondary); }
.tag-cloud-list { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-cloud-item { color: var(--link-color); text-decoration: none; font-size: 13px; }
.tag-cloud-item sup { font-size: 10px; opacity: 0.7; }
.page-list { margin: 32px 0; }
.page-list h2 { font-size: 18px; margin: 0 0 16px; }
.page-items { list-style: none; padding: 0; margin: 0; }
.page-item { padding: 12px 16px; margin: 8px 0; border: 1px solid var(--border-color); border-radius: 6px; transition: border-color 0.2s; }
.page-item:hover { border-color: var(--link-color); }
.page-link { font-size: 16px; font-weight: 600; color: var(--text-primary); text-decoration: none; }
.page-link:hover { color: var(--link-color); }
.page-summary { color: var(--text-secondary); font-size: 13px; margin: 4px 0 8px; }
.page-tags { font-size: 12px; }

/* broken link 标记 */
.wikilink.broken { color: #e5484d; border-bottom: 1px dashed #e5484d; cursor: help; }
`;

const SITE_JS = `
document.addEventListener('DOMContentLoaded', function() {
  // 侧边栏当前页滚动到可视区
  var active = document.querySelector('.site-nav-item.active');
  if (active && active.scrollIntoView) {
    active.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
});
`;

// ============================================================
// 六、主入口：convertSite
// ============================================================

export async function convertSite(options: SiteConvertOptions): Promise<SiteConvertResult> {
  const { files, rule } = options;
  const total = files.length;

  // 强制使用 multi-file 模式（外部 CSS/JS 引用）
  const siteRule: MdToWebRule = {
    ...rule,
    output: { ...rule.output, mode: 'multi-file' as const },
  };

  const linkMap = new Map<string, string>();
  const pageMetaList: { meta: ContentMeta; outputFile: string; sourceFile: string }[] = [];
  const brokenLinks: { from: string; target: string }[] = [];
  const outputs: SiteOutput[] = [];

  // === 阶段1：预扫描遍历 — 建立 linkMap ===
  for (const file of files) {
    const { frontmatter, body } = parseFrontmatter(file.content);
    const metaBase = extractMeta(body, file.name);
    const meta: ContentMeta = { frontmatter, ...metaBase };
    const resolvedRule = resolveRule(siteRule, meta);
    const outputFile = resolveOutputFilename(resolvedRule.output.filenameTemplate, meta, file.name);
    const wikiName = getWikiName(file.name);
    linkMap.set(wikiName, outputFile);
    pageMetaList.push({ meta, outputFile, sourceFile: file.name });
  }

  // === 阶段2：转换遍历 — 逐文件 convert ===
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    options.onProgress?.(i + 1, total, file.name);
    const result = convert(file.content, siteRule, {
      filename: file.name,
      wikiLinkMap: linkMap,
    });
    brokenLinks.push(...result.brokenLinks);
    const wikiName = getWikiName(file.name);
    const outputFile = linkMap.get(wikiName) || `${file.name}.html`;
    outputs.push({ path: outputFile, content: result.html });
  }

  // === 阶段3：生成 index.html ===
  const indexHtml = buildSiteIndex(pageMetaList, siteRule);
  outputs.push({ path: 'index.html', content: indexHtml });

  // === 阶段4：站点导航包装（遍历 outputs 加面包屑+侧边栏） ===
  for (const output of outputs) {
    if (output.path.endsWith('.html') && output.path !== 'index.html') {
      output.content = wrapSiteNav(output.content, output.path, pageMetaList);
    }
  }

  // === 阶段5：生成 assets ===
  const assets = buildMultiFileAssets(siteRule);
  outputs.push({ path: 'assets/style.css', content: `${assets.css}\n\n/* === 站点级样式 === */\n${SITE_CSS}` });
  outputs.push({ path: 'assets/script.js', content: `${assets.js}\n\n/* === 站点级脚本 === */\n${SITE_JS}` });

  return {
    outputs,
    linkMap,
    brokenLinks,
    pageMetas: pageMetaList.map((p) => p.meta),
  };
}
