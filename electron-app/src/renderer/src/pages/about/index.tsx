import React from 'react';
// import './index.less';

import Versions from '../../components/Versions'
import electronLogo from '../../assets/electron.svg'

function About(): JSX.Element {
  // window.electron 中的electron要与预加载脚本（preload contextBridge）中预留的字段'electron'对应
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Text-maestro with <span className="react">React</span>
        &nbsp;+ <span className="ts">TypeScript</span>
        &nbsp;+ <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4F576A] to-[#EBE5D8]">Tailwindcss</span>
      </div>
      <p className="tip">
        Please try pressing <code>Ctrl</code> + <code>Shift</code> + <code>I</code> to open the devTool
      </p>
      <p className="tip">
        <code>window.location.reload()</code> 以刷新页面
      </p>
      <p className="tip">
        <code>window.location.pathname</code> 查看当前router路径
      </p>
      <p className="tip">
        by 云都官能团@白日海
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions></Versions>
    </div>
  );
}

export default About;