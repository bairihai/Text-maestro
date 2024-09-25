// 文件命名中间应该驼峰的，改不了了，回头吧。

// 2024年9月25日 10点09分 【猜想】
// 不是flex-grow的问题。我梳理了一下逻辑，得先写一个把整个页面铺满的元素，所有元素嵌套在这里面
// 不然ml-12（app.tsx里面）逻辑会出问题，原本预留给menu-demo-round的空间会右移，致使这里的
// iframe左侧出现一个空位。

import React, { useEffect, useRef } from 'react';

const FolderTree: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const iframeDocument = iframe.contentDocument;
      if (!iframeDocument) return;

      const script = iframeDocument.createElement('script');
      script.textContent = `
        const targetElement = document.querySelector('.gradio-container');
        if (targetElement) {
          while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
          }
          document.body.appendChild(targetElement);
        }
      `;
      iframeDocument.head.appendChild(script);
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, []);

  return (
    <div id="webview" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        src="http://localhost:7860"
        style={{
        //   position: 'absolute',
        //   top: 0,
        //   left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  );
};

export default FolderTree;

// 对于当前页面，重复一个操作：删除div id=webview里面所有的id 不等于folder-tree-section 的div
function cleanWebview() {
  const webview = document.getElementById('webview');
  if (!webview) return;

  const divsToRemove = webview.querySelectorAll('div:not(#folder-tree-section)');
  divsToRemove.forEach(div => div.remove());
}

// 定期执行清理操作
setInterval(cleanWebview, 1000); // 每秒执行一次
