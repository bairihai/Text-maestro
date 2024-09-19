// 1. 导入部分
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';
import { useDispatch } from 'react-redux';
import { setState } from './store/globalModel';

import "@arco-design/web-react/dist/css/arco.css"; // 引入arco的样式文件


import { NavBar } from './components/Navbar'
import routes from './router'


import store from './store';
// 经过 createStore 生成的 store 挂载到 react-redux 提供的 Provider 组件上
// Provider 的工作任务是：通过 context 向子组件提供 store。

// 主题管理函数
const applyTheme = (theme: string) => {
  if (theme === 'dark') {
    document.body.setAttribute('arco-theme', 'dark');
  } else {
    document.body.removeAttribute('arco-theme');
  }
};

// 5. App 组件定义
function App(): JSX.Element {
  const [theme, setTheme] = useState<string>('light');

  // 6. 主题初始化 effect
  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-preferences', 'theme').then((savedTheme) => {
      const currentTheme = savedTheme || 'light';
      setTheme(currentTheme);
      applyTheme(currentTheme);
    });
  }, []);

  // 7. 渲染
  return (
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
  )
}

export default App
