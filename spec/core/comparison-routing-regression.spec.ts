import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import { equal, gt, gte, lt, lte, proveZeroRelation } from '../../src/core/classes/parser/operations/compare';
import { Expression } from '../../src/core/classes/expression/Expression';
import '../../src/index';

describe('comparison routing regression', () => {
	afterEach(() => clearAssumptions());

	it('keeps opposite strict comparisons consistent for exact rationals', () => {
		const pairs: Array<[string, string]> = [
			['7/11', '5/8'],
			['0.95424250943000000000000000000002', '0.95424250943000000000000000000001'],
			['2^(1/3)*3^(1/3)', '5^(1/3)'],
		];
		for (const [left, right] of pairs) {
			expect(gt(left, right)).toBe(lt(right, left));
			expect(gte(left, right)).toBe(lte(right, left));
		}
	});

	it.each([
		['sqrt(8)', '2*sqrt(2)'],
		['x+1', '1+x'],
	])('keeps equality distinct from strict ordering: %s = %s', (left, right) => {
		expect(equal(left, right)).toBe(true);
		expect(gt(left, right)).toBe(false);
		expect(lt(left, right)).toBe(false);
		expect(gte(left, right)).toBe(true);
		expect(lte(left, right)).toBe(true);
	});

	it('preserves ordering for equivalent rational-power products', () => {
		// Ordering is established independently of the public equality check.
		const left = '2^(1/3)*3^(1/3)';
		const right = '6^(1/3)';
		expect(gt(left, right)).toBe(false);
		expect(lt(left, right)).toBe(false);
		expect(gte(left, right)).toBe(true);
		expect(lte(left, right)).toBe(true);
	});

	it('preserves reflexive ordering of a symbolic variable', () => {
		expect(gt('x', 'x')).toBe(false);
		expect(lt('x', 'x')).toBe(false);
		expect(gte('x', 'x')).toBe(true);
		expect(lte('x', 'x')).toBe(true);
	});

	it('shares assumption dispatch between equality and ordering', () => {
		assume('x=5');
		expect(equal('x', '5')).toBe(true);
		expect(gte('x', '5')).toBe(true);
		expect(lte('x', '5')).toBe(true);
		expect(gt('x', '5')).toBe(false);
		expect(lt('x', '5')).toBe(false);
	});

	it('does not turn an unresolved exact power comparison into a numeric proof', () => {
		// Clearing exponents beyond the exact-power limit must not use rounded values.
		expect(gt('2^(1/65)', '3^(1/65)')).toBe(false);
		expect(lt('2^(1/65)', '3^(1/65)')).toBe(false);
		expect(gte('2^(1/65)', '3^(1/65)')).toBe(false);
		expect(lte('2^(1/65)', '3^(1/65)')).toBe(false);
	});

	it('preserves unknown signs rather than claiming them', () => {
		expect(proveZeroRelation(Expression.create('x-5'), 'gt')).toBeUndefined();
		expect(gt('x', '5')).toBe(false);
		expect(lt('x', '5')).toBe(false);
	});

	it('preserves exact signs derived from numeric assumptions', () => {
		assume('x>5');
		expect(proveZeroRelation(Expression.create('2*x-10'), 'gt')).toBe(true);
		expect(gt('2*x+3', '13')).toBe(true);
		expect(lt('13', '2*x+3')).toBe(true);
	});

	it('preserves non-strict comparisons at assumption boundaries', () => {
		assume('x>=5');
		expect(gte('2*x+3', '13')).toBe(true);
		expect(lte('13', '2*x+3')).toBe(true);
		expect(proveZeroRelation(Expression.create('x-5'), 'gt')).toBeUndefined();
	});
});
