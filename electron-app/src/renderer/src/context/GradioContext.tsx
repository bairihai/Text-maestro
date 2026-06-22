import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface GradioStatus {
  connected: boolean;      // Python 环境是否可用
  running: boolean;
  version: string;
  error?: string;
}

interface GradioContextType {
  status: GradioStatus;
  isConnected: boolean;
  refresh: () => void;
}

const defaultStatus: GradioStatus = {
  connected: false,
  running: false,
  version: '',
};

const GradioContext = createContext<GradioContextType>({
  status: defaultStatus,
  isConnected: false,
  refresh: () => {},
});

export const useGradio = () => useContext(GradioContext);

interface GradioProviderProps {
  children: ReactNode;
}

export const GradioProvider: React.FC<GradioProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<GradioStatus>(defaultStatus);

  const checkStatus = useCallback(async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('check-gradio-status');
      if (result && typeof result === 'object') {
        setStatus({
          connected: !!result.available,
          running: !!result.available,
          version: result.version || '',
          error: result.error,
        });
      }
    } catch (e) {
      console.error('[GradioContext] 检测失败:', e);
      setStatus({ ...defaultStatus, error: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const value: GradioContextType = {
    status,
    isConnected: status.connected,
    refresh: checkStatus,
  };

  return (
    <GradioContext.Provider value={value}>
      {children}
    </GradioContext.Provider>
  );
};
