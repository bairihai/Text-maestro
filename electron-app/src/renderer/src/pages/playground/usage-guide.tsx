/**
 * 使用说明：引导用户上手 md → 静态网页工作流
 *
 * 包含：
 *   1. 场景介绍（赤心巡天章节转换）
 *   2. 三步配置引导
 *   3. 关键概念解释
 *   4. "一键加载示例工作流"按钮
 */
import { Button, Card, Message, Typography } from '@arco-design/web-react';
import { IconBook, IconPlayArrow, IconBulb } from '@arco-design/web-react/icon';
import { createExampleWorkflow, type Workflow } from '@renderer/utils/workflow-engine';

const { Title, Paragraph, Text } = Typography;

interface UsageGuideProps {
  onLoadExample: (workflow: Workflow) => void;
}

function UsageGuide({ onLoadExample }: UsageGuideProps) {
  const handleLoadExample = () => {
    const wf = createExampleWorkflow();
    onLoadExample(wf);
    Message.success('已加载示例工作流，切换到「工作流编辑器」Tab 点「运行」即可');
  };

  const strongStyle = { fontWeight: 600 };

  return (
    <div style={{ padding: '20px 32px', maxWidth: 820, margin: '0 auto', overflowY: 'auto', height: '100%' }}>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <IconBook style={{ fontSize: 24, color: '#165dff' }} />
        <Title heading={3} style={{ margin: 0 }}>使用说明：MD → 静态网页</Title>
      </div>
      <Paragraph style={{ color: 'var(--arco-color-text-3)', marginBottom: 24 }}>
        把多个 Markdown 文件批量转换成一组带导航的静态网页，文件间链接自动解析，一键生成可浏览的站点。
      </Paragraph>

      {/* 场景示例 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <IconBulb style={{ color: '#ff7d00' }} />
          <Title heading={5} style={{ margin: 0 }}>示例场景</Title>
        </div>
        <Paragraph style={{ marginBottom: 8 }}>
          项目目录 <Text code>test_data/example/赤心巡天2 3章</Text> 下有两个 md 文件：
        </Paragraph>
        <ul style={{ marginBottom: 8, paddingLeft: 20 }}>
          <li>赤心巡天第2章.md</li>
          <li>赤心巡天第3章.md</li>
        </ul>
        <Paragraph style={{ marginBottom: 0 }}>
          <span style={strongStyle}>需求：</span>把这些章节转成网页，网页内包含正文，还包含一个目录（侧边栏），以便切换不同章节。
        </Paragraph>
      </Card>

      {/* 一键加载 */}
      <Card style={{ marginBottom: 16, background: 'var(--arco-color-primary-light-1)', borderColor: '#165dff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Title heading={5} style={{ margin: '0 0 4px' }}>快速开始</Title>
            <Text style={{ color: 'var(--arco-color-text-2)' }}>
              点击下方按钮，自动加载预配置好的示例工作流，然后切到「工作流编辑器」点「运行」即可看到效果。
            </Text>
          </div>
          <Button type="primary" icon={<IconPlayArrow />} onClick={handleLoadExample} size="large">
            一键加载示例工作流
          </Button>
        </div>
      </Card>

      {/* 手动配置步骤 */}
      <Title heading={5} style={{ marginTop: 24, marginBottom: 12 }}>手动配置（三步）</Title>
      <Card style={{ marginBottom: 12 }}>
        <Title heading={6} style={{ marginTop: 0 }}>第 1 步：添加「读取文件」节点</Title>
        <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>在左侧节点类型面板点击 <Text code>📂 读取文件</Text></li>
          <li>在右侧配置面板选择「输入模式」为 <Text code>文件夹扫描</Text></li>
          <li>点击「浏览」选择 md 文件所在目录（如 <Text code>赤心巡天2 3章</Text>）</li>
          <li>扩展名保持 <Text code>.md</Text></li>
        </ol>
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--arco-color-fill-2)', borderRadius: 4, fontSize: 12, color: 'var(--arco-color-text-3)' }}>
          作用：递归扫描目录下所有 .md 文件，批量读取内容到工作流上下文。
        </div>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Title heading={6} style={{ marginTop: 0 }}>第 2 步：添加「MD → Wiki 站点」节点</Title>
        <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>在左侧节点类型面板点击 <Text code>🔄 MD → Wiki 站点</Text></li>
          <li>在右侧配置面板选择「规则预设」为 <Text code>Obsidian→Wiki</Text></li>
        </ol>
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--arco-color-fill-2)', borderRadius: 4, fontSize: 12, color: 'var(--arco-color-text-3)' }}>
          作用：遍历所有 md 文件，批量转成 html。自动生成 index.html 首页、每页顶部面包屑、左侧侧边栏站点导航（列出所有章节，可点击切换）。
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Title heading={6} style={{ marginTop: 0 }}>第 3 步：添加「写入目录」节点</Title>
        <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>在左侧节点类型面板点击 <Text code>💾 写入目录</Text></li>
          <li>在右侧配置面板点击「浏览」选择输出目录</li>
        </ol>
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--arco-color-fill-2)', borderRadius: 4, fontSize: 12, color: 'var(--arco-color-text-3)' }}>
          作用：把生成的所有 html + css + js 文件写盘到指定目录。
        </div>
      </Card>

      {/* 运行与查看结果 */}
      <Title heading={5} style={{ marginTop: 24, marginBottom: 12 }}>运行与查看结果</Title>
      <Card>
        <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
          <li>点击顶部 <Text code>▶ 运行</Text> 按钮</li>
          <li>观察节点状态依次变蓝（运行中）→ 变绿（完成），日志面板显示进度</li>
          <li>运行完成后，到输出目录打开 <Text code>index.html</Text> 即可看到站点首页</li>
          <li>首页列出所有章节，点击进入章节页，左侧侧边栏可切换不同章节</li>
        </ol>
      </Card>

      {/* 关键概念 */}
      <Title heading={5} style={{ marginTop: 24, marginBottom: 12 }}>关键概念</Title>
      <Card style={{ marginBottom: 12 }}>
        <Title heading={6} style={{ marginTop: 0 }}>遍历（批量处理）</Title>
        <Paragraph style={{ marginBottom: 0 }}>
          工作流的 <Text code>context.files</Text> 是一个文件数组，节点间天然传递整个集合。
          「MD → Wiki 站点」节点内部会遍历所有文件：先预扫描建映射表，再逐个转换。
          所以你只需要指定一个目录，N 个 md 文件会被批量处理，不需要手动循环。
        </Paragraph>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <Title heading={6} style={{ marginTop: 0 }}>站点导航（目录切换）</Title>
        <Paragraph style={{ marginBottom: 0 }}>
          转换后会自动生成：
          <ul style={{ marginTop: 4, paddingLeft: 20 }}>
            <li><span style={strongStyle}>index.html</span> —— 站点首页，列出所有页面（标题+摘要+标签）</li>
            <li><span style={strongStyle}>面包屑</span> —— 每页顶部显示 <Text code>首页 › 当前页标题</Text></li>
            <li><span style={strongStyle}>侧边栏 TOC</span> —— 每页左侧固定显示所有页面列表，点击即可切换章节</li>
          </ul>
          这正好满足「网页内包含正文，还包含一个目录以便切换不同章节」的需求。
        </Paragraph>
      </Card>
      <Card>
        <Title heading={6} style={{ marginTop: 0 }}>跨文件链接（wikilink）</Title>
        <Paragraph style={{ marginBottom: 0 }}>
          如果 md 文件中写了 <Text code>{'[[赤心巡天第3章]]'}</Text>，转换时会自动解析为指向
          <Text code>赤心巡天第3章.html</Text> 的超链接。找不到目标文件会标记为红色 broken link，不会静默丢失。
        </Paragraph>
      </Card>

      {/* 输出结构 */}
      <Title heading={5} style={{ marginTop: 24, marginBottom: 12 }}>输出文件结构</Title>
      <Card>
        <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--arco-color-text-2)' }}>
{`输出目录/
├── index.html              ← 站点首页（页面列表 + 标签云）
├── 赤心巡天第2章.html       ← 第2章正文 + 侧边栏导航
├── 赤心巡天第3章.html       ← 第3章正文 + 侧边栏导航
└── assets/
    ├── style.css           ← 站点样式（含侧边栏、面包屑）
    └── script.js           ← 侧边栏当前页滚动定位`}
        </pre>
      </Card>
    </div>
  );
}

export default UsageGuide;
