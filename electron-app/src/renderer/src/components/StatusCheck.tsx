import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@arco-design/web-react';
import { IconRefresh } from '@arco-design/web-react/icon';

// 每5000毫秒检查一次服务器（7860端口的gradio服务）状态。由于更换使用了main方法避免CSP问题，确保在 preload 脚本中均已经暴露。
const StatusCheck: React.FC = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);

  const checkServerStatus = useCallback(async () => {
    if (checkCount >= 3) {
      setIsChecking(false);
      return;
    }

    setIsDetecting(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('check-server', '127.0.0.1', 7860);
      setIsServerRunning(result === '服务器运行中');
    } catch (error) {
      console.error('检查失败:', error);
      setIsServerRunning(false);
    }
    setIsDetecting(false);
    setCheckCount(prevCount => prevCount + 1);
  }, [checkCount]);

  useEffect(() => {
    if (isChecking) {
      checkServerStatus();
      const interval = setInterval(checkServerStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [checkServerStatus, isChecking]);

  const handleManualCheck = () => {
    setCheckCount(0);
    setIsChecking(true);
    checkServerStatus();
  };

  return (
    // 使用m-2来设置外边距margin，使用max-w-sm来设置最大宽度，使用w-full来设置宽度为100%
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm m-2"> 
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className={`h-4 w-4 rounded-full ${
            isDetecting ? 'bg-yellow-500' : 
            isServerRunning ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <div>
            <div className="font-medium">Gradio面板服务状态</div>
            <div className="text-sm text-muted-foreground">
              {isDetecting ? '检测中...' : 
               isServerRunning ? '127.0.0.1:7860 正在运行' : '127.0.0.1:7860 未运行'}
            </div>
            {/* {failCount >= 3 && (
              <div className="text-xs text-muted-foreground">
                为防止CSP的XSS问题，连续失败后将暂停检查，点击刷新按钮重新检查
              </div>
            )} */}
          </div>
        </div>
        <IconRefresh 
          className="cursor-pointer text-gray-500 hover:text-gray-700" 
          onClick={handleManualCheck}
        />
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