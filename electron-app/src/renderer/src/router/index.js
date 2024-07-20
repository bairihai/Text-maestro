// router/index.js
import About from '../pages/about'
import Playground from '../pages/playground'
import Setting from '../pages/setting'

const routes = [
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