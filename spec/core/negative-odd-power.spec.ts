import '../helpers/registerNerdamerFunctions';
import { diff } from '../../src/calculus/derivative/diff';
import { integrate } from '../../src/calculus/integrate/integrate';
import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at, y: 1.3 }).text({ decimal: true }));
}

describe('A negative base to an odd integer power', () => {
	it.each([
		['-x^2', 3, '-x^6'],
		['-sqrt(x)', 3, '-x^(3/2)'],
		['-x^3', 5, '-x^15'],
		['-x^2', -3, '-x^-6'],
		['-2*x^2', 3, '-8*x^6'],
		['-cos(2*x)', 3, '-cos(2*x)^3'],
		['-cos(x)^2', 3, '-cos(x)^6'],
		['-cos(x)', -3, '-cos(x)^-3'],
		['-x*y', 3, '-x^3*y^3'],
	])('gives (%s)^%i as %s', (base, power, expected) => {
		const result = Expression.create(`(${base})^(${power})`);
		expect(result.minus(Expression.create(expected)).expand().isZero()).toBe(true);
		expect(result.isEXP()).toBe(false);
		expect(valueAt(result, 0.7)).toBeCloseTo(
			valueAt(Expression.create(base), 0.7) ** power,
			12
		);
	});

	it('expands a power of a sum with a negative term', () => {
		expect(nerdamer('expand((1-x^2)^3)').text()).toBe('1-3*x^2+3*x^4-x^6');
		expect(nerdamer('(-x^2)^3+x^6').text()).toBe('0');
	});

	it.each([['(-cos(x))^(1/2)'], ['(-cos(x))^(1/3)'], ['(-x)^(1/2)']])(
		'keeps the principal branch of %s',
		source => {
			expect(Expression.create(source).isEXP()).toBe(true);
		}
	);

	it.each([['sin(x)^6'], ['sin(x)^8'], ['sin(2*x)^6'], ['(-cos(2*x))^3'], ['(-sin(x))^5']])(
		'integrates %s',
		source => {
			const result = integrate(source, 'x');
			expect(result.hasFunction('integrate', true)).toBe(false);
			const derivative = diff(result, 'x');
			for (const x of [-1.3, 0.4, 2.1]) {
				expect(valueAt(derivative, x)).toBeCloseTo(
					valueAt(Expression.create(source), x),
					10
				);
			}
		}
	);
});
