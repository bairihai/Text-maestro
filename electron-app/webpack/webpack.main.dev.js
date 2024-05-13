import path from 'path';
import webpack from 'webpack';
import baseConfig from './webpack.base.js';
import { webpackMerge } from 'webpack-merge';

const mainConfig = {
  entry: path.resolve(__dirname, '../app/main/electron.js'),
  target: 'electron-main',
  output: {
    filename: 'electron.js',
    path: path.resolve(__dirname, '../dist'),
  },
  devtool: 'inline-source-map',
  mode: 'development',
};

module.exports = webpackMerge.merge(baseConfig, mainConfig);