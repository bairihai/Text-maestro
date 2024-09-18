import React, { useState, useEffect } from 'react';
import { Card } from '@arco-design/web-react';

// 每5000毫秒检查一次服务器（7860端口的gradio服务）状态
const StatusCheck: React.FC = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:7860');
        setIsServerRunning(response.ok);
      } catch (error) {
        setIsServerRunning(false);
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm">
      <div className="flex items-center gap-4 p-4">
        <div className={`h-4 w-4 rounded-full ${isServerRunning ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <div className="font-medium">服务器状态</div>
          <div className="text-sm text-muted-foreground">
            {isServerRunning ? '127.0.0.1:7860 正在运行' : '127.0.0.1:7860 未运行'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusCheck;
