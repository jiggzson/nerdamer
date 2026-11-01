import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { toCommonDenominator } from '../../src/core/functions/rationalNormalization';

describe('Rational denominator reuse', () => {
	it('combines overlapping denominator factors without squaring them', () => {
		const expression = Expression.create('1/(x*(x+1))+1/((x+1)*(x+2))');
		const normalized = toCommonDenominator(expression);
		expect(normalized.evaluate({ x: 2 }).text()).toBe('1/4');
		expect(normalized.getDenominator().expand().text()).toBe('2*x+3*x^2+x^3');
	});

	it('reuses multiple shared factors in one combination', () => {
		const expression = Expression.create('1/(x*(x+1)*(x+2))+1/(x*(x+1)*(x+3))');
		const normalized = toCommonDenominator(expression);
		expect(normalized.evaluate({ x: 1 }).text()).toBe('7/24');
	});

	it('reuses repeated factors only to their common power', () => {
		const expression = Expression.create('1/(x^3*(x+1)^2)+1/(x^2*(x+1)^4)');
		const normalized = toCommonDenominator(expression);
		expect(normalized.evaluate({ x: 1 }).text()).toBe('5/16');
	});

	it('preserves nonzero rational expressions with polynomial numerators', () => {
		const expression = nerdamer('1/(x*(x+1))+1/((x+1)*(x+2))');
		const simplified = expression.simplify();
		expect(simplified.evaluate({ x: 2 }).text()).toBe('1/4');
		expect(simplified.text()).not.toBe('0');
	});

	it('preserves a long nonzero rational sum', () => {
		const count = 40;
		const terms = Array.from({ length: count }, (_, index) =>
			`1/((x+${index})*(x+${index + 1}))`);
		const expression = Expression.create(terms.join('+'));
		const normalized = toCommonDenominator(expression);
		expect(normalized.evaluate({ x: 1 }).text()).toBe('40/41');
	});

	it('preserves powers on long rational sums', () => {
		const count = 40;
		const terms = Array.from({ length: count }, (_, index) =>
			`1/((x+${index})*(x+${index + 1}))`);
		const expression = Expression.create(`(${terms.join('+')})^2`);
		const normalized = toCommonDenominator(expression);
		expect(normalized.evaluate({ x: 1 }).text()).toBe('1600/1681');
	});


	it('preserves decimal coefficients in long rational sums', () => {
		const terms = Array.from({ length: 40 }, (_, index) =>
			`1/((x+${index})*(x+${index + 1}))`);
		const expression = Expression.create(`${terms.join('+')}+0.5/(x+1)`);
		const normalized = toCommonDenominator(expression);
		expect(normalized.evaluate({ x: 1 }).eq(Expression.create('201/164'))).toBe(true);
		expect(normalized.hasDecimal()).toBe(true);
	});

	it('preserves reciprocal powers on long rational sums', () => {
		const terms = Array.from({ length: 40 }, (_, index) =>
			`1/((x+${index})*(x+${index + 1}))`);
		const expression = Expression.create(`(${terms.join('+')})^(-1)`);
		expect(toCommonDenominator(expression).evaluate({ x: 1 }).text()).toBe('41/40');
	});

	it('preserves long sums with different symbolic denominators', () => {
		const terms = Array.from({ length: 40 }, (_, index) =>
			`1/(x+${index + 1})`);
		const expression = Expression.create(`${terms.join('+')}+1/(y+1)`);
		const normalized = toCommonDenominator(expression);
		const original = expression.evaluate({ x: 2, y: 3 });
		expect(normalized.evaluate({ x: 2, y: 3 }).text()).toBe(original.text());
	});

	it('retains exact cancellation across a rational telescoping sum', () => {
		const count = 20;
		const terms = Array.from({ length: count }, (_, k) =>
			`1/((x+${k})*(x+${k+1}))`);
		const expression = nerdamer(`(${terms.join('+')})-${count}/(x*(x+${count}))`);
		expect(expression.simplify().text()).toBe('0');
	});
});
