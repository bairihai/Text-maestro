// router/index.js
import About from '@renderer/pages/about'
import Playground from '@renderer/pages/playground'
import Setting from '@renderer/pages/setting'

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
//   {
//     path: "*",
//     component: NotFoundPage
//   }
];

export default routes