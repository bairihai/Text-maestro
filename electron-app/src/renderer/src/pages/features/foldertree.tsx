// 文件命名中间应该驼峰的，改不了了，回头吧。

// 2024年9月25日 10点09分 【猜想】
// 不是flex-grow的问题。我梳理了一下逻辑，得先写一个把整个页面铺满的元素，所有元素嵌套在这里面
// 不然ml-12（app.tsx里面）逻辑会出问题，原本预留给menu-demo-round的空间会右移，致使这里的
// iframe左侧出现一个空位。

// 2024年9月25日 14点36分 不要闹了
// 获取iframe中的dom对象，如果 iframe 和 iframe 的父文档是同源，则返回 一个 Document
// （即内嵌框架的嵌套浏览上下文中的活动文档），否则返回null。
// 所以，没有任何方法可以用js获取iframe内部的dom对象。别试了，停手吧。
// 只能回到gradio里面下手，在里面写一个“一旦收到就触发”的清理脚本
// 然后在这里触发。

import React, { useEffect, useRef } from 'react';

const FolderTree: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // iframe加载完成后执行的函数
    const handleLoad = () => {
      console.log('iframe加载完成');
      const iframeDocument = iframe.contentDocument;
      if (!iframeDocument) return;

      // 注入脚本以清理iframe内容.删除div id=webview里面所有的id 不等于folder-tree-section 的div
      const script = iframeDocument.createElement('script');
      script.textContent = `
        console.log('开始清理iframe内容');
        const targetElement = document.querySelector('.gradio-container');
        if (targetElement) {
          console.log('将保留的元素:', targetElement);
          console.log('即将被移除的元素:', Array.from(document.body.children).filter(child => child !== targetElement));
          while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
          }
          document.body.appendChild(targetElement);
        } else {
          console.log('未找到.gradio-container元素');
        }
          
        console.log('iframe内容清理完成');
      `;
      iframeDocument.head.appendChild(script);
    };

    iframe.addEventListener('load', handleLoad);

    // 清理函数
    const cleanWebview = () => {
      const webview = document.getElementById('webview') as Electron.WebviewTag;
      if (!webview) {
        console.log('未找到webview元素');
        return;
      }

      webview.addEventListener('dom-ready', () => {
        webview.executeJavaScript(`
          const divsToRemove = document.querySelectorAll('div');
          console.log('需要移除的div数量:', divsToRemove.length);
          divsToRemove.forEach(div => div.remove());
          console.log('清理完成');
        `);
      });
    };

    // 设置定期执行清理操作
    const intervalId = setInterval(cleanWebview, 5000); // 每5秒执行一次

    // 组件卸载时的清理
    return () => {
      console.log('组件卸载，清理资源');
      iframe.removeEventListener('load', handleLoad);
      clearInterval(intervalId);
    };
  }, []);

//   useEffect(() => {
//     const folderTreeSection = document.getElementById('folder-tree-section');
//     if (folderTreeSection) {
//       console.log('找到 folder-tree-section:', folderTreeSection);
//     } else {
//       console.log('未找到 folder-tree-section 元素');
//     }
//   }, []);

  // 检查folder-tree-section元素是否存在，如果不存在，则每隔1秒检查一次，直到找到为止。
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const folderTreeSection = document.getElementById('folder-tree-section');
      if (folderTreeSection) {
        console.log('找到 folder-tree-section:', folderTreeSection);
        clearInterval(checkInterval);
      } else {
        console.log('未找到 folder-tree-section 元素');
      }
    }, 1000); // 每秒检查一次

    return () => clearInterval(checkInterval);
  }, []);

  return (
    // 位置是小问题，大不了我再嵌套一层。当务之急是删掉多余的内容。
    // 将网页引入。正文部分div的className="gradio-container"，这里是外围。
    <div id="webview" style={{ position: 'relative', width: '120%', height: '200%' }}>
      <iframe
        ref={iframeRef}
        src="http://localhost:7860"
        style={{
          width: '120%',
          height: '200%',
          border: 'none',
        }}
      />
    </div>
  );
};

export default FolderTree;
