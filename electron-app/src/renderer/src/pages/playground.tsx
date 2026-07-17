// Playground 主页：Tab 切换「使用说明」/「工作流编辑器」/「Demo」
import { useState, useEffect } from 'react';
import { Input, Tabs } from '@arco-design/web-react';
import { useSelector, useDispatch } from 'react-redux';
import { setState } from '@renderer/store/globalModel';
import WorkflowEditor from './playground/workflow-editor';
import UsageGuide from './playground/usage-guide';
import type { Workflow } from '@renderer/utils/workflow-engine';

const { TabPane } = Tabs;

/** 原 Demo 内容：Redux 读写 + IPC read-file */
function PlaygroundDemo() {
  const appName = useSelector((state: any) => state.global.appName);
  const dispatch = useDispatch();
  const [fileContent, setFileContent] = useState('');

  const handleChange = (value: string) => {
    dispatch(setState({ appName: value }));
  };

  const ipcHandle = (): void => {
    const filePath = 'E:\\200 学习\\230 编程-信息\\238 工具素养\\10 ai\\ai网文哪家强.md';
    window.electron.ipcRenderer.send('read-file', filePath);
  };

  useEffect(() => {
    const handleFileContent = (_event: unknown, content: string) => {
      setFileContent(content);
    };
    window.electron.ipcRenderer.on('file-content', handleFileContent);
    return () => {
      window.electron.ipcRenderer.removeListener('file-content', handleFileContent);
    };
  }, []);

  return (
    <div className="p-4">
      这里能提供的工具是有限的，不过随着我们的开放能力逐步增强，我们希望大家可以diy自己的文本分析制作逻辑、并在playground这里发布。
      目前这里还未开放。你可以到 zuomeme.com 上制作meme，或者到 collection.jituc.cn 上 找更多工具箱（如Unicode转码、字体预览等工具）。
      下面展示两项能力：renderer process读取redux store内容 以及 使用ipcRenderer读取文件内容。
      <Input
        placeholder="请输入内容"
        className="w-full"
        value={appName}
        onChange={handleChange}
      />
      <button onClick={ipcHandle} style={{ fontSize: 'larger', backgroundColor: 'green' }}>点击ipc test，将会读取一个测试的Md显示到下面</button>
      <pre style={{
        color: 'black',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        backgroundColor: '#f5f5f5',
        padding: '10px',
        borderRadius: '5px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>{fileContent}</pre>
    </div>
  );
}

function Playground() {
  const [activeTab, setActiveTab] = useState('guide');
  // 用 key 强制 WorkflowEditor 重新挂载，以便加载示例工作流后刷新 UI
  const [editorKey, setEditorKey] = useState(0);
  const [pendingWorkflow, setPendingWorkflow] = useState<Workflow | null>(null);

  /** 使用说明页「一键加载示例工作流」回调 */
  const handleLoadExample = (workflow: Workflow) => {
    setPendingWorkflow(workflow);
    setEditorKey((k) => k + 1); // 强制重挂载
    setActiveTab('workflow');   // 切到编辑器
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        className="full-height-tabs"
        style={{ flex: 1, minHeight: 0 }}
      >
        <TabPane key="guide" title="📖 使用说明" style={{ height: '100%', overflow: 'auto' }}>
          <UsageGuide onLoadExample={handleLoadExample} />
        </TabPane>
        <TabPane key="workflow" title="🔧 工作流编辑器" style={{ height: '100%', overflow: 'hidden' }}>
          <WorkflowEditor key={editorKey} initialWorkflow={pendingWorkflow} />
        </TabPane>
        <TabPane key="demo" title="Demo" style={{ height: '100%', overflow: 'auto' }}>
          <PlaygroundDemo />
        </TabPane>
      </Tabs>
    </div>
  );
}

export default Playground;
