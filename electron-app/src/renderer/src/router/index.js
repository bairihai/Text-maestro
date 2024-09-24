// router/index.js
import About from '@renderer/pages/about'
import Playground from '@renderer/pages/playground'
import Setting from '@renderer/pages/setting'
import routesCommon from './routesCommon'

// import routesForum from './routesForum'

import FolderTree from '@renderer/pages/features/foldertree'

const routes = [
  {
    path: "/",
    component: About
  },
  {
    path: "/about",
    component: About
  },
  {
    path: "/playground",
    component: Playground
  },
  {
    path: "/setting",
    component: Setting
  },
  // ...routesForum
  ...routesCommon
];

export default routes