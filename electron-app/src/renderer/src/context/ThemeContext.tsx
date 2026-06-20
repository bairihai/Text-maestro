import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// 浅色模式颜色（GitHub Light）
export const LIGHT_COLORS = {
  pageBg: '#ffffff',
  cardBg: '#f6f8fa',
  border: '#d0d7de',
  textPrimary: '#1f2328',
  textSecondary: '#656d76',
  focusRing: 'rgba(31, 111, 235, 0.4)',
  focusBorder: '#2f81f7',
  btnGreen: '#238636',
  btnGreenHover: '#2ea043',
  inputBg: '#ffffff',
  error: '#cf222e',
  success: '#1a7f37',
};

// 深色模式颜色（GitHub Dark）
export const DARK_COLORS = {
  pageBg: '#0d1117',
  cardBg: '#161b22',
  border: '#30363d',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  focusRing: 'rgba(31, 111, 235, 0.4)',
  focusBorder: '#2f81f7',
  btnGreen: '#238636',
  btnGreenHover: '#2ea043',
  inputBg: '#0d1117',
  error: '#f85149',
  success: '#3fb950',
};

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: typeof LIGHT_COLORS;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// 检测系统主题
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme());

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 从 IPC 加载用户偏好
  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-preferences', 'theme').then((savedTheme) => {
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setModeState(savedTheme as ThemeMode);
      }
    });
  }, []);

  // 计算实际生效的主题
  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode;
  const colors = resolvedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  // 应用 Arco Design 主题
  useEffect(() => {
    if (resolvedTheme === 'dark') {
      document.body.setAttribute('arco-theme', 'dark');
    } else {
      document.body.removeAttribute('arco-theme');
    }
  }, [resolvedTheme]);

  // 设置主题并保存到 IPC
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    window.electron.ipcRenderer.invoke('set-preferences', { theme: newMode });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

// 导出颜色类型供其他组件使用
export type ThemeColors = typeof LIGHT_COLORS;