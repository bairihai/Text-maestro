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

      // 只保留文件树组件
      const folderTree = iframeDocument.querySelector('.gradio-container');
      if (folderTree) {
        iframeDocument.body.innerHTML = '';
        iframeDocument.body.appendChild(folderTree);
      }

      // 优化样式
      const style = iframeDocument.createElement('style');
      style.textContent = `
        body { margin: 0; overflow: hidden; }
        .gradio-container { height: 100vh; }
      `;
      iframeDocument.head.appendChild(style);
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
