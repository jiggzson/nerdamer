const createWebpackConfig = require('../../webpack.config.js');

function languageEntries(language?: string): string[] {
	const config = createWebpackConfig(language === undefined ? {} : { language });
	return config.entry;
}

function activeLanguage(language?: string): string {
	const config = createWebpackConfig(language === undefined ? {} : { language });
	const definePlugin = config.plugins.find(
		(plugin: { definitions?: Record<string, string> }) => plugin.definitions?.NERDAMER_BUILD_LANGUAGE !== undefined
	);
	return JSON.parse(definePlugin.definitions.NERDAMER_BUILD_LANGUAGE);
}

describe('webpack language builds', () => {
	it('uses English only by default', () => {
		expect(languageEntries()).toEqual(['./src/index.ts']);
		expect(activeLanguage()).toEqual('eng');
	});

	it('includes one requested translation and makes it active', () => {
		expect(languageEntries('spa')).toEqual([
			'./src/api/languages/spa.ts',
			'./src/index.ts',
		]);
		expect(activeLanguage('spa')).toEqual('spa');
	});

	it('includes multiple comma-separated translations in request order', () => {
		expect(languageEntries('spa,fra')).toEqual([
			'./src/api/languages/spa.ts',
			'./src/api/languages/fra.ts',
			'./src/index.ts',
		]);
		expect(activeLanguage('spa,fra')).toEqual('spa');
	});

	it('accepts the whitespace-separated form produced by PowerShell', () => {
		expect(languageEntries('spa fra')).toEqual([
			'./src/api/languages/spa.ts',
			'./src/api/languages/fra.ts',
			'./src/index.ts',
		]);
	});

	it('ignores duplicate language selections', () => {
		expect(languageEntries('spa,fra,spa')).toEqual([
			'./src/api/languages/spa.ts',
			'./src/api/languages/fra.ts',
			'./src/index.ts',
		]);
	});

	it('includes every translated catalog for all and keeps English active', () => {
		expect(languageEntries('all')).toEqual([
			'./src/api/languages/spa.ts',
			'./src/api/languages/fra.ts',
			'./src/api/languages/deu.ts',
			'./src/api/languages/por.ts',
			'./src/api/languages/ita.ts',
			'./src/api/languages/nld.ts',
			'./src/index.ts',
		]);
		expect(activeLanguage('all')).toEqual('eng');
	});

	it('rejects all combined with an individual language', () => {
		expect(() => createWebpackConfig({ language: 'all,spa' })).toThrow(
			"Build language 'all' cannot be combined with individual languages."
		);
	});

	it('rejects unknown languages', () => {
		expect(() => createWebpackConfig({ language: 'spa,xyz' })).toThrow(
			"Unknown build language 'xyz'."
		);
	});

	it('rejects an empty language selection', () => {
		expect(() => createWebpackConfig({ language: ',' })).toThrow(
			'Build language cannot be empty.'
		);
	});
});
