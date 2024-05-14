const path = require('path');
const webpack = require('webpack');
const baseConfig = require('./webpack.base.js');
const webpackMerge = require('webpack-merge');

const mainConfig = {
  entry: path.resolve(__dirname, '../app/main/electron.js'),
  target: 'electron-main',
  output: {
    filename: 'electron.js',
    path: path.resolve(__dirname, '../dist'),
  },

  // 尝试配置css loader
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          'style-loader', // 将 CSS 注入到 DOM 中
          'css-loader',   // 解析 CSS 文件
          'less-loader'   // 编译 Less 为 CSS
        ]
      }
    ]
  },

  devtool: 'inline-source-map',
  mode: 'development',
};

module.exports = webpackMerge.merge(baseConfig, mainConfig);