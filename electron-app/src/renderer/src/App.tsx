// 1. 导入部分
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from 'react-redux';

import "@arco-design/web-react/dist/css/arco.css"; // 引入arco的样式文件

import { NavBar } from './components/Navbar'
import routes from './router'
import store from './store';
import { ThemeProvider } from './context/ThemeContext';

// 5. App 组件定义
function App(): JSX.Element {
  // 7. 渲染
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <NavBar />
          <div style={{ marginLeft: '48px', minHeight: '100vh' }}>
            <Routes>
              {
                routes.map(route => <Route key={route.path} path={route.path} element={<route.component />} />)
              }
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App