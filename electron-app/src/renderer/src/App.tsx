// 路由部分
import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom"
import routes from '../src/router'

import "@arco-design/web-react/dist/css/arco.css"; // 引入arco的样式文件


import { NavBar } from './components/Navbar'


import store from './store';
import { Provider } from 'react-redux';
// 经过 createStore 生成的 store 挂载到 react-redux 提供的 Provider 组件上
// Provider 的工作任务是：通过 context 向子组件提供 store。


function App(): JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
       <Provider store={store}>
      <Router>

        <NavBar />

        <div className="ml-12"> {/* 添加 ml-12 类，为左侧的navbar留出空间。暂时写死，想活可以用css变量。 */}
        <Routes>
          {
            routes.map(route => <Route key={route.path} path={route.path} element={<route.component />} />)
            // 视情况添加exact参数。这个能修部分匹配的问题。 ——2024年5月12日11点40分 // 用strict也有类似效果吧 ——2024年6月9日 05点07分 那个是react的事儿吧 ——2024年6月11日 07点50分
          }
        </Routes>
        </div>

      </Router>
      </Provider>
    </>
  )
}

export default App
