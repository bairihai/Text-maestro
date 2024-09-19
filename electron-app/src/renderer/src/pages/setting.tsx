import React, { useEffect, useState } from 'react';
import { Button, Switch, Select, Input, Typography, Card, Checkbox } from '@arco-design/web-react';

import StatusCheck from '@renderer/components/StatusCheck';

import { useSelector, useDispatch } from 'react-redux';
import { setState } from '@renderer/store/globalModel';

// 设置透明度和blur毛玻璃效果。毛玻璃需要再调一下，没背景不生效。
const cardStyle = {
  borderRadius: '10px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  opacity: '0.9',
  backdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
};

function Setting() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-preferences', 'theme').then((savedTheme) => {
      setTheme(savedTheme || 'light');
    });
  }, []);

  // 当用户改变主题时，handleThemeChange 函数被调用，它会触发 set-preferences IPC 调用。——2024年9月19日 03点25分 cursor claude
  const handleThemeChange = (value) => {
    setTheme(value);
    window.electron.ipcRenderer.invoke('set-preferences', { theme: value });
    applyTheme(value);
  };

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.body.setAttribute('arco-theme', 'dark');
    } else {
      document.body.removeAttribute('arco-theme');
    }
  };

  return (
    <div className="h-screen overflow-y-auto p-4">        <StatusCheck />
    <div id="nurp5mzn1d" className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
{/* 在宽度足够（中等屏幕及以上）的情况下，每行展示两个卡片 */}
        <Card title="版本信息" style={cardStyle}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-4">
                <div>
                  <Typography.Text type="secondary">当前版本</Typography.Text>
                  <Typography.Title heading={6}>v2.3.1</Typography.Title>
                </div>
                <div>
                  <Typography.Text type="secondary">最新版本</Typography.Text>
                  <Typography.Title heading={6}>v2.4.0</Typography.Title>
                </div>
              </div>
            </div>
            <div className="space-x-2">
              <Button type="outline" icon={<i className="arco-icon arco-icon-info-circle" />}>
                查看更新
              </Button>
              <Button type="primary" icon={<i className="arco-icon arco-icon-upload" />}>
                立即升级
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-2">
            <Switch id="auto-update" />
            <label htmlFor="auto-update">启动时自动检查更新并提示</label>
          </div>
        </Card>
        <Card title="语言" style={cardStyle}>
          <Select placeholder="选择语言" style={{ width: '100%' }} />
        </Card>
        <Card title="开机自启" style={cardStyle}>
          <div className="flex items-center space-x-2">
            <Switch id="auto-start" />
            <label htmlFor="auto-start">在系统启动时自动启动软件</label>
          </div>
        </Card>
        <Card title="界面主题" style={cardStyle}>
          <Select 
            placeholder="选择主题" 
            style={{ width: '100%' }}
            value={theme}
            onChange={handleThemeChange}
          >
            <Select.Option value="light">浅色模式</Select.Option>
            <Select.Option value="dark">深色模式</Select.Option>
          </Select>
        </Card>
        <Card title="服务协议" style={cardStyle}>
          <Typography.Text type="secondary">
            请仔细阅读并同意我们的服务协议,以便继续使用本软件。
          </Typography.Text>
          <a className="underline" href="#">
            查看服务协议
          </a>
          <div className="flex items-center space-x-2">
            <Checkbox id="agree-terms" checked disabled>
              我已阅读并同意服务协议
            </Checkbox>
          </div>
        </Card>
        <Card title="代理设置" style={cardStyle}>
          <div className="grid gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="use-proxy" />
              <label htmlFor="use-proxy">启用代理</label>
            </div>
            <div className="grid gap-2">
              <label htmlFor="proxy-host">代理主机</label>
              <Input id="proxy-host" placeholder="例如: 127.0.0.1" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="proxy-port">代理端口</label>
              <Input id="proxy-port" placeholder="例如: 8080" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Setting;