import merge from 'webpack-merge';
import baseWebpackConfig from './webpack.base';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const webpackConfig = merge(baseWebpackConfig, {
    mode: 'development',
    // webpack——devtool里的7种SourceMap模式
    // https://www.cnblogs.com/wangyingblog/p/7027540.html
    devtool: 'cheap-eval-source-map',
    plugins: [
        new CopyWebpackPlugin([
            {
                from: './example/*.*',
                to: './'
            }
        ])
    ]
});

module.exports = webpackConfig;
