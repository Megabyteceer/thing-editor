const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        //express: './index.js',
        editor: ["babel-polyfill", './public/index.js']
    },
    devtool: 'inline-source-map',
    devServer: {
        inline: false,
        host: '0.0.0.0',
        disableHostCheck: true,
        port: 5050,
        contentBase: false,
    },
    plugins: [
        new CleanWebpackPlugin(['dist']),
        new HtmlWebpackPlugin({
            title: 'Development'
        })
    ],
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                options: {
                    presets: [
                        ["env", {
                            "targets": {
                                "node": "current"
                            }
                        }]
                    ]
                }
            }
        ]
    },
    resolve: {
        modules: ['node_modules', 'public/engine/js', 'public/editor/js'],
    },
};
