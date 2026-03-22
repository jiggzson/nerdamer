'use strict';

import { equal, gt, gte, lt, lte } from '../../src/core/classes/parser/operations/compare';

describe('compare: equal', () => {
	it('should test for equality of expressions', () => {
		expect(equal('x', 'x')).toBe(true);
		expect(equal('x+1', '1+x')).toBe(true);
		expect(equal('x+5', 'x-5')).toBe(false);
		expect(equal('x^x', 'x^x')).toBe(true);
		expect(equal('x*y', 'x*y')).toBe(true);
		expect(equal('x*y^2', 'x*y')).toBe(false);
		expect(equal('2*(x+1)', '(x+1)')).toBe(false);
		expect(equal('(a+x*y)^2', '(a+x*y)^2')).toBe(true);

		// Known constant identities
		expect(equal('cos(pi)+1', '0')).toBe(true);

		// Power/product normalization
		expect(equal('x*x*x*x', 'x^4')).toBe(true);

		// Rational/power equivalence
		expect(equal('sqrt(3)/3', 'sqrt(3)*3^-1')).toBe(true);

		// Radical equivalences (canonicalization)
		expect(equal('sqrt(8)', '2*sqrt(2)')).toBe(true);
		expect(equal('2^(1/2)', 'sqrt(2)')).toBe(true);

		// Unary sign distribution
		expect(equal('-(x-1)', '1-x')).toBe(true);

		// Exact rational/decimal equality (if decimals are supported)
		expect(equal('0.5', '1/2')).toBe(true);
	});

	it('should detect equality for trig functions', () => {
		expect(equal('cos((1/2)*2^(1/2))', 'cos(2^(-1/2))')).toBe(true);
	});
});

describe('compare: gt/gte/lt/lte (basic numeric)', () => {
	it('gt should compare numeric values correctly', () => {
		expect(gt('5', '4')).toBe(true);
		expect(gt('5', '-4')).toBe(true);
		expect(gt('-5', '-4')).toBe(false);
		expect(gt('-5', '-5')).toBe(false);
	});

	it('gte should compare numeric values correctly', () => {
		expect(gte('5', '4')).toBe(true);
		expect(gte('5', '-4')).toBe(true);
		expect(gte('-5', '-4')).toBe(false);
		expect(gte('-5', '-5')).toBe(true);
	});

	it('lt should compare numeric values correctly', () => {
		expect(lt('5', '4')).toBe(false);
		expect(lt('5', '-4')).toBe(false);
		expect(lt('-5', '-4')).toBe(true);
		expect(lt('-5', '-5')).toBe(false);
	});

	it('lte should compare numeric values correctly', () => {
		expect(lte('5', '4')).toBe(false);
		expect(lte('5', '-4')).toBe(false);
		expect(lte('-5', '-4')).toBe(true);
		expect(lte('-5', '-5')).toBe(true);
	});
});

describe('compare: gt/gte/lt/lte (symbolic guardrails)', () => {
	it('should be reflexive for equality cases', () => {
		expect(gt('x', 'x')).toBe(false);
		expect(gte('x', 'x')).toBe(true);
		expect(lt('x', 'x')).toBe(false);
		expect(lte('x', 'x')).toBe(true);
	});

	it('should prove simple always-true inequalities', () => {
		expect(gt('x+1', 'x')).toBe(true);
		expect(gte('x+1', 'x')).toBe(true);

		expect(lt('x-1', 'x')).toBe(true);
		expect(lte('x-1', 'x')).toBe(true);

		// Equivalent form
		expect(lt('x', 'x+1')).toBe(true);
		expect(lte('x', 'x+1')).toBe(true);
		expect(gt('x', 'x+1')).toBe(false);
		expect(gte('x', 'x+1')).toBe(false);
	});

	it('should not assert inequalities that depend on unknown symbol values', () => {
		// Policy: comparisons that cannot be proven should return false
		expect(gt('x', '-4')).toBe(false);
		expect(gte('x', '-4')).toBe(false);
		expect(lt('x', '-4')).toBe(false);
		expect(lte('x', '-4')).toBe(false);

		// Depends on x
		expect(gt('x^2', 'x')).toBe(false);
		expect(lt('x^2', 'x')).toBe(false);
	});
});

describe('compare: radicals and exactness guardrails', () => {
	it('should order simple radicals correctly', () => {
		expect(gt('sqrt(3)', 'sqrt(2)')).toBe(true);
		expect(gte('sqrt(3)', 'sqrt(2)')).toBe(true);
		expect(lt('sqrt(3)', 'sqrt(2)')).toBe(false);
		expect(lte('sqrt(3)', 'sqrt(2)')).toBe(false);

		// equality / boundary cases
		expect(gt('sqrt(2)', 'sqrt(2)')).toBe(false);
		expect(gte('sqrt(2)', 'sqrt(2)')).toBe(true);
		expect(lt('sqrt(2)', 'sqrt(2)')).toBe(false);
		expect(lte('sqrt(2)', 'sqrt(2)')).toBe(true);
	});

	it('should treat equivalent radical forms as equal in ordering', () => {
		expect(equal('sqrt(8)', '2*sqrt(2)')).toBe(true);
		expect(gt('sqrt(8)', '2*sqrt(2)')).toBe(false);
		expect(gte('sqrt(8)', '2*sqrt(2)')).toBe(true);
		expect(lt('sqrt(8)', '2*sqrt(2)')).toBe(false);
		expect(lte('sqrt(8)', '2*sqrt(2)')).toBe(true);
	});

	it('should compare radicals against integers when decidable', () => {
		expect(equal('sqrt(4)', '2')).toBe(true);
		expect(gt('sqrt(5)', '2')).toBe(true);
		expect(lt('sqrt(2)', '2')).toBe(true);
	});
});

describe('compare: sign-of-difference guardrails', () => {
	it('should handle zero differences correctly', () => {
		expect(equal('x-x', '0')).toBe(true);
		expect(gt('x-x', '0')).toBe(false);
		expect(gte('x-x', '0')).toBe(true);
		expect(lt('x-x', '0')).toBe(false);
		expect(lte('x-x', '0')).toBe(true);
	});

	it('should satisfy basic comparator invariants for constants', () => {
		const pairs: Array<[string, string]> = [
			['5', '4'],
			['-5', '-4'],
			['sqrt(3)', 'sqrt(2)'],
			['sqrt(8)', '2*sqrt(2)'],
		];

		for (const [a, b] of pairs) {
			expect(gt(a, b)).toBe(lt(b, a));
			expect(gte(a, b)).toBe(lte(b, a));

			if (equal(a, b)) {
				expect(gte(a, b)).toBe(true);
				expect(lte(a, b)).toBe(true);
				expect(gt(a, b)).toBe(false);
				expect(lt(a, b)).toBe(false);
			}
		}
	});
});
