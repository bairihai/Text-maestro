/**
 * Workflow YAML 读写
 *
 * 把 Workflow 对象与 YAML 字符串互转，用于导入/导出 .workflow.yaml 文件。
 *
 * YAML 结构（人类可写、可读、支持注释，GitHub Actions 风格）：
 *
 *   name: 赤心巡天 → Wiki 站点
 *   steps:
 *     - id: scan              # 可选，仅用于分叉引用
 *       type: source-files
 *       label: 读取赤心巡天章节
 *       config:
 *         inputMode: folder
 *         folder: ./docs
 *         exts: [.md]
 *
 *     - type: md-to-wiki-site  # 默认引用上一步产出，无需声明 input
 *       label: 转换为 Wiki 站点
 *       config:
 *         presetName: Obsidian→Wiki
 *
 *     - type: write-directory
 *       label: 写入站点目录
 *       config:
 *         targetDir: ./out
 *
 *   # 分叉场景示例（实际未启用，仅说明语法）：
 *   # - id: backup
 *   #   type: write-directory
 *   #   uses: scan              # 显式引用 scan 节点的产出，而非上一步
 *   #   config:
 *   #     targetDir: ./out/raw
 */
import yaml from 'js-yaml';
import {
  type Workflow,
  type WorkflowNode,
  type WorkflowNodeType,
  generateNodeId,
} from './workflow-engine';

// ============================================================
// 内部 YAML 数据结构（与外部 Workflow 接口的差异）
// ============================================================

interface YamlStep {
  id?: string;                  // 可选，仅用于被 uses 引用
  type: WorkflowNodeType;
  label?: string;
  enabled?: boolean;            // 默认 true
  uses?: string;                // 可选，分叉场景显式引用上游节点 id
  config?: Record<string, unknown>;
}

interface YamlWorkflow {
  name: string;
  steps: YamlStep[];
}

// ============================================================
// Workflow → YAML 字符串
// ============================================================

/**
 * 把 Workflow 序列化为 YAML 字符串。
 * - 丢弃运行时元信息（id/createdAt/updatedAt），只保留用户可编辑内容
 * - 节点 id 仅在声明了 uses（被引用）时保留，否则丢弃以提升可读性
 */
export function workflowToYaml(workflow: Workflow): string {
  // 收集被 uses 引用的 id，这些 id 必须保留
  const referencedIds = new Set<string>();
  for (const node of workflow.nodes) {
    if (node.uses) referencedIds.add(node.uses);
  }

  const steps: YamlStep[] = workflow.nodes.map((node) => {
    const step: YamlStep = {
      type: node.type,
      config: node.config,
    };
    if (node.label && node.label.trim()) step.label = node.label;
    if (node.enabled === false) step.enabled = false;
    if (node.uses) step.uses = node.uses;
    // 仅在节点被 uses 引用时才输出 id（其他情况下 id 是内部细节，无需暴露给用户）
    if (node.uses && referencedIds.has(node.id)) {
      step.id = node.id;
    } else if (referencedIds.has(node.id)) {
      step.id = node.id;
    }
    return step;
  });

  const yamlWorkflow: YamlWorkflow = {
    name: workflow.name,
    steps,
  };

  // lineWidth: -1 表示不换行（长字符串如文件夹路径不被截断）
  return yaml.dump(yamlWorkflow, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

// ============================================================
// YAML 字符串 → Workflow
// ============================================================

/**
 * 把 YAML 字符串解析为 Workflow 对象。
 * - 自动为每个 step 生成 id（若 YAML 未声明）
 * - 校验 type 必须是受支持的节点类型
 * - 校验 uses 引用的 id 必须存在
 *
 * @throws 若 YAML 格式错误、type 不受支持、uses 引用不存在
 */
export function workflowFromYaml(yamlStr: string): Workflow {
  const parsed = yaml.load(yamlStr);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('YAML 内容为空或不是对象');
  }

  const yamlWf = parsed as YamlWorkflow;
  if (!Array.isArray(yamlWf.steps)) {
    throw new Error('YAML 缺少 steps 数组');
  }

  const supportedTypes: WorkflowNodeType[] = ['source-files', 'md-to-wiki-site', 'write-directory'];
  const declaredIds = new Set<string>();
  const nodes: WorkflowNode[] = [];

  // 第一遍：解析所有 step，收集已声明的 id
  for (const [index, step] of yamlWf.steps.entries()) {
    if (!step.type || !supportedTypes.includes(step.type)) {
      throw new Error(`步骤 ${index + 1}: type 必须是 ${supportedTypes.join(' / ')} 之一，实际为 "${step.type}"`);
    }

    const id = step.id || generateNodeId();
    if (declaredIds.has(id)) {
      throw new Error(`步骤 ${index + 1}: id "${id}" 重复`);
    }
    declaredIds.add(id);

    nodes.push({
      id,
      type: step.type,
      label: step.label || defaultLabelForType(step.type),
      enabled: step.enabled !== false,
      config: step.config || {},
      uses: step.uses,
    });
  }

  // 第二遍：校验 uses 引用都存在
  for (const [index, node] of nodes.entries()) {
    if (node.uses && !declaredIds.has(node.uses)) {
      throw new Error(`步骤 ${index + 1}（${node.label}）: uses 引用的 id "${node.uses}" 不存在`);
    }
  }

  const now = new Date().toISOString();
  return {
    id: `wf-${Date.now()}`,
    name: yamlWf.name || '未命名工作流',
    nodes,
    createdAt: now,
    updatedAt: now,
  };
}

function defaultLabelForType(type: WorkflowNodeType): string {
  const labels: Record<WorkflowNodeType, string> = {
    'source-files': '读取文件',
    'md-to-wiki-site': 'MD → Wiki 站点',
    'write-directory': '写入目录',
  };
  return labels[type];
}

// ============================================================
// 示例 YAML（用于"导出示例"或"新建空白模板"）
// ============================================================

export const EXAMPLE_YAML = `# Workflow 示例：赤心巡天 md → wiki 站点
# - 隐式传递：节点产出自动传给下一步，无需声明变量名
# - 分叉场景：用 id 命名 + uses 引用某个上游节点产出

name: 赤心巡天 → Wiki 站点（示例）

steps:
  - type: source-files
    label: 读取赤心巡天章节
    config:
      inputMode: folder
      folder: ./test_data/example/赤心巡天2 3章
      exts: ['.md']

  - type: md-to-wiki-site
    label: 转换为 Wiki 站点
    config:
      presetName: Obsidian→Wiki

  - type: write-directory
    label: 写入站点目录
    config:
      targetDir: ./test_data/output/赤心巡天站点
`;

/** 创建一个空白模板 Workflow（带基本结构） */
export function createBlankWorkflowFromYaml(): Workflow {
  return workflowFromYaml(EXAMPLE_YAML);
}
