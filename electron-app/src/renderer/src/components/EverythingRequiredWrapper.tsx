import React, { ReactNode } from 'react';
import { IconLock } from '@arco-design/web-react/icon';
import { useEverything } from '@renderer/context/EverythingContext';
import { useTheme } from '@renderer/context/ThemeContext';

interface EverythingBadgeProps {
  variant?: 'default' | 'compact';
}

export const EverythingBadge: React.FC<EverythingBadgeProps> = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <span style={{
        backgroundColor: '#FF8000',
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: '0.75em',
        color: '#fff',
        fontWeight: 600,
        marginLeft: 8,
        verticalAlign: 'middle',
      }}>
        everything
      </span>
    );
  }

  return (
    <span style={{
      backgroundColor: '#FF8000',
      borderRadius: 5,
      padding: '2px 8px',
      fontSize: '0.85em',
      color: '#fff',
      fontWeight: 600,
      display: 'inline-block',
    }}>
      everything
    </span>
  );
};

interface EverythingRequiredWrapperProps {
  title: string;
  description?: string;
  children: ReactNode;
  features?: ReactNode;
}

export const EverythingRequiredWrapper: React.FC<EverythingRequiredWrapperProps> = ({
  title,
  description,
  children,
  features,
}) => {
  const { colors } = useTheme();
  const { isConnected, status } = useEverything();

  if (!isConnected) {
    return (
      <div
        className="rounded-lg border p-4 opacity-60"
        style={{
          backgroundColor: colors.cardBg,
          borderColor: colors.border,
        }}
      >
        <div className="flex items-start gap-3">
          <IconLock className="text-orange-500 mt-0.5" style={{ color: '#FF8000' }} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold" style={{ color: colors.textPrimary }}>{title}</h3>
              <EverythingBadge variant="compact" />
            </div>
            {description && (
              <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                {description}
              </p>
            )}
            <div
              className="rounded p-3 text-sm"
              style={{
                backgroundColor: colors.pageBg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <p className="mb-2" style={{ color: colors.textSecondary }}>
                ⚠️ 此功能需要 Everything 后台运行并启用 HTTP API
              </p>
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                <p>• 确保 Everything 已在后台运行</p>
                <p>• 在 Everything 中：工具 → 选项 → HTTP 服务器 → 启用</p>
                <p>• 常用端口：80, 21, 8080</p>
              </div>
              {status.running && !status.httpApi && (
                <p className="mt-2 text-orange-500">
                  当前状态：Everything 运行中，但 HTTP API 未启用
                </p>
              )}
              {status.httpPort > 0 && (
                <p className="mt-2 text-green-500">
                  当前状态：已连接到 127.0.0.1:{status.httpPort}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: colors.cardBg,
        borderColor: colors.border,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold" style={{ color: colors.textPrimary }}>{title}</h3>
        <EverythingBadge variant="compact" />
        {status.indexCount > 0 && (
          <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
            已索引 {status.indexCount.toLocaleString()} 个文件
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
          {description}
        </p>
      )}
      {children}
      {features}
    </div>
  );
};
