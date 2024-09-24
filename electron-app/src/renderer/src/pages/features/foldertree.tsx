// 文件命名中间应该驼峰的，改不了了，回头吧。

import React, { useEffect, useRef } from 'react';

const FolderTree: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const iframeDocument = iframe.contentDocument;
      if (!iframeDocument) return;

      const folderTreeSection = iframeDocument.getElementById('folder-tree-section');
      if (folderTreeSection) {
        // 移除 Gradio 界面中不需要的元素
        const elementsToRemove = iframeDocument.querySelectorAll('body > *:not(#folder-tree-section)');
        elementsToRemove.forEach(el => el.remove());

        // 调整样式以适应 Electron 应用
        const style = iframeDocument.createElement('style');
        style.textContent = `
          body { margin: 0; padding: 0; }
          #folder-tree-section { width: 100%; height: 100%; }
        `;
        iframeDocument.head.appendChild(style);
      }
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="http://localhost:7860"  // Gradio 应用的 URL
      style={{ width: '100%', height: '100%', border: 'none' }}
    />
  );
};

export default FolderTree;
