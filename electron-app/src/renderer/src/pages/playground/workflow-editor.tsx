/**
 * 工作流编辑器
 *
 * 布局：
 *   - 左侧：节点类型面板（点击添加节点）
 *   - 中间：步骤序列（Card 列表，HTML5 拖拽排序）
 *   - 右侧：选中节点的配置面板
 *   - 底部：运行/保存/加载 按钮 + 日志面板
 */
import React, { useState, useCallback, useRef } from 'react';
import { Card, Button, Select, Message, Input, Typography } from '@arco-design/web-react';
import { IconPlus, IconDelete, IconPlayArrow, IconSave, IconDragDotVertical, IconFolder } from '@arco-design/web-react/icon';
import {
  type Workflow,
  type WorkflowNode,
  type WorkflowNodeType,
  type NodeProgress,
  type WorkflowLog,
  type SourceFilesConfig,
  type MdToWikiSiteConfig,
  type WriteDirectoryConfig,
  createWorkflow,
  createNode,
  executeWorkflow,
  loadWorkflows,
  saveWorkflows,
  saveRunRecord,
  type RunRecord,
} from '@renderer/utils/workflow-engine';
import { DEFAULT_PRESETS } from '@renderer/utils/md-to-web';

const { Text } = Typography;

// 节点类型元信息
const NODE_TYPES: { type: WorkflowNodeType; label: string; desc: string; icon: string }[] = [
  { type: 'source-files', label: '读取文件', desc: '从文件夹/路径列表读取 md 文件', icon: '📂' },
  { type: 'md-to-wiki-site', label: 'MD → Wiki 站点', desc: '批量转换 + 跨文件链接 + 站点导航', icon: '🔄' },
  { type: 'write-directory', label: '写入目录', desc: '把结果文件写盘到指定目录', icon: '💾' },
];

const STATUS_COLORS: Record<string, string> = {
  idle: '#86909c',
  running: '#165dff',
  done: '#00b42a',
  error: '#f53f3f',
};

interface WorkflowEditorProps {
  initialWorkflow?: Workflow | null;
}

function WorkflowEditor({ initialWorkflow }: WorkflowEditorProps = {}) {
  const [workflow, setWorkflow] = useState<Workflow>(
    () => initialWorkflow || createWorkflow('md→wiki 工作流'),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeProgress, setNodeProgress] = useState<Record<string, NodeProgress>>({});
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [running, setRunning] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [lastOutputDir, setLastOutputDir] = useState<string | null>(null);
  const logPanelRef = useRef<HTMLDivElement>(null);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) || null;

  // === 节点操作 ===
  const addNode = useCallback((type: WorkflowNodeType) => {
    const node = createNode(type);
    setWorkflow((wf) => ({
      ...wf,
      nodes: [...wf.nodes, node],
      updatedAt: new Date().toISOString(),
    }));
    setSelectedNodeId(node.id);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setWorkflow((wf) => ({
      ...wf,
      nodes: wf.nodes.filter((n) => n.id !== nodeId),
      updatedAt: new Date().toISOString(),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const updateNodeConfig = useCallback((nodeId: string, configPatch: Record<string, unknown>) => {
    setWorkflow((wf) => ({
      ...wf,
      nodes: wf.nodes.map((n) =>
        n.id === nodeId ? { ...n, config: { ...n.config, ...configPatch } } : n,
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    setWorkflow((wf) => ({
      ...wf,
      nodes: wf.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // === 拖拽排序 ===
  const onDragStart = (index: number) => setDragIndex(index);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setWorkflow((wf) => {
      const nodes = [...wf.nodes];
      const [moved] = nodes.splice(dragIndex, 1);
      nodes.splice(index, 0, moved);
      return { ...wf, nodes, updatedAt: new Date().toISOString() };
    });
    setDragIndex(null);
  };

  // === 运行工作流 ===
  const handleRun = async () => {
    if (workflow.nodes.length === 0) {
      Message.warning('请先添加节点');
      return;
    }
    if (running) return;
    setRunning(true);
    setLogs([]);
    setNodeProgress({});
    setLastOutputDir(null);
    const startedAt = new Date().toISOString();
    const runLogs: WorkflowLog[] = [];

    try {
      const result = await executeWorkflow(workflow, (progress) => {
        setNodeProgress((prev) => ({ ...prev, [progress.nodeId]: progress }));
        if (progress.detail) {
          runLogs.push({
            nodeId: progress.nodeId,
            level: progress.status === 'error' ? 'error' : 'info',
            message: progress.detail,
            timestamp: new Date().toISOString(),
          });
          setLogs([...runLogs]);
          // 自动滚动到底部
          setTimeout(() => {
            if (logPanelRef.current) logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
          }, 0);
        }
      });

      // 合并引擎日志
      const allLogs = [...runLogs, ...result.context.logs];
      setLogs(allLogs);

      const writeNode = workflow.nodes.find((n) => n.type === 'write-directory');
      const outputDir = writeNode ? (writeNode.config as unknown as WriteDirectoryConfig).targetDir : undefined;

      const record: RunRecord = {
        id: `run-${Date.now()}`,
        workflowName: workflow.name,
        startedAt,
        success: result.success,
        fileCount: result.context.files.length,
        outputDir,
        logs: allLogs,
      };
      saveRunRecord(record);

      if (result.success) {
        Message.success(`工作流执行成功！输出 ${result.context.files.length} 个文件`);
        if (outputDir) setLastOutputDir(outputDir);
      } else {
        Message.error('工作流执行失败，请查看日志');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Message.error(`执行异常: ${msg}`);
      runLogs.push({
        nodeId: 'system',
        level: 'error',
        message: msg,
        timestamp: new Date().toISOString(),
      });
      setLogs([...runLogs]);
    } finally {
      setRunning(false);
    }
  };

  // === 保存/加载工作流 ===
  const handleSave = () => {
    const all = loadWorkflows();
    const idx = all.findIndex((w) => w.id === workflow.id);
    if (idx >= 0) all[idx] = workflow;
    else all.push(workflow);
    saveWorkflows(all);
    Message.success(`已保存工作流: ${workflow.name}`);
  };

  const handleLoad = () => {
    const all = loadWorkflows();
    if (all.length === 0) {
      Message.info('没有已保存的工作流');
      return;
    }
    // 简单实现：加载最近一个
    const latest = all[all.length - 1];
    setWorkflow(latest);
    setSelectedNodeId(null);
    setNodeProgress({});
    Message.success(`已加载: ${latest.name}`);
  };

  // === 打开输出目录 ===
  const handleOpenOutput = async () => {
    if (!lastOutputDir) return;
    const result = await window.electron.openFolder(lastOutputDir);
    if (!result.success) {
      Message.error(`打开目录失败: ${result.error || '未知错误'}`);
    }
  };

  // === 渲染 ===
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--arco-color-border-2)', flexShrink: 0 }}>
        <Input
          value={workflow.name}
          onChange={(v) => setWorkflow({ ...workflow, name: v })}
          style={{ width: 200 }}
          placeholder="工作流名称"
        />
        <Button type="primary" icon={<IconPlayArrow />} loading={running} onClick={handleRun}>
          运行
        </Button>
        <Button icon={<IconSave />} onClick={handleSave}>保存</Button>
        <Button onClick={handleLoad}>加载</Button>
        {lastOutputDir && (
          <Button
            type="outline"
            status="success"
            icon={<IconFolder />}
            onClick={handleOpenOutput}
          >
            打开输出目录
          </Button>
        )}
        <Text style={{ color: 'var(--arco-color-text-3)', fontSize: 12 }}>
          {workflow.nodes.length} 个节点
        </Text>
      </div>

      {/* 主体：三栏布局 */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 左侧：节点类型面板 */}
        <div style={{ width: 200, borderRight: '1px solid var(--arco-color-border-2)', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--arco-color-text-3)', textTransform: 'uppercase' }}>
            节点类型
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {NODE_TYPES.map((nt) => (
              <Card
                key={nt.type}
                size="small"
                hoverable
                onClick={() => addNode(nt.type)}
                style={{ cursor: 'pointer' }}
                bodyStyle={{ padding: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{nt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{nt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--arco-color-text-3)' }}>{nt.desc}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 8, background: 'var(--arco-color-fill-2)', borderRadius: 4, fontSize: 11, color: 'var(--arco-color-text-3)', lineHeight: 1.6 }}>
            提示：点击节点类型添加到工作流。拖拽节点卡片可重新排序。
          </div>
        </div>

        {/* 中间：步骤序列 */}
        <div style={{ flex: 1, padding: 12, overflowY: 'auto', minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--arco-color-text-3)', textTransform: 'uppercase' }}>
            步骤序列
          </Text>
          {workflow.nodes.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--arco-color-text-3)' }}>
              <IconPlus style={{ fontSize: 32, marginBottom: 8 }} />
              <div>从左侧添加节点开始编排工作流</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {workflow.nodes.map((node, index) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  index={index}
                  selected={node.id === selectedNodeId}
                  progress={nodeProgress[node.id]}
                  onSelect={() => setSelectedNodeId(node.id)}
                  onRemove={() => removeNode(node.id)}
                  onDragStart={() => onDragStart(index)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 右侧：配置面板 */}
        <div style={{ width: 300, borderLeft: '1px solid var(--arco-color-border-2)', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--arco-color-text-3)', textTransform: 'uppercase' }}>
            节点配置
          </Text>
          {selectedNode ? (
            <NodeConfigPanel
              node={selectedNode}
              onUpdateConfig={(patch) => updateNodeConfig(selectedNode.id, patch)}
              onUpdateLabel={(label) => updateNodeLabel(selectedNode.id, label)}
            />
          ) : (
            <div style={{ padding: '20px 8px', color: 'var(--arco-color-text-3)', fontSize: 13 }}>
              选中一个节点以编辑配置
            </div>
          )}
        </div>
      </div>

      {/* 底部：日志面板 */}
      <div
        ref={logPanelRef}
        style={{
          height: 140,
          overflowY: 'auto',
          padding: '8px 12px',
          borderTop: '1px solid var(--arco-color-border-2)',
          background: 'var(--arco-color-fill-1)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.6,
          flexShrink: 0,
        }}
      >
        {logs.length === 0 ? (
          <Text style={{ color: 'var(--arco-color-text-3)' }}>日志将显示在这里...</Text>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ color: log.level === 'error' ? '#f53f3f' : log.level === 'warn' ? '#ff7d00' : 'var(--arco-color-text-1)' }}>
              <span style={{ color: 'var(--arco-color-text-3)' }}>{log.timestamp.slice(11, 19)}</span>
              {' '}
              <span style={{ fontWeight: 600 }}>[{log.level.toUpperCase()}]</span>
              {' '}
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// 节点卡片
// ============================================================

interface NodeCardProps {
  node: WorkflowNode;
  index: number;
  selected: boolean;
  progress?: NodeProgress;
  onSelect: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

function NodeCard({ node, index, selected, progress, onSelect, onRemove, onDragStart, onDragOver, onDrop }: NodeCardProps) {
  const status = progress?.status || 'idle';
  const statusColor = STATUS_COLORS[status];
  const icon = NODE_TYPES.find((nt) => nt.type === node.type)?.icon || '❓';

  return (
    <Card
      size="small"
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        cursor: 'pointer',
        border: selected ? '2px solid #165dff' : '1px solid var(--arco-color-border-2)',
        opacity: node.enabled ? 1 : 0.5,
      }}
      bodyStyle={{ padding: '8px 12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconDragDotVertical style={{ color: 'var(--arco-color-text-3)', cursor: 'grab' }} />
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {index + 1}. {node.label}
          </div>
          {progress?.detail && (
            <div style={{ fontSize: 11, color: statusColor }}>{progress.detail}</div>
          )}
        </div>
        {/* 状态指示器 */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: statusColor,
          flexShrink: 0,
          animation: status === 'running' ? 'pulse 1.5s infinite' : undefined,
        }} />
        <Button
          type="text"
          size="mini"
          icon={<IconDelete />}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ color: 'var(--arco-color-text-3)' }}
        />
      </div>
    </Card>
  );
}

// ============================================================
// 节点配置面板
// ============================================================

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
  onUpdateLabel: (label: string) => void;
}

function NodeConfigPanel({ node, onUpdateConfig, onUpdateLabel }: NodeConfigPanelProps) {
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, color: 'var(--arco-color-text-3)', display: 'block', marginBottom: 4 }}>节点名称</label>
        <Input value={node.label} onChange={onUpdateLabel} size="small" />
      </div>
      {node.type === 'source-files' && <SourceFilesConfigPanel node={node} onUpdate={onUpdateConfig} />}
      {node.type === 'md-to-wiki-site' && <MdToWikiSiteConfigPanel node={node} onUpdate={onUpdateConfig} />}
      {node.type === 'write-directory' && <WriteDirectoryConfigPanel node={node} onUpdate={onUpdateConfig} />}
    </div>
  );
}

function SourceFilesConfigPanel({ node, onUpdate }: { node: WorkflowNode; onUpdate: (patch: Record<string, unknown>) => void }) {
  const config = node.config as unknown as SourceFilesConfig;
  const handleSelectFolder = async () => {
    const folder = await window.electron.selectFolder();
    if (folder) onUpdate({ folder });
  };
  return (
    <>
      <div>
        <label style={{ fontSize: 12, color: 'var(--arco-color-text-3)', display: 'block', marginBottom: 4 }}>输入模式</label>
        <Select
          value={config.inputMode}
          onChange={(v) => onUpdate({ inputMode: v })}
          size="small"
          style={{ width: '100%' }}
        >
          <Select.Option value="folder">文件夹扫描</Select.Option>
          <Select.Option value="paths">路径列表</Select.Option>
        </Select>
      </div>
      {config.inputMode === 'folder' && (
        <div>
          <label style={{ fontSize: 12, color: 'var(--arco-color-text-3)', display: 'block', marginBottom: 4 }}>文件夹</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <Input
              value={config.folder || ''}
              onChange={(v) => onUpdate({ folder: v })}
              size="small"
              placeholder="选择或输入文件夹路径"
            />
            <Button size="small" onClick={handleSelectFolder}>浏览</Button>
          </div>
        </div>
      )}
      <div>
        <label style={{ fontSize: 12, color: 'var(--arco-color-text-3)', display: 'block', marginBottom: 4 }}>
          扩展名过滤（逗号分隔）
        </label>
        <Input
          value={(config.exts || ['.md']).join(',')}
          onChange={(v) => onUpdate({ exts: v.split(',').map((s) => s.trim()).filter(Boolean) })}
          size="small"
          placeholder=".md,.markdown"
        />
      </div>
    </>
  );
}

function MdToWikiSiteConfigPanel({ node, onUpdate }: { node: WorkflowNode; onUpdate: (patch: Record<string, unknown>) => void }) {
  const config = node.config as unknown as MdToWikiSiteConfig;
  return (
    <div>
      <label style={{ fontSize: 12, color: 'var(--arco-color-text-3)', display: 'block', marginBottom: 4 }}>规则预设</label>
      <Select
        value={config.presetName}
        onChange={(v) => onUpdate({ presetName: v })}
        size="small"
        style={{ width: '100%' }}
      >
        {DEFAULT_PRESETS.map((p) => (
          <Select.Option key={p.name} value={p.name}>{p.name}</Select.Option>
        ))}
      </Select>
    </div>
  );
}

function WriteDirectoryConfigPanel({ node, onUpdate }: { node: WorkflowNode; onUpdate: (patch: Record<string, unknown>) => void }) {
  const config = node.config as unknown as WriteDirectoryConfig;
  const handleSelectFolder = async () => {
    const folder = await window.electron.saveFolder();
    if (folder) onUpdate({ targetDir: folder });
  };
  return (
    <div>
      <label style={{ fontSize: 12, color: 'var(--arco-color-text-3)', display: 'block', marginBottom: 4 }}>输出目录</label>
      <div style={{ display: 'flex', gap: 4 }}>
        <Input
          value={config.targetDir || ''}
          onChange={(v) => onUpdate({ targetDir: v })}
          size="small"
          placeholder="选择或输入输出目录"
        />
        <Button size="small" onClick={handleSelectFolder}>浏览</Button>
      </div>
    </div>
  );
}

export default WorkflowEditor;
