import projectConfig from './project.config';

import merge from 'webpack-merge';
import baseWebpackConfig from './webpack.base';

import { Plugin } from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
const DtsBundleWebpack: IDtsBundleWebpack = require('dts-bundle-webpack');

// types for DtsBundleWebpack
interface IDtsBundleWebpack {
    new (options: { name: string; main: string; baseDir?: string; out?: string }): Plugin;
}

const webpackConfig = merge(baseWebpackConfig, {
    mode: 'production',
    // webpack——devtool里的7种SourceMap模式
    // https://www.cnblogs.com/wangyingblog/p/7027540.html
    devtool: 'cheap-module-source-map',
    plugins: [
        new CopyWebpackPlugin([
            {
                from: './example/*.*',
                to: './'
            }
        ]),
        new DtsBundleWebpack({
            name: projectConfig.moduleName,
            main: 'build/type/index.d.ts',
            baseDir: 'build',
            out: projectConfig.moduleName + '.d.ts'
        })
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    name: 'commons',
                    chunks: 'initial',
                    minChunks: 2
                }
            }
        }
    }
});

module.exports = webpackConfig;
