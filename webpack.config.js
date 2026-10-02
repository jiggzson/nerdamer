const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
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
	const language = env?.language ?? 'eng';
	const supportedLanguages = ['eng', 'spa', 'fra', 'deu', 'por', 'ita', 'nld'];
	// PowerShell can pass an unquoted comma-separated native argument as a space-separated value.
	// Accept both forms while keeping the documented syntax `--env language=spa,fra`.
	const requestedLanguages = [
		...new Set(language.split(/[\s,]+/).map(value => value.trim()).filter(Boolean)),
	];

	if (requestedLanguages.length === 0) {
		throw new Error('Build language cannot be empty.');
	}
	if (requestedLanguages.includes('all') && requestedLanguages.length !== 1) {
		throw new Error("Build language 'all' cannot be combined with individual languages.");
	}
	const unknownLanguages = requestedLanguages.filter(
		value => value !== 'all' && !supportedLanguages.includes(value)
	);
	if (unknownLanguages.length) {
		throw new Error(
			`Unknown build language '${unknownLanguages[0]}'. Expected one or more of: ${supportedLanguages.join(', ')}, or all`
		);
	}
	const target = BUILD_TARGETS[targetName];

	if (!target) {
		throw new Error(
			`Unknown build target '${targetName}'. Expected one of: ${Object.keys(BUILD_TARGETS).join(', ')}`
		);
	}

	const languageEntries = {
		spa: './src/api/languages/spa.ts',
		fra: './src/api/languages/fra.ts',
		deu: './src/api/languages/deu.ts',
		por: './src/api/languages/por.ts',
		ita: './src/api/languages/ita.ts',
		nld: './src/api/languages/nld.ts',
	};
	const selectedLanguages = requestedLanguages.includes('all')
		? Object.keys(languageEntries)
		: requestedLanguages.filter(value => value !== 'eng');
	const selectedLanguageEntries = selectedLanguages.map(value => languageEntries[value]);
	const activeLanguage = requestedLanguages.includes('all')
		? 'eng'
		: selectedLanguages[0] ?? 'eng';

	const config = {
		entry: [...selectedLanguageEntries, target.entry],
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
							module: 'ESNext',
							moduleResolution: 'Bundler',
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
		plugins: [
			new webpack.DefinePlugin({
				NERDAMER_BUILD_LANGUAGE: JSON.stringify(activeLanguage),
			}),
		],
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
