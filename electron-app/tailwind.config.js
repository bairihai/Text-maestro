/** @type {import('tailwindcss').Config} */

module.exports = {
  mode: 'jit',
  content: ['./index.html',"./src/**/*.{html,js,jsx,tsx}"],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [],
}

// 经核查，tailwindcss.config.js就是放在root文件夹下。参考：https://github.com/appinteractive/electron-vite-tailwind-starter