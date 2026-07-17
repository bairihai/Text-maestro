// import './index.less';

import { useState } from 'react';
import { Button, Modal, Message, Select, Spin } from '@arco-design/web-react';
import MarkdownIt from 'markdown-it';

import Versions from '@renderer/components/Versions'
import electronLogo from '@renderer/assets/electron.svg'

// 复用 markdown-it 实例（避免每次渲染都重建）
const md = new MarkdownIt({
  html: false,        // 禁用内嵌 HTML，README 中无需
  linkify: true,      // 自动识别链接
  breaks: false,
  typographer: false,
});

type ReadmeKind = 'main' | 'project';

function About(): JSX.Element {
  // window.electron 中的electron要与预加载脚本（preload contextBridge）中预留的字段'electron'对应
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  const [modalVisible, setModalVisible] = useState(false);
  const [readmeKind, setReadmeKind] = useState<ReadmeKind>('main');
  const [readmeHtml, setReadmeHtml] = useState('');
  const [readmePath, setReadmePath] = useState('');
  const [loading, setLoading] = useState(false);

  // 拉取 README 并渲染为 HTML 弹窗显示
  const handleViewReadme = async (kind: ReadmeKind): Promise<void> => {
    setReadmeKind(kind);
    setModalVisible(true);
    setLoading(true);
    try {
      const result = await window.electron.readReadme(kind);
      if (!result.success || !result.data) {
        Message.error(`读取失败：${result.error || '未知错误'}`);
        setReadmeHtml(`<p style="color:#f53f3f">读取失败：${result.error || '未找到 README 文件'}</p>`);
        setReadmePath('');
        return;
      }
      setReadmeHtml(md.render(result.data));
      setReadmePath(result.path || '');
    } catch (err) {
      Message.error(`异常：${(err as Error).message}`);
      setReadmeHtml(`<p style="color:#f53f3f">异常：${(err as Error).message}</p>`);
    } finally {
      setLoading(false);
    }
  };

  // 用系统默认应用打开 README 文件
  const handleOpenReadme = async (kind: ReadmeKind): Promise<void> => {
    try {
      const result = await window.electron.openReadme(kind);
      if (!result.success) {
        Message.error(`打开失败：${result.error || '未知错误'}`);
        return;
      }
      Message.success(`已打开：${result.path}`);
    } catch (err) {
      Message.error(`异常：${(err as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Text-maestro with <span className="react">React</span>
        &nbsp;+ <span className="ts">TypeScript</span>
        &nbsp;+ <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4F576A] to-[#EBE5D8]">Tailwindcss</span>
      </div>
      <p className="tip">
        Please try pressing <code>Ctrl</code> + <code>Shift</code> + <code>I</code> to open the devTool
      </p>
      <p className="tip">
        <code>window.location.reload()</code> 以刷新页面
      </p>
      <p className="tip">
        <code>window.location.pathname</code> 查看当前router路径
      </p>
      <p className="tip">
        by 云都官能团@白日海
      </p>

      {/* === README 快速访问 === */}
      <div className="actions" style={{ marginTop: '12px' }}>
        <div className="action">
          <Button type="primary" onClick={() => handleViewReadme(readmeKind)}>
            查看 README 内容
          </Button>
        </div>
        <div className="action">
          <Button type="outline" onClick={() => handleOpenReadme(readmeKind)}>
            打开 README 文件
          </Button>
        </div>
        <div className="action">
          <Select
            value={readmeKind}
            onChange={(v) => setReadmeKind(v as ReadmeKind)}
            style={{ width: 180 }}
          >
            <Select.Option value="main">主 README（README.md）</Select.Option>
            <Select.Option value="project">技术笔记（README-project.md）</Select.Option>
          </Select>
        </div>
      </div>

      <div className="actions" style={{ marginTop: '12px' }}>
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions></Versions>

      {/* === README 内容弹窗 === */}
      <Modal
        title={readmeKind === 'project' ? 'README-project.md' : 'README.md'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        style={{ width: 860, top: 40 }}
        unmountOnExit
      >
        <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--ev-c-text-2)' }}>
          {readmePath ? `路径：${readmePath}` : ''}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <div
            className="readme-content"
            // markdown-it 已禁用内嵌 HTML，相对安全；README 内容来自本地可信文件
            dangerouslySetInnerHTML={{ __html: readmeHtml }}
            style={{
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '0 8px 8px 0',
              lineHeight: 1.7,
            }}
          />
        )}
      </Modal>
    </div>
  );
}

export default About;
