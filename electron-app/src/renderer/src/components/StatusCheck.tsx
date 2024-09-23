import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@arco-design/web-react';

// 每5000毫秒检查一次服务器（7860端口的gradio服务）状态。由于更换使用了main方法避免CSP问题，确保在 preload 脚本中均已经暴露。
const StatusCheck: React.FC = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const checkServerStatus = useCallback(async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('check-server', '127.0.0.1', 7860);
      if (result === '服务器运行中') {
        setIsServerRunning(true);
        setFailCount(0);
      } else {
        setIsServerRunning(false);
        setFailCount(prevCount => prevCount + 1);
      }
    } catch (error) {
      console.error('检查失败:', error);
      setIsServerRunning(false);
      setFailCount(prevCount => prevCount + 1);
    }
  }, []);

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
    // 使用m-2来设置外边距margin，使用max-w-sm来设置最大宽度，使用w-full来设置宽度为100%
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm m-2" onClick={handleClick}> 
      <div className="flex items-center gap-4 p-4">
        <div className={`h-4 w-4 rounded-full ${isServerRunning ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <div className="font-medium">Gradio面板服务状态</div>
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

const OnlineCheck = () => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm m-2">
      <div className="flex items-center gap-4 p-4">
        <div className="h-4 w-4 rounded-full bg-gray-500" />
        <div>
          <div className="font-medium">在线状态</div>
          <div className="text-sm text-muted-foreground">在线检查组件占位</div>
        </div>
      </div>
    </div>
  );
};

const EverythingCheck = () => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm m-2">
      <div className="flex items-center gap-4 p-4">
        <div className="h-4 w-4 rounded-full bg-gray-500" />
        <div>
          <div className="font-medium">Everything状态</div>
          <div className="text-sm text-muted-foreground">Everything检查组件占位</div>
        </div>
      </div>
    </div>
  );
};

const WordCloudAdvancedCheck = () => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm m-2">
      <div className="flex items-center gap-4 p-4">
        <div className="h-4 w-4 rounded-full bg-gray-500" />
        <div>
          <div className="font-medium">词云-advanced组件包</div>
          <div className="text-sm text-muted-foreground">WordCloud高级检查组件占位</div>
        </div>
      </div>
    </div>
  );
};

export {StatusCheck, OnlineCheck, EverythingCheck, WordCloudAdvancedCheck};