// Generated using webpack-cli https://github.com/webpack/webpack-cli

const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const { library, optimize } = require('webpack');

const isProduction = process.env.NODE_ENV == 'production';


const config = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        library: 'nerdamer',
        libraryTarget: 'umd'
    },
    plugins: [
        // Add your plugins here
        // Learn more about plugins from https://webpack.js.org/configuration/plugins/
    ],
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/i,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    resolve: {
        fallback: {
            fs: false
        },
        extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    mangle: {
                        // The function names from this file are read by buildFunction so stop Webpack
                        // from minimizing the function names.
                        reserved: [/core\/functions\/numeric\.ts$/],
                    },
                    keep_fnames: true, // Ensure function names are kept
                },
                include: /\.(js|ts)$/, // Apply to js and ts files
                exclude: /node_modules/,
            }),
        ],
    },
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';


    } else {
        config.mode = 'development';
    }
    return config;
};
