import '../../src/api/languages/spa';
import '../../src/api/languages/fra';
import '../../src/api/languages/deu';
import '../../src/api/languages/por';
import '../../src/api/languages/ita';
import '../../src/api/languages/nld';

import { EnglishErrorMessages, ErrorMessages, message, type Language } from '../../src/core/errors';
import { Settings } from '../../src/core/Settings';

describe('semantic localization consolidation', () => {
	const originalLanguage = Settings.LANGUAGE;
	const languages: Language[] = ['eng', 'spa', 'fra', 'deu', 'por', 'ita', 'nld'];
	afterEach(() => { Settings.LANGUAGE = originalLanguage; });

	it('keeps all seven catalogs aligned at 219 keys', () => {
		const expected = Object.keys(EnglishErrorMessages).sort();
		expect(expected).toHaveLength(219);
		for (const language of languages) {
			const catalog = ErrorMessages[language];
			expect(catalog).toBeDefined();
			expect(Object.keys(catalog ?? {}).sort()).toEqual(expected);
			for (const key of expected) {
				const placeholders = (value: string) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
				expect(placeholders(catalog?.[key as keyof typeof EnglishErrorMessages] ?? '')).toEqual(
					placeholders(EnglishErrorMessages[key as keyof typeof EnglishErrorMessages])
				);
			}
		}
	});

	it.each(languages)('interpolates consolidated diagnostic context in %s', language => {
		Settings.LANGUAGE = language;
		const cases = [
			['zeroDivisorForOperation', { operation: 'SparsePolynomial.divideExact' }],
			['groebnerBudgetExceeded', { metric: 'pairsPopped', max: '10' }],
			['controlFlowOutsideLoop', { keyword: 'break' }],
			['symbolicIndexCount', { target: 'Vector', count: '1' }],
			['integerSquareRootNonnegative', { operation: 'bigIntSqrt' }],
			['invertibleLeadingCoefficientRequired', { operation: 'ModularSparsePolynomial.monic' }],
			['arithModNormNonzeroModulus', { operation: 'modSymmetric' }],
			['arithModInvNoninvertible', { value: '7' }],
			['sparseCoefficientExponentNonNegative', { polynomial: 'SparsePolynomial' }],
			['sparseExponentNonNegative', { polynomial: 'ModularSparsePolynomial' }],
		] as const;
		for (const [key, values] of cases) {
			const rendered = message(key, values);
			expect(rendered).not.toContain('{{');
			expect(rendered).not.toContain('}}');
		}
	});
});
