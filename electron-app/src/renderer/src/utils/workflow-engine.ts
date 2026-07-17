/**
 * 工作流执行引擎
 *
 * 核心设计（v3 隐式传递 + 可选显式引用）：
 *   - 线性步骤序列：steps 数组按顺序执行
 *   - 隐式传递：每个节点的产出自动进入「上一步输出」槽位，下游默认引用之
 *   - 可选显式引用：节点可声明 `uses` 引用某个早于自己的节点产出（用于分叉场景）
 *   - 变量统一为 string：节点内部决定如何序列化/解析（JSON / 纯文本 / 路径列表）
 *   - 子进度回调：onProgress 支持节点级 + 子进度 + variablesSnapshot 实时回传
 *
 * 三种节点类型：
 *   1. source-files     扫描+读盘 → 输出变量（JSON 文本：[{name,content}, ...]）
 *   2. md-to-wiki-site  输入变量(JSON) → 转换 → 输出变量(JSON 文本：[{path,content}, ...])
 *   3. write-directory  输入变量(JSON) → 写盘（终点节点，无输出）
 *
 * 变量命名约定：
 *   - 每个有产出的节点自动生成变量名 `${node.id}.output`，用户一般无需关心
 *   - UI 监控面板照常显示变量内容（名称、来源、格式、大小、内容预览）
 *   - 用户通过 `uses` 字段引用某个节点的产出，未声明时默认引用「上一个有产出的节点」
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
  /**
   * 显式引用某个早于自己的节点 id 的产出。
   * - 未声明（undefined）：默认引用「上一个有产出的节点」
   * - 声明为具体 id：引用该 id 节点的产出（用于分叉场景）
   */
  uses?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 单个变量的元信息（用于 UI 展示）。
 * value 统一为 string；节点内部决定如何序列化/解析。
 */
export interface WorkflowVariable {
  name: string;              // 自动生成的变量名，形如 `${nodeId}.output`
  value: string;             // 统一文本类型
  sourceNodeId: string;      // 来源节点 ID
  sourceNodeLabel: string;   // 来源节点名称（冗余，便于 UI 展示）
  updatedAt: string;         // 更新时间戳
  /** 格式提示：仅用于 UI 美化展示，不影响数据本身 */
  formatHint: 'text' | 'json' | 'path-list';
  /** 字节数（冗余，便于 UI 展示大小） */
  byteLength: number;
}

export interface WorkflowLog {
  nodeId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface WorkflowContext {
  /** 所有有产出的节点的变量，key = nodeId */
  variables: Record<string, WorkflowVariable>;
  /** 「上一步输出」槽位：最近一个有产出的节点的 id */
  lastOutputNodeId: string | null;
  logs: WorkflowLog[];
}

export type NodeStatus = 'idle' | 'running' | 'done' | 'error';

export interface NodeProgress {
  nodeId: string;
  status: NodeStatus;
  detail?: string;
  /** 当前 ctx.variables 的深拷贝快照，节点 done 后回传，前端据此实时更新变量面板 */
  variablesSnapshot?: Record<string, WorkflowVariable>;
}

// ============================================================
// 二、节点配置类型
// ============================================================

export interface SourceFilesConfig {
  inputMode: 'folder' | 'paths';
  folder?: string;
  paths?: string[];
  exts: string[];                       // 默认 ['.md']
}

export interface MdToWikiSiteConfig {
  presetName: string;                   // DEFAULT_PRESETS 中的 name
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
  let ctx: WorkflowContext = { variables: {}, lastOutputNodeId: null, logs: [] };

  for (const node of workflow.nodes) {
    if (!node.enabled) continue;
    onProgress?.({ nodeId: node.id, status: 'running' });
    try {
      ctx = await executeNode(node, ctx, (detail) =>
        onProgress?.({ nodeId: node.id, status: 'running', detail }),
      );
      onProgress?.({
        nodeId: node.id,
        status: 'done',
        variablesSnapshot: { ...ctx.variables },
      });
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
// 四、变量读写工具
// ============================================================

/** 内部文件结构（序列化前/反序列化后的中间形态） */
interface InternalFile {
  name: string;
  content: string;
}

/** 把变量写入 ctx.variables，并更新 lastOutputNodeId，返回新 ctx（不可变更新） */
function writeVariable(
  ctx: WorkflowContext,
  sourceNode: WorkflowNode,
  value: string,
  formatHint: WorkflowVariable['formatHint'],
): WorkflowContext {
  const variable: WorkflowVariable = {
    name: `${sourceNode.id}.output`,
    value,
    sourceNodeId: sourceNode.id,
    sourceNodeLabel: sourceNode.label,
    updatedAt: new Date().toISOString(),
    formatHint,
    byteLength: value.length,
  };
  return {
    ...ctx,
    variables: { ...ctx.variables, [sourceNode.id]: variable },
    lastOutputNodeId: sourceNode.id,
  };
}

/**
 * 解析节点的输入引用，返回输入变量的 value。
 * - 若 node.uses 声明：引用 uses 指向的节点产出
 * - 否则：引用 ctx.lastOutputNodeId 指向的节点产出
 * 不存在则抛错。
 */
function readInputVariable(
  node: WorkflowNode,
  ctx: WorkflowContext,
): string {
  const refId = node.uses || ctx.lastOutputNodeId;
  if (!refId) {
    throw new Error(`${node.label}：没有可引用的上游产出（请先添加 source-files 节点）`);
  }
  const variable = ctx.variables[refId];
  if (!variable) {
    const refLabel = node.uses
      ? `节点 id=${node.uses}`
      : '上一步节点';
    throw new Error(`${node.label}：引用的 ${refLabel} 没有产出（可能尚未执行或节点类型无产出）`);
  }
  return variable.value;
}

// ============================================================
// 五、节点执行器
// ============================================================

/** source-files 节点：扫描+读盘，输出 JSON 文本变量 */
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
    // 仍写入空数组变量，便于下游诊断
    return writeVariable(ctx, node, '[]', 'json');
  }

  // 批量读取文件
  const results = await window.electron.readMultipleFiles(filePaths);
  const files: InternalFile[] = [];
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

  // 序列化为 JSON 文本
  const value = JSON.stringify(files);
  return writeVariable(ctx, node, value, 'json');
}

/** md-to-wiki-site 节点：输入变量(JSON) → 转换 → 输出变量(JSON) */
async function executeMdToWikiSite(
  node: WorkflowNode,
  ctx: WorkflowContext,
  onSubProgress?: (detail: string) => void,
): Promise<WorkflowContext> {
  const config = node.config as unknown as MdToWikiSiteConfig;

  const inputValue = readInputVariable(node, ctx);

  // 反序列化输入
  let siteFiles: SiteFile[];
  try {
    const parsed = JSON.parse(inputValue);
    if (!Array.isArray(parsed)) {
      throw new Error('输入变量不是数组');
    }
    siteFiles = parsed.map((f: { name?: string; content?: string }) => ({
      name: String(f.name ?? ''),
      content: String(f.content ?? ''),
    }));
  } catch (e) {
    throw new Error(`${node.label}：输入变量解析失败 - ${e instanceof Error ? e.message : String(e)}`);
  }

  if (siteFiles.length === 0) {
    throw new Error(`${node.label}：输入为空数组`);
  }

  // 查找规则预设
  const preset = DEFAULT_PRESETS.find((p) => p.name === config.presetName);
  if (!preset) {
    throw new Error(`未找到规则预设: ${config.presetName}`);
  }
  const rule: MdToWebRule = preset.rule;

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

  // 序列化输出为 JSON 文本
  const outputFiles: { path: string; content: string }[] = result.outputs.map((o) => ({
    path: o.path,
    content: o.content,
  }));
  const outputValue = JSON.stringify(outputFiles);
  return writeVariable(ctx, node, outputValue, 'json');
}

/** write-directory 节点：输入变量(JSON) → 写盘（终点节点，无产出） */
async function executeWriteDirectory(
  node: WorkflowNode,
  ctx: WorkflowContext,
): Promise<WorkflowContext> {
  const config = node.config as unknown as WriteDirectoryConfig;

  if (!config.targetDir) {
    throw new Error('write-directory 节点未配置输出目录');
  }

  const inputValue = readInputVariable(node, ctx);

  // 反序列化输入
  let filesToWrite: { path: string; content: string }[];
  try {
    const parsed = JSON.parse(inputValue);
    if (!Array.isArray(parsed)) {
      throw new Error('输入变量不是数组');
    }
    filesToWrite = parsed.map((f: { path?: string; content?: string; name?: string }) => ({
      // 兼容：若上游输出的是 {name} 而非 {path}，自动适配
      path: String(f.path ?? f.name ?? ''),
      content: String(f.content ?? ''),
    }));
  } catch (e) {
    throw new Error(`${node.label}：输入变量解析失败 - ${e instanceof Error ? e.message : String(e)}`);
  }

  if (filesToWrite.length === 0) {
    throw new Error(`${node.label}：输入为空数组，无文件可写`);
  }

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

  // 终点节点：不写入变量，lastOutputNodeId 保持不变
  return ctx;
}

// ============================================================
// 六、工作流持久化（localStorage）
// ============================================================

const WORKFLOWS_KEY = 'playground:workflows';
const RUNS_KEY = 'playground:workflow-runs';

export function loadWorkflows(): Workflow[] {
  try {
    const raw = localStorage.getItem(WORKFLOWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 自动迁移旧 Workflow（v2 显式命名 → v3 隐式传递）
    return parsed.map(migrateWorkflow);
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
  /** 最终变量快照（运行完成时保存，便于历史回看） */
  variablesSnapshot?: Record<string, WorkflowVariable>;
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
// 七、工厂函数与迁移
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
    'source-files': {
      inputMode: 'folder',
      exts: ['.md'],
    },
    'md-to-wiki-site': {
      presetName: DEFAULT_PRESETS[0]?.name || 'Obsidian→Wiki',
    },
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
 * 迁移旧 Workflow：
 * - v2（显式变量名）：移除 outputVariableName / inputVariableName，uses 留空走隐式传递
 * - v1（无变量系统）：无需处理
 */
export function migrateWorkflow(wf: Workflow): Workflow {
  const migratedNodes = wf.nodes.map((node) => {
    const config = { ...node.config };
    // 移除 v2 的变量名字段
    delete config.outputVariableName;
    delete config.inputVariableName;
    return { ...node, config, uses: node.uses };
  });
  return { ...wf, nodes: migratedNodes };
}

/**
 * 创建示例工作流：赤心巡天 md → wiki 站点
 *
 * 隐式传递版：三个节点默认串接，无需声明变量名
 *   1. 读取文件：扫描 → 自动产出
 *   2. MD → Wiki 站点：默认引用上一步 → 自动产出
 *   3. 写入目录：默认引用上一步 → 写盘
 */
export function createExampleWorkflow(): Workflow {
  const now = new Date().toISOString();
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
