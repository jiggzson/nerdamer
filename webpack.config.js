const path = require('path');

const config = {
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    performance: {
        maxAssetSize: 500000,
        maxEntrypointSize: 500000,
    }
};

module.exports = [
    {
        name: 'core',
        entry: path.resolve(__dirname, 'src/nerdamer.core.ts'),
        output: {
            filename: 'nerdamer.core.js',
            path: __dirname,
            library: {
                name: 'nerdamer',
                type: 'umd'
            }
        },
        ...config
    },
    {
        name: 'all',
        entry: path.resolve(__dirname, 'src/all.js'),
        output: {
            filename: 'all.min.js',
            path: __dirname,
            library: {
                name: 'nerdamer',
                type: 'umd'
            }
        },
        ...config
    }
];
