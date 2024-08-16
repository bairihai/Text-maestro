import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState = {
  appName: '简历应用平台',
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