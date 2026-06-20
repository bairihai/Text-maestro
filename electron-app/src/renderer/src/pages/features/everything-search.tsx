import React, { useState, useCallback } from 'react';
import { IconSearch, IconLoading, IconCopy, IconCheck } from '@arco-design/web-react/icon';
import { Button, Switch, Message } from '@arco-design/web-react';
import { useTheme } from '@renderer/context/ThemeContext';
import { useEverything } from '@renderer/context/EverythingContext';
import { EverythingRequiredWrapper } from '@renderer/components/EverythingRequiredWrapper';

const EverythingSearch: React.FC = () => {
  const { colors } = useTheme();
  const { isConnected } = useEverything();

  // 搜索参数
  const [searchPath, setSearchPath] = useState('');
  const [searchSubdirs, setSearchSubdirs] = useState(true);
  const [onlyFiles, setOnlyFiles] = useState(false);
  const [fullPath, setFullPath] = useState(true);

  // 搜索结果
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  // 调用主进程进行 Everything 搜索
  const performSearch = useCallback(async () => {
    if (!searchPath.trim()) {
      Message.warning('请输入要搜索的文件夹路径');
      return;
    }

    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      const searchResults = await window.electron.ipcRenderer.invoke(
        'everything-search',
        searchPath.trim(),
        searchSubdirs,
        onlyFiles,
        fullPath
      );

      if (Array.isArray(searchResults)) {
        setResults(searchResults);
        if (searchResults.length === 0) {
          Message.info('未找到匹配的文件');
        } else {
          Message.success(`找到 ${searchResults.length} 个文件`);
        }
      } else {
        setResults([]);
        Message.error('搜索失败');
      }
    } catch (e) {
      console.error('[EverythingSearch] 搜索失败:', e);
      Message.error(`搜索失败: ${(e as Error).message}`);
      setResults([]);
    }

    setLoading(false);
  }, [searchPath, searchSubdirs, onlyFiles, fullPath]);

  // 复制结果
  const handleCopy = useCallback(() => {
    const text = results.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [results]);

  // 代码块样式
  const codeBlockStyle: React.CSSProperties = {
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const codeHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.pageBg,
  };

  const codeBodyStyle: React.CSSProperties = {
    padding: 12,
    margin: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.5,
    color: colors.textPrimary,
    maxHeight: 400,
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  };

  return (
    <div className="p-4 max-w-4xl">
      <EverythingRequiredWrapper
        title="文件搜索"
        description="基于 Everything 的高速文件搜索，快速查找指定目录下的所有文件"
      >
        {/* 搜索参数 */}
        <div className="space-y-4">
          {/* 路径输入 */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: colors.textSecondary }}>
              输入文件夹路径
            </label>
            <input
              type="text"
              value={searchPath}
              onChange={(e) => setSearchPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
              placeholder="例如：D:\My Program\novelai-webui-aki-v2"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{
                backgroundColor: colors.pageBg,
                borderColor: colors.border,
                color: colors.textPrimary,
              }}
            />
          </div>

          {/* 选项 */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch
                size="small"
                checked={searchSubdirs}
                onChange={setSearchSubdirs}
                disabled={!isConnected}
              />
              <span style={{ color: colors.textPrimary }}>搜索子目录</span>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch
                size="small"
                checked={onlyFiles}
                onChange={setOnlyFiles}
                disabled={!isConnected}
              />
              <span style={{ color: colors.textPrimary }}>仅搜索文件</span>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch
                size="small"
                checked={fullPath}
                onChange={setFullPath}
                disabled={!isConnected}
              />
              <span style={{ color: colors.textPrimary }}>完整路径</span>
            </label>
          </div>

          {/* 搜索按钮 */}
          <Button
            type="primary"
            icon={loading ? <IconLoading className="animate-spin" /> : <IconSearch />}
            onClick={performSearch}
            disabled={!isConnected || loading || !searchPath.trim()}
          >
            {loading ? '搜索中...' : '搜索'}
          </Button>
        </div>

        {/* 结果显示 */}
        {searched && (
          <div className="mt-6">
            {codeBlockStyle && (
              <div style={codeBlockStyle}>
                <div style={codeHeaderStyle}>
                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                    {results.length > 0
                      ? `找到 ${results.length} 个文件`
                      : '未找到文件'}
                  </span>
                  {results.length > 0 && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
                      style={{ color: colors.textSecondary }}
                    >
                      {copied ? (
                        <>
                          <IconCheck style={{ color: '#3fb950' }} />
                          <span style={{ color: '#3fb950' }}>已复制</span>
                        </>
                      ) : (
                        <>
                          <IconCopy />
                          <span>复制</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <pre style={codeBodyStyle}>
                  {results.length > 0
                    ? results.join('\n')
                    : '无结果'}
                </pre>
              </div>
            )}
          </div>
        )}
      </EverythingRequiredWrapper>
    </div>
  );
};

export default EverythingSearch;
