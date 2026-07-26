import React, { useState, useEffect, useCallback } from 'react';
import { IconRefresh, IconLoading } from '@arco-design/web-react/icon';

const GradioCheck: React.FC = () => {
  const [status, setStatus] = useState<{ available: boolean; version?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  const checkStatus = useCallback(async () => {
    console.log('[GradioCheck] 开始检测 Python 环境...');
    setLoading(true);
    setError(null);
    try {
      const result = await window.electron.ipcRenderer.invoke('check-gradio-status');
      if (result && typeof result === 'object') {
        setStatus({ available: !!result.available, version: result.version, error: result.error });
      } else {
        setStatus(null);
        setError('返回格式异常');
      }
    } catch (e) {
      console.error('[GradioCheck] 检测失败:', e);
      setError((e as Error).message || '检测失败');
      setStatus(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkStatus, checkCount]);

  const getStatusDotColor = () => {
    if (loading) return 'text-gray-500';
    if (error || !status) return 'bg-red-500';
    if (!status.available) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (loading) return '检测中...';
    if (error) return `检测错误: ${error}`;
    if (!status) return '未知状态';
    if (!status.available) return 'Python 未检测到';
    return `Python ${status.version || ''} 可用`;
  };

  const statusDot = getStatusDotColor();
  const statusText = getStatusText();

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm m-2">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {loading ? (
            <IconLoading className="text-gray-500" />
          ) : (
            <div className={`h-4 w-4 rounded-full ${statusDot}`} />
          )}
          <div>
            <div className="font-medium">Python (Gradio) 环境</div>
            <div className="text-sm text-muted-foreground">{statusText}</div>
          </div>
        </div>
        <IconRefresh
          className="cursor-pointer text-gray-500 hover:text-gray-700"
          onClick={() => setCheckCount(c => c + 1)}
        />
      </div>
    </div>
  );
};

export default GradioCheck;
