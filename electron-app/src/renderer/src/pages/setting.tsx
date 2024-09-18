import React from 'react';
import { Button, Switch, Select, Input, Typography, Card, Checkbox } from '@arco-design/web-react';

const cardOpacity = 'opacity-90';
const glassEffect = 'backdrop-filter backdrop-blur-lg bg-white/30';

function Setting() {
  return (
    <div className="h-screen overflow-y-auto p-4">
      <div id="nurp5mzn1d" className="space-y-8">
        <Card title="版本信息" className={`shadow-md rounded-lg ${cardOpacity} ${glassEffect}`}>
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
        <Card title="语言" className={`shadow-md rounded-lg ${cardOpacity} ${glassEffect}`}>
          <Select placeholder="选择语言" style={{ width: '100%' }} />
        </Card>
        <Card title="开机自启" className={`shadow-md rounded-lg ${cardOpacity} ${glassEffect}`}>
          <div className="flex items-center space-x-2">
            <Switch id="auto-start" />
            <label htmlFor="auto-start">在系统启动时自动启动软件</label>
          </div>
        </Card>
        <Card title="服务协议" className={`shadow-md rounded-lg ${cardOpacity} ${glassEffect}`}>
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
        <Card title="代理设置" className={`shadow-md rounded-lg ${cardOpacity} ${glassEffect}`}>
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