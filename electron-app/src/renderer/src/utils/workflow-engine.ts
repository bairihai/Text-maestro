/**
 * 工作流执行引擎
 *
 * 核心设计：
 *   - 线性步骤序列：nodes 数组按顺序执行
 *   - 集合传递：context.files 始终是 { name, content }[] 数组，节点间天然传递文件集合
 *   - 节点内隐式遍历：高级节点（如 md-to-wiki-site）内部遍历所有文件
 *   - 子进度回调：onProgress 支持节点级 + 子进度（如 "3/10"）反馈
 *
 * 三种节点类型：
 *   1. source-files    读文件 → context.files
 *   2. md-to-wiki-site  context.files(md) → context.files(html+assets)
 *   3. write-directory  context.files → 写盘
 */
import { DEFAULT_PRESETS, type MdToWebRule } from './md-to-web';
import { convertSite, type SiteFile } from './md-to-wiki-site';

// ============================================================
// 一、数据模型
// ============================================================

export type WorkflowNodeType = 'source-files' | 'md-to-wiki-site' | 'write-directory';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

export interface ContextFile {
  name: string;
  content: string;
}

export interface WorkflowLog {
  nodeId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface WorkflowContext {
  files: ContextFile[];
  variables: Record<string, unknown>;
  logs: WorkflowLog[];
}

export type NodeStatus = 'idle' | 'running' | 'done' | 'error';

export interface NodeProgress {
  nodeId: string;
  status: NodeStatus;
  detail?: string; // 如 "正在转换 3/10: 赤心巡天第3章.md"
}

// ============================================================
// 二、节点配置类型
// ============================================================

export interface SourceFilesConfig {
  inputMode: 'folder' | 'paths';
  folder?: string;
  paths?: string[];
  exts: string[]; // 默认 ['.md']
}

export interface MdToWikiSiteConfig {
  presetName: string; // DEFAULT_PRESETS 中的 name
}

export interface WriteDirectoryConfig {
  targetDir?: string;
}

// ============================================================
// 三、执行引擎
// ============================================================

/** 执行整个工作流 */
export async function executeWorkflow(
  workflow: Workflow,
  onProgress?: (progress: NodeProgress) => void,
): Promise<{ success: boolean; context: WorkflowContext }> {
  let ctx: WorkflowContext = { files: [], variables: {}, logs: [] };

  for (const node of workflow.nodes) {
    if (!node.enabled) continue;
    onProgress?.({ nodeId: node.id, status: 'running' });
    try {
      ctx = await executeNode(node, ctx, (detail) =>
        onProgress?.({ nodeId: node.id, status: 'running', detail }),
      );
      onProgress?.({ nodeId: node.id, status: 'done' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.logs.push({
        nodeId: node.id,
        level: 'error',
        message: msg,
        timestamp: new Date().toISOString(),
      });
      onProgress?.({ nodeId: node.id, status: 'error', detail: msg });
      return { success: false, context: ctx };
    }
  }
  return { success: true, context: ctx };
}

/** 调度单个节点执行 */
async function executeNode(
  node: WorkflowNode,
  ctx: WorkflowContext,
  onSubProgress?: (detail: string) => void,
): Promise<WorkflowContext> {
  switch (node.type) {
    case 'source-files':
      return await executeSourceFiles(node, ctx);
    case 'md-to-wiki-site':
      return await executeMdToWikiSite(node, ctx, onSubProgress);
    case 'write-directory':
      return await executeWriteDirectory(node, ctx);
    default:
      throw new Error(`未知节点类型: ${node.type}`);
  }
}

// ============================================================
// 四、节点执行器
// ============================================================

/** source-files 节点：读取文件填入 context.files */
async function executeSourceFiles(
  node: WorkflowNode,
  ctx: WorkflowContext,
): Promise<WorkflowContext> {
  const config = node.config as unknown as SourceFilesConfig;
  let filePaths: string[] = [];

  if (config.inputMode === 'folder' && config.folder) {
    // 递归扫描目录
    const exts = config.exts?.length ? config.exts : ['.md'];
    const result = await window.electron.listFilesByExt(config.folder, exts);
    if (!result.success) {
      throw new Error(`扫描目录失败: ${result.error || '未知错误'}`);
    }
    filePaths = result.files;
  } else if (config.inputMode === 'paths' && config.paths?.length) {
    filePaths = config.paths;
  } else {
    throw new Error('source-files 节点未配置文件夹或文件路径');
  }

  if (filePaths.length === 0) {
    ctx.logs.push({
      nodeId: node.id,
      level: 'warn',
      message: '未找到任何匹配文件',
      timestamp: new Date().toISOString(),
    });
    return { ...ctx, files: [] };
  }

  // 批量读取文件
  const results = await window.electron.readMultipleFiles(filePaths);
  const files: ContextFile[] = [];
  for (const r of results) {
    if (r.success && r.data !== undefined) {
      // name 只保留文件名（去掉目录路径）
      const name = r.path.replace(/[/\\]/g, '/').split('/').pop() || r.path;
      files.push({ name, content: r.data });
    } else {
      ctx.logs.push({
        nodeId: node.id,
        level: 'warn',
        message: `读取失败: ${r.path} - ${r.error || ''}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  ctx.logs.push({
    nodeId: node.id,
    level: 'info',
    message: `读取了 ${files.length}/${filePaths.length} 个文件`,
    timestamp: new Date().toISOString(),
  });

  return { ...ctx, files };
}

/** md-to-wiki-site 节点：批量转换 md → wiki 站点 */
async function executeMdToWikiSite(
  node: WorkflowNode,
  ctx: WorkflowContext,
  onSubProgress?: (detail: string) => void,
): Promise<WorkflowContext> {
  const config = node.config as unknown as MdToWikiSiteConfig;

  if (ctx.files.length === 0) {
    throw new Error('md-to-wiki-site 节点没有输入文件（请先添加 source-files 节点）');
  }

  // 查找规则预设
  const preset = DEFAULT_PRESETS.find((p) => p.name === config.presetName);
  if (!preset) {
    throw new Error(`未找到规则预设: ${config.presetName}`);
  }
  const rule: MdToWebRule = preset.rule;

  // 转换为 SiteFile 格式
  const siteFiles: SiteFile[] = ctx.files.map((f) => ({
    name: f.name,
    content: f.content,
  }));

  // 执行站点级转换（内部遍历，带子进度回调）
  const result = await convertSite({
    files: siteFiles,
    rule,
    onProgress: (current, total, fileName) => {
      onSubProgress?.(`正在转换 ${current}/${total}: ${fileName}`);
    },
  });

  // 记录 broken links
  if (result.brokenLinks.length > 0) {
    ctx.logs.push({
      nodeId: node.id,
      level: 'warn',
      message: `发现 ${result.brokenLinks.length} 个 broken links（目标文件不存在）`,
      timestamp: new Date().toISOString(),
    });
    for (const bl of result.brokenLinks.slice(0, 10)) {
      ctx.logs.push({
        nodeId: node.id,
        level: 'warn',
        message: `  broken: [${bl.from}] → [[${bl.target}]]`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  ctx.logs.push({
    nodeId: node.id,
    level: 'info',
    message: `转换完成：${result.outputs.length} 个输出文件，${result.pageMetas.length} 个页面`,
    timestamp: new Date().toISOString(),
  });

  // 输出替换 context.files（md → html + assets）
  const outputFiles: ContextFile[] = result.outputs.map((o) => ({
    name: o.path,
    content: o.content,
  }));

  return { ...ctx, files: outputFiles };
}

/** write-directory 节点：把 context.files 写盘 */
async function executeWriteDirectory(
  node: WorkflowNode,
  ctx: WorkflowContext,
): Promise<WorkflowContext> {
  const config = node.config as unknown as WriteDirectoryConfig;

  if (!config.targetDir) {
    throw new Error('write-directory 节点未配置输出目录');
  }

  if (ctx.files.length === 0) {
    throw new Error('write-directory 节点没有文件可写（context.files 为空）');
  }

  const filesToWrite = ctx.files.map((f) => ({ path: f.name, content: f.content }));
  const result = await window.electron.writeDirectory(config.targetDir, filesToWrite);

  if (!result.success) {
    throw new Error(`写盘失败: ${result.error || '未知错误'}`);
  }

  ctx.logs.push({
    nodeId: node.id,
    level: 'info',
    message: `已写入 ${result.count} 个文件到 ${config.targetDir}`,
    timestamp: new Date().toISOString(),
  });

  return ctx;
}

// ============================================================
// 五、工作流持久化（localStorage）
// ============================================================

const WORKFLOWS_KEY = 'playground:workflows';
const RUNS_KEY = 'playground:workflow-runs';

export function loadWorkflows(): Workflow[] {
  try {
    const raw = localStorage.getItem(WORKFLOWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWorkflows(workflows: Workflow[]): void {
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
}

export interface RunRecord {
  id: string;
  workflowName: string;
  startedAt: string;
  success: boolean;
  fileCount: number;
  outputDir?: string;
  logs: WorkflowLog[];
}

export function loadRunHistory(): RunRecord[] {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-20) : []; // 只保留最近20条
  } catch {
    return [];
  }
}

export function saveRunRecord(record: RunRecord): void {
  const history = loadRunHistory();
  history.push(record);
  localStorage.setItem(RUNS_KEY, JSON.stringify(history.slice(-20)));
}

// ============================================================
// 六、工厂函数
// ============================================================

let nodeIdCounter = 0;
export function generateNodeId(): string {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

export function createWorkflow(name = '新工作流'): Workflow {
  const now = new Date().toISOString();
  return {
    id: `wf-${Date.now()}`,
    name,
    nodes: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createNode(type: WorkflowNodeType): WorkflowNode {
  const labels: Record<WorkflowNodeType, string> = {
    'source-files': '读取文件',
    'md-to-wiki-site': 'MD → Wiki 站点',
    'write-directory': '写入目录',
  };
  const defaultConfigs: Record<WorkflowNodeType, Record<string, unknown>> = {
    'source-files': { inputMode: 'folder', exts: ['.md'] },
    'md-to-wiki-site': { presetName: DEFAULT_PRESETS[0]?.name || 'Obsidian→Wiki' },
    'write-directory': {},
  };
  return {
    id: generateNodeId(),
    type,
    label: labels[type],
    enabled: true,
    config: defaultConfigs[type],
  };
}

/**
 * 创建示例工作流：赤心巡天 md → wiki 站点
 *
 * 预填好三个节点：
 *   1. 读取文件：扫描 test_data/example/赤心巡天2 3章 目录下的 .md 文件
 *   2. MD → Wiki 站点：使用 Obsidian→Wiki 预设
 *   3. 写入目录：输出到 test_data/output/赤心巡天站点（用户可改）
 *
 * 用户点「运行」即可看到效果：生成 index.html + 各章 html + 侧边栏站点导航
 */
export function createExampleWorkflow(): Workflow {
  const now = new Date().toISOString();
  // 示例数据目录（相对于项目根目录）
  const exampleDir = 'E:\\100 项目\\130 编程开发\\132 其他中期或长期项目\\Text-maestro（文本分析工具箱）\\test_data\\example\\赤心巡天2 3章';
  const outputDir = 'E:\\100 项目\\130 编程开发\\132 其他中期或长期项目\\Text-maestro（文本分析工具箱）\\test_data\\output\\赤心巡天站点';

  const sourceNode: WorkflowNode = {
    id: generateNodeId(),
    type: 'source-files',
    label: '读取赤心巡天章节',
    enabled: true,
    config: {
      inputMode: 'folder',
      folder: exampleDir,
      exts: ['.md'],
    },
  };

  const convertNode: WorkflowNode = {
    id: generateNodeId(),
    type: 'md-to-wiki-site',
    label: '转换为 Wiki 站点',
    enabled: true,
    config: {
      presetName: 'Obsidian→Wiki',
    },
  };

  const writeNode: WorkflowNode = {
    id: generateNodeId(),
    type: 'write-directory',
    label: '写入站点目录',
    enabled: true,
    config: {
      targetDir: outputDir,
    },
  };

  return {
    id: `wf-${Date.now()}`,
    name: '赤心巡天 → Wiki 站点（示例）',
    nodes: [sourceNode, convertNode, writeNode],
    createdAt: now,
    updatedAt: now,
  };
}
