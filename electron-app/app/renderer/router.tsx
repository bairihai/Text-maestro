import React from 'react';
import { HashRouter, Route, Switch, Redirect } from 'react-router-dom';
import Root from './container/root';
import Document from './container/document';

// 暂不进行版本升级

function Router() {
  return (
    <HashRouter>
      <Switch>

        {/* 一定要添加 exact */}
        <Route path="/" exact>
          <Root />
        </Route>

        <Route path="/document" exact>
          <Document />
        </Route>

      </Switch>
      {/* 默认重定向到首页 */}
      <Redirect to="/" />
    </HashRouter>
  );
}

export default Router;