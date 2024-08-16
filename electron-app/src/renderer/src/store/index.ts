// renderer/store/index.ts
// 该文件主要引入我们所有的 model，经过 redux 的 API，导出一颗完整的数据状态树

import logger from 'redux-logger';
import { configureStore } from '@reduxjs/toolkit';
import globalReducer from './globalReducer'; // 假设 globalModel 导出的是 reducer

// 使用 configureStore 来创建 store
const store = configureStore({
    reducer: {
        global: globalReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

export default store;


// import RcReduxModel from 'rc-redux-model';
// import { createStore, applyMiddleware, combineReducers } from 'redux';

// // 👇 引入我们写好的 model
// import globalModel from './globalModel';

// // 👇 这里只需要调用 RcReduxModel 实例化一下得到最后的 reduxModel
// const reduxModel = new RcReduxModel([globalModel]);

// // 👇 无侵入式的使用 Redux，即使你写最原始的 reducer 也照样支持
// const reducerList = combineReducers(reduxModel.reducers);

// export default createStore(reducerList, applyMiddleware(reduxModel.thunk, logger));

