import React from 'react';
import { Input } from '@arco-design/web-react';
// import '@arco-design/web-react/dist/css/arco.css'; // 引入arco样式
// 不需要，我已经在app页面引入了arco css
// import './index.less'; // 如果需要自定义样式，可以取消注释

import { useSelector } from 'react-redux';

function Playground() {
  const appName = useSelector((state: any) => state.global.appName);
  console.log('appName = ', appName);
  return (
    <div className="p-4"> {/* 使用tailwind的padding类 */}
      <Input placeholder="请输入内容" className="w-full" /> {/* 使用arco的Input组件 */}
    </div>
  );
}

export default Playground;