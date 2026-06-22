import React, { ReactNode } from 'react';
import { IconLock } from '@arco-design/web-react/icon';
import { useGradio } from '@renderer/context/GradioContext';
import { useTheme } from '@renderer/context/ThemeContext';

interface GradioBadgeProps {
  variant?: 'default' | 'compact';
}

export const GradioBadge: React.FC<GradioBadgeProps> = ({ variant = 'default' }) => {
  const style = variant === 'compact' ? {
    backgroundColor: '#FF8000',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: '0.75em',
    color: '#fff',
    fontWeight: 600,
    marginLeft: 8,
    verticalAlign: 'middle' as const,
  } : {
    backgroundColor: '#FF8000',
    borderRadius: 5,
    padding: '2px 8px',
    fontSize: '0.85em',
    color: '#fff',
    fontWeight: 600,
    display: 'inline-block' as const,
  };

  return <span style={style}>gradio</span>;
};

interface GradioRequiredWrapperProps {
  title: string;
  description?: string;
  children: ReactNode;
  features?: ReactNode;
}

export const GradioRequiredWrapper: React.FC<GradioRequiredWrapperProps> = ({
  title,
  description,
  children,
  features,
}) => {
  const { colors } = useTheme();
  const { isConnected, status } = useGradio();

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
              <GradioBadge variant="compact" />
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
                ⚠️ 此功能需要系统已安装 Python 环境
              </p>
              <div className="text-xs" style={{ color: colors.textSecondary }}>
                <p>• 确保已安装 Python 3.x（可在 cmd 中用 `python --version` 验证）</p>
                <p>• 如需安装，请访问 https://www.python.org/downloads/</p>
                <p>• 或使用你本地 Gradio 面板相同的 Python 环境</p>
              </div>
              {status.error && (
                <p className="mt-2 text-orange-500">
                  当前状态：{status.error}
                </p>
              )}
              {status.version && (
                <p className="mt-2 text-green-500">
                  当前状态：检测到 Python {status.version}
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
        <GradioBadge variant="compact" />
        {status.version && (
          <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
            Python {status.version}
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
