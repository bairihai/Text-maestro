import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"

import "@arco-design/web-react/dist/css/arco.css"; // 引入arco的样式文件

import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

import { NavBar } from './components/Navbar'

function App(): JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
    <Router>

      <NavBar/>

      <div className="ml-12 flex flex-col items-center justify-center h-full">
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
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

      </Router>
    </>
  )
}

export default App
