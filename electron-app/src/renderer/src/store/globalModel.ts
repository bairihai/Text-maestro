// 该文件定义了全局状态的reducer，用于管理应用程序的全局状态，例如应用程序的名称等。
// 通过这个reducer，我们可以方便地修改和管理全局状态，从而影响应用程序的行为和界面。

// 引入 createSlice 和 PayloadAction 用于创建 reducer 和处理 action 的类型
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState = {
  appName: '简历应用平台',
  theme: 'light',
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    // 你可以在这里添加 reducers

    // 添加一个可以修改所有 state 的 action
    setState: (state, action: PayloadAction<Partial<typeof initialState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const { setState } = globalSlice.actions;
export const { reducer: globalReducer } = globalSlice;
export default globalReducer;