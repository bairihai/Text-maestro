import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  appName: '简历应用平台',
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    // 你可以在这里添加 reducers
  },
});

export const { actions, reducer: globalReducer } = globalSlice;
export default globalReducer;