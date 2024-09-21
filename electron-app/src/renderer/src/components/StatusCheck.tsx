import React, { useState, useEffect } from 'react';
import { Card } from '@arco-design/web-react';

// 每5000毫秒检查一次服务器（7860端口的gradio服务）状态。由于更换使用了main方法避免CSP问题，确保在 preload 脚本中均已经暴露。
const StatusCheck: React.FC = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const checkServerStatus = async () => {
    console.log('Renderer: 开始检查服务器状态');
    try {
      const result = await window.electron.ipcRenderer.invoke('check-server', '127.0.0.1', 7860);
      console.log('Renderer: 检查结果:', result);
      setIsServerRunning(result === '服务器运行中');
      setFailCount(0);
    } catch (error) {
      console.error('Renderer: 检查失败:', error);
      setIsServerRunning(false);
      setFailCount(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (failCount >= 3) return;

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);

    return () => clearInterval(interval);
  }, [failCount]);

  const handleClick = () => {
    setFailCount(0);
    checkServerStatus();
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm" onClick={handleClick}>
      <div className="flex items-center gap-4 p-4">
        <div className={`h-4 w-4 rounded-full ${isServerRunning ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <div className="font-medium">服务器状态</div>
          <div className="text-sm text-muted-foreground">
            {isServerRunning ? '127.0.0.1:7860 正在运行' : '127.0.0.1:7860 未运行'}
          </div>
          {failCount >= 3 && (
            <div className="text-xs text-muted-foreground">
              为防止CSP的XSS问题，连续失败后将暂停检查，手动点击以重新检查
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusCheck;
