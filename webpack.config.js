const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const config = {
	entry: './src/index.ts',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
		globalObject: 'this',
		library: {
			name: 'nerdamer',
			type: 'umd',
		},
	},
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/i,
				loader: 'ts-loader',
				exclude: /node_modules/,
				options: {
					configFile: 'tsconfig.build.json',
					transpileOnly: true,
					compilerOptions: {
						declaration: false,
						declarationMap: false,
					},
				},
			},
			{
				test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
				type: 'asset',
			},
		],
	},
	resolve: {
		fallback: {
			fs: false,
		},
		extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					mangle: {
						reserved: [/core\/functions\/numeric\.ts$/],
					},
					keep_fnames: true,
				},
				include: /\.(js|ts)$/,
				exclude: /node_modules/,
			}),
		],
	},
};

module.exports = () => {
	config.mode = isProduction ? 'production' : 'development';
	return config;
};
