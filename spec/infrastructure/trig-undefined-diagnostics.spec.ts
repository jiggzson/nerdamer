import '../../src/api/languages/spa';
import '../../src/api/languages/fra';
import '../../src/api/languages/deu';
import '../../src/api/languages/por';
import '../../src/api/languages/ita';
import '../../src/api/languages/nld';

import { Expression } from '../../src/core/classes/expression/Expression';
import { EnglishErrorMessages, ErrorMessages, message, type Language } from '../../src/core/errors';
import { Settings } from '../../src/core/Settings';
import { atan2, atanh } from '../../src/math/trig';

describe('localized inverse-trigonometric undefined diagnostics', () => {
	const previousLanguage = Settings.LANGUAGE;
	const languages: Language[] = ['eng', 'spa', 'fra', 'deu', 'por', 'ita', 'nld'];

	afterEach(() => { Settings.LANGUAGE = previousLanguage; });

	it.each(languages)('reports the correct undefined inputs in %s', language => {
		Settings.LANGUAGE = language;
		expect(() => atanh(1)).toThrow(message('atanhUndefined'));
		expect(atanh(0).isZero()).toBe(true);
		expect(() => atan2(0, 0)).toThrow(message('atan2Undefined'));
		expect(() => atan2(Expression.Inf(), Expression.Inf())).toThrow(message('atan2InfiniteArguments'));
		expect(() => atan2(Expression.Inf().neg(), Expression.Inf())).toThrow(message('atan2InfiniteArguments'));
		expect(message('atanhUndefined')).toContain('1');
		expect(message('atan2InfiniteArguments')).not.toBe(message('atan2Undefined'));
	});

	it('maintains catalog key and placeholder parity', () => {
		const keys = Object.keys(EnglishErrorMessages).sort();
		for (const language of languages) {
			const catalog = ErrorMessages[language];
			expect(catalog).toBeDefined();
			expect(Object.keys(catalog ?? {}).sort()).toEqual(keys);
			const params = (value: string) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
			for (const key of keys) {
				expect(params(catalog?.[key as keyof typeof EnglishErrorMessages] ?? '')).toEqual(
					params(EnglishErrorMessages[key as keyof typeof EnglishErrorMessages])
				);
			}
		}
	});
});
