import { Expression } from '../../src/api/core';
import { Parser } from '../../src/api/parser';

import type { Language } from '../../src/api/parser';

describe('public parser settings types', () => {
	it('returns the value type associated with each setting key', () => {
		const evaluate: boolean = Parser.get('EVALUATE');
		const indexBase: number = Parser.get('INDEX_BASE');
		const maxFracInt: bigint = Parser.get('MAX_FRAC_INT');
		const language: Language = Parser.get('LANGUAGE');
		const createdIndexBase: number = Parser.create().get('INDEX_BASE');

		expect(typeof evaluate).toBe('boolean');
		expect(typeof indexBase).toBe('number');
		expect(typeof maxFracInt).toBe('bigint');
		expect(typeof language).toBe('string');
		expect(typeof createdIndexBase).toBe('number');
	});

	it('accepts supported key/value pairs and partial settings objects', () => {
		const previousEvaluate = Parser.get('EVALUATE');
		const previousIndexBase = Parser.get('INDEX_BASE');
		const previousLanguage = Parser.get('LANGUAGE');

		try {
			Parser.set('EVALUATE', !previousEvaluate);
			Parser.set({
				INDEX_BASE: previousIndexBase === 0 ? 1 : 0,
				LANGUAGE: previousLanguage,
			});

			expect(Parser.get('EVALUATE')).toBe(!previousEvaluate);
			expect(Parser.get('INDEX_BASE')).toBe(previousIndexBase === 0 ? 1 : 0);
		} finally {
			Parser.set({
				EVALUATE: previousEvaluate,
				INDEX_BASE: previousIndexBase,
				LANGUAGE: previousLanguage,
			});
		}
	});

	it('limits scopedBlock to Boolean parser settings', () => {
		const previousEvaluate = Parser.get('EVALUATE');
		const result = Parser.scopedBlock('EVALUATE', !previousEvaluate, () => {
			expect(Parser.get('EVALUATE')).toBe(!previousEvaluate);
			return Expression.create(1);
		});

		expect(result.text()).toBe('1');
		expect(Parser.get('EVALUATE')).toBe(previousEvaluate);
	});

	if (false) {
		Parser.set({ MAX_FRAC_INT: 1000n });
		// @ts-expect-error EVALUATE accepts Boolean values only.
		Parser.set('EVALUATE', 1);
		// @ts-expect-error INDEX_BASE accepts numeric values only.
		Parser.set('INDEX_BASE', false);
		// @ts-expect-error Unknown names are not part of the supported Parser facade.
		Parser.set('NOT_A_SETTING', true);
		// @ts-expect-error scopedBlock only accepts Boolean parser settings.
		Parser.scopedBlock('INDEX_BASE', true, () => Expression.create(1));
	}
});
