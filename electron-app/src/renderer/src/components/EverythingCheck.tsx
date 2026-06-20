import React, { useState, useEffect, useCallback } from 'react';
import { IconRefresh, IconLoading, IconDownload, IconPlayCircle } from '@arco-design/web-react/icon';
import { useTheme } from '@renderer/context/ThemeContext';

interface EverythingStatus {
  installed: boolean;
  running: boolean;
  indexed: boolean;
  indexCount: number;
  indexDate: string;
  httpApi: boolean;
  httpPort: number;
  error?: string;
}

const EverythingCheck: React.FC = () => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<EverythingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0); // 触发刷新的关键变量

  // 核心检测函数 —— 使用与 Gradio 卡片完全一致的 window.electron.ipcRenderer.invoke()
  const checkStatus = useCallback(async () => {
    console.log('[EverythingCheck] 开始检测...');
    setLoading(true);
    setError(null);
    try {
      const result = await window.electron.ipcRenderer.invoke('check-everything-status');
      console.log('[EverythingCheck] 返回结果:', result);
      if (result && typeof result === 'object') {
        setStatus(result);
      } else {
        setStatus(null);
        setError('返回格式异常');
      }
    } catch (e) {
      console.error('[EverythingCheck] 检测失败:', e);
      setError((e as Error).message || '检测失败');
      setStatus(null);
    }
    setLoading(false);
  }, []);

  // 初始加载 + 每 10 秒自动刷新
  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [checkStatus, checkCount]);

  // 手动启动 Everything
  const handleOpen = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('open-everything');
      if (result.success) {
        // 启动后延迟 2 秒重新检测
        setTimeout(() => setCheckCount(c => c + 1), 2000);
      } else {
        setError(result.error || '启动失败');
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // 打开下载页面
  const handleDownload = async () => {
    try {
      await window.electron.ipcRenderer.invoke('open-everything-download');
    } catch (e) {
      console.error('[EverythingCheck] 下载失败:', e);
    }
  };

  // 状态点颜色
  const getStatusDotColor = () => {
    if (loading) return 'text-gray-500';
    if (error) return 'bg-red-500';
    if (!status) return 'bg-gray-500';
    if (!status.installed) return 'bg-red-500';
    if (!status.running) return 'bg-yellow-500';
    if (!status.indexed) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // 状态文字
  const getStatusText = () => {
    if (loading) return '检测中...';
    if (error) return `检测错误: ${error}`;
    if (!status) return '未知状态';
    if (!status.installed) return '未安装';
    if (!status.running) return '已安装 · 未运行';
    if (status.running && !status.httpApi) return '运行中（HTTP 服务器未开启）';
    if (!status.indexed || status.indexCount === 0) return `运行中 · HTTP: ${status.httpPort} · 正在索引`;
    return `正常运行 · ${status.indexCount.toLocaleString()} 个文件`;
  };

  const getSubText = () => {
    if (loading || error || !status) return '';
    if (!status.installed) return '点击下载图标打开官网';
    if (!status.running) return '点击启动图标打开 Everything';
    if (status.running && !status.httpApi) return '开启 HTTP 服务器以获取索引数量';
    return '';
  };

  const statusDot = getStatusDotColor();
  const statusText = getStatusText();
  const subText = getSubText();

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-sm m-2">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          {/* 状态指示点 */}
          {loading ? (
            <IconLoading className="text-gray-500" />
          ) : (
            <div className={`h-4 w-4 rounded-full ${statusDot}`} />
          )}

          {/* 文字 */}
          <div>
            <div className="font-medium">Everything 状态</div>
            <div className="text-sm text-muted-foreground">{statusText}</div>
            {subText && (
              <div className="text-xs text-muted-foreground mt-1">{subText}</div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <IconRefresh
            className="cursor-pointer text-gray-500 hover:text-gray-700"
            onClick={() => setCheckCount(c => c + 1)}
          />

          {!status?.installed ? (
            <IconDownload
              className="cursor-pointer text-gray-500 hover:text-gray-700"
              onClick={handleDownload}
            />
          ) : !status?.running ? (
            <IconPlayCircle
              className="cursor-pointer text-gray-500 hover:text-gray-700"
              onClick={handleOpen}
            />
          ) : null}
        </div>
      </div>

      {/* 详细信息 */}
      {status && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div>
              <span style={{ color: colors.textSecondary }}>安装状态: </span>
              <span style={{ color: status.installed ? colors.textPrimary : '#f85149' }}>
                {status.installed ? '已安装' : '未安装'}
              </span>
            </div>
            <div>
              <span style={{ color: colors.textSecondary }}>运行状态: </span>
              <span style={{ color: status.running ? '#3fb950' : '#d29922' }}>
                {status.running ? '运行中' : '未运行'}
              </span>
            </div>
            {status.running && (
              <>
                <div>
                  <span style={{ color: colors.textSecondary }}>HTTP API: </span>
                  <span style={{ color: status.httpApi ? '#3fb950' : '#d29922' }}>
                    {status.httpApi ? `已开启 (127.0.0.1:${status.httpPort})` : '未开启'}
                  </span>
                </div>
                <div>
                  <span style={{ color: colors.textSecondary }}>索引数量: </span>
                  <span style={{ color: colors.textPrimary }}>
                    {status.httpApi && status.indexCount > 0 ? `${status.indexCount.toLocaleString()} 条` : '—'}
                  </span>
                </div>
              </>
            )}
            {status.running && !status.httpApi && (
              <div className="col-span-2 mt-2 pt-2 border-t" style={{ borderTop: `1px dashed ${colors.border}` }}>
                <span style={{ color: colors.textSecondary }}>配置指南: </span>
                <span style={{ color: '#d29922' }}>
                  在 Everything 中 → 工具 → 选项 → HTTP 服务器 → 勾选「启用 HTTP 服务器」，端口可设为 80/21/8080
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EverythingCheck;
