// renderer/container/root/index.tsx
import React from 'react';
import './index.less';

function Root() {
  return <div>我是首页</div>;
}
export default Root;

// 创建一个文件夹 container，该文件夹存放着所有模块的代码文件，
// 此时我们添加一个新文件夹，取名为：root，表明这是首页模块，并创建入口文件 index.tsx 和 index.less