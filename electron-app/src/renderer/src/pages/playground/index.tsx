// 引入样式组件。arco的css文件于App.tsx中引入。
import React from 'react';
import { Input } from '@arco-design/web-react';

// 修改 redux 的值。在redux 官方文档提到：唯一改变 state 的方法就是触发 action。
// 通过 dispatch 发起一个 action 就能修改 state 值，但仔细一想，每个 state，都对应一个 action，
//  rc-redux-model提供一个 action API，只需记住一个 action，就能修改 state 的任意值。
import { useSelector, useDispatch } from 'react-redux';
import { setState } from '../../store/globalReducer'; // 引入 setState action


function Playground() {
  const appName = useSelector((state: any) => state.global.appName);
  const dispatch = useDispatch();

  const handleChange = (value: string) => {
    dispatch(setState({ appName: value }));
  };

  console.log('appName = ', appName);
  return (
    <div className="p-4"> {/* 使用tailwind的padding类 */}
      <Input
        placeholder="请输入内容"
        className="w-full"
        value={appName}
        onChange={handleChange} // 绑定 onChange 事件
      /> {/* 使用arco的Input组件 */}
    </div>
  );
}


export default Playground;