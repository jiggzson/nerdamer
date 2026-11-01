import '../../src/api/languages/spa';
import '../../src/api/languages/fra';
import '../../src/api/languages/deu';
import '../../src/api/languages/por';
import '../../src/api/languages/ita';
import '../../src/api/languages/nld';

import { EnglishErrorMessages, ErrorMessages, message, type Language } from '../../src/core/errors';
import { Settings } from '../../src/core/Settings';

describe('selective semantic error consolidation', () => {
	const previousLanguage = Settings.LANGUAGE;
	const languages: Language[] = ['eng', 'spa', 'fra', 'deu', 'por', 'ita', 'nld'];
	afterEach(() => { Settings.LANGUAGE = previousLanguage; });

	it.each(languages)('preserves context in %s', language => {
		Settings.LANGUAGE = language;
		for (const [key, values, context] of [
			['undefinedExpression', { expression: 'Infinity-Infinity' }, 'Infinity-Infinity'],
			['integerResultRequired', { operation: 'Wang.leadingEvaluation' }, 'Wang.leadingEvaluation'],
			['malformedInternalComponent', { component: 'SymbolicAccessor.index' }, 'SymbolicAccessor.index'],
		] as const) {
			const result = message(key, values);
			expect(result).toContain(context);
			expect(result).not.toContain('{{');
		}
	});

	it('keeps all catalog keys and placeholders aligned', () => {
		const keys = Object.keys(EnglishErrorMessages).sort();
		expect(keys).toHaveLength(219);
		const placeholders = (value: string) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
		for (const language of languages) {
			const catalog = ErrorMessages[language];
			expect(Object.keys(catalog ?? {}).sort()).toEqual(keys);
			for (const key of keys) {
				expect(placeholders(catalog?.[key as keyof typeof EnglishErrorMessages] ?? '')).toEqual(placeholders(EnglishErrorMessages[key as keyof typeof EnglishErrorMessages]));
			}
		}
	});
});
