import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { round, scientific, significant } from '../../src/math/index';

describe('Significant figure rounding (legacy issue #330)', () => {
	it('rounds small scientific-notation values without rounding to zero', () => {
		expect(significant('1.23423534e-12', 3).eq(Expression.create('1.23e-12'))).toBe(true);
		expect(significant('-1.23423534e-12', 3).eq(Expression.create('-1.23e-12'))).toBe(true);
		expect(nerdamer('significant(1.23423534e-12,3)').eq(Expression.create('1.23e-12'))).toBe(true);
	});

	it('counts significant figures rather than decimal places', () => {
		expect(significant('12345', 3).eq(Expression.create('12300'))).toBe(true);
		expect(significant('0.009876', 2).eq(Expression.create('0.0099'))).toBe(true);
		expect(significant('9.999', 3).eq(Expression.create('10'))).toBe(true);
		expect(significant(0, 3).isZero()).toBe(true);
		expect(significant('-98765', 2).eq(Expression.create('-99000'))).toBe(true);
	});

	it('leaves round and scientific with their existing meanings', () => {
		expect(round('1.23423534e-12', 2).isZero()).toBe(true);
		expect(round('2.555', 2).eq(Expression.create('2.56'))).toBe(true);
		expect(scientific('1.23423534e-12', 3).eq(Expression.create('1.23423534e-12'))).toBe(true);
	});

	it('validates digit counts', () => {
		expect(() => significant(1234, 0)).toThrow();
		expect(() => significant(1234, -1)).toThrow();
		expect(() => significant(1234, '1/2')).toThrow();
		expect(() => significant(1234, 'n')).toThrow();
	});

	it('preserves symbolic calls and rounds complex components separately', () => {
		expect(significant('x', 3).text()).toEqual('significant(x, 3)');
		expect(significant('1.234+5.678*i', 2).eq(Expression.create('1.2+5.7*i'))).toBe(true);
	});
});
