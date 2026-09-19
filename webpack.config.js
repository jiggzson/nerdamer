const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const BUILD_TARGETS = {
	full: {
		entry: './src/index.ts',
		filename: 'bundle.js',
		library: {
			name: 'nerdamer',
			type: 'umd',
			export: 'default',
		},
	},
	parser: {
		entry: './src/api/parser.ts',
		filename: 'parser.js',
		library: {
			name: 'nerdamerParser',
			type: 'umd',
		},
	},
};

module.exports = env => {
	const targetName = env?.target ?? 'full';
	const target = BUILD_TARGETS[targetName];

	if (!target) {
		throw new Error(
			`Unknown build target '${targetName}'. Expected one of: ${Object.keys(BUILD_TARGETS).join(', ')}`
		);
	}

	const config = {
		entry: target.entry,
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: target.filename,
			globalObject: 'this',
			library: target.library,
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

	config.mode = isProduction ? 'production' : 'development';
	return config;
};
