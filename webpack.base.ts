import projectConfig from './project.config';

import path from 'path';
import webpack from 'webpack';
import child_procss from 'child_process';
type config_t = { [key: string]: any };
const config: webpack.Configuration & config_t = {
    entry: {
        [projectConfig.moduleName]: path.resolve(__dirname, './src/index.ts')
    },
    // pack only
    output: {
        library: '[name]',
        // libraryTarget: "umd",
        // umdNamedDefine: true, // generate: `define('${moduleName}', [...], factory)`
        filename: '[name].js',
        path: path.resolve(__dirname, 'build')
    },
    // externals: ['@babel/polyfill', "core-js", "string_decoder"],
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: ['babel-loader', 'ts-loader']
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    plugins: [],
    devServer: {
        open: true,
        overlay: { warnings: false, errors: true },
        contentBase: 'build',
        host: 'localhost',
        index: 'index.html',
        port: projectConfig.port,
        disableHostCheck: true, // 解决有些环境(pad)下浏览器对host invalid错误
        stats: {
            // 过滤控制台编译信息
            assets: false
        }
    }
};

export default config;
