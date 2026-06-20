import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface EverythingStatus {
  connected: boolean;
  running: boolean;
  httpApi: boolean;
  httpPort: number;
  indexCount: number;
  error?: string;
}

interface EverythingContextType {
  status: EverythingStatus;
  isConnected: boolean;
  refresh: () => void;
}

const defaultStatus: EverythingStatus = {
  connected: false,
  running: false,
  httpApi: false,
  httpPort: 0,
  indexCount: 0,
};

const EverythingContext = createContext<EverythingContextType>({
  status: defaultStatus,
  isConnected: false,
  refresh: () => {},
});

export const useEverything = () => useContext(EverythingContext);

interface EverythingProviderProps {
  children: ReactNode;
}

export const EverythingProvider: React.FC<EverythingProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<EverythingStatus>(defaultStatus);

  const checkStatus = useCallback(async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('check-everything-status');
      if (result && typeof result === 'object') {
        setStatus({
          connected: result.running && result.httpApi,
          running: result.running || false,
          httpApi: result.httpApi || false,
          httpPort: result.httpPort || 0,
          indexCount: result.indexCount || 0,
          error: result.error,
        });
      }
    } catch (e) {
      console.error('[EverythingContext] 检测失败:', e);
      setStatus({ ...defaultStatus, error: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const value: EverythingContextType = {
    status,
    isConnected: status.connected,
    refresh: checkStatus,
  };

  return (
    <EverythingContext.Provider value={value}>
      {children}
    </EverythingContext.Provider>
  );
};
