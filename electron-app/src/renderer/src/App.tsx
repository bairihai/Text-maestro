// 路由部分
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"
import routes from '../src/router'

import "@arco-design/web-react/dist/css/arco.css"; // 引入arco的样式文件


import { NavBar } from './components/Navbar'

function App(): JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <Router>

        <NavBar />

        <Routes>
          {
            routes.map(route => <Route key={route.path} path={route.path} element={<route.component />} />)
            // 视情况添加exact参数。这个能修部分匹配的问题。 ——2024年5月12日11点40分 // 用strict也有类似效果吧 ——2024年6月9日 05点07分 那个是react的事儿吧 ——2024年6月11日 07点50分
          }
        </Routes>

      </Router>
    </>
  )
}

export default App
