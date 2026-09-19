import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Complex-number invariants', () => {
	describe('principal values and integer powers', () => {
		// Regression: https://github.com/jiggzson/nerdamer/issues/685
		it('uses the correct sign for exp(-i*pi/2)', () => {
			expect(nerdamer('exp(-2*i*pi*1/4)').text()).toEqual('-i');
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/656
		it('evaluates i^i to the principal real value exp(-pi/2)', () => {
			const actual = Number(nerdamer('i^i').evaluate().text({ decimal: true }));
			const expected = Number(nerdamer('exp(-pi/2)').evaluate().text({ decimal: true }));
			expect(Math.abs(actual - expected)).toBeLessThan(1e-14);
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/405
		it('preserves signs and magnitudes for integer powers of imaginary terms', () => {
			const cases = [
				['i^0', '1'],
				['i^1', 'i'],
				['i^2', '-1'],
				['i^3', '-i'],
				['i^4', '1'],
				['i^5', 'i'],
				['i^6', '-1'],
				['i^7', '-i'],
				['i^8', '1'],
				['i^(-1)', '-i'],
				['i^(-2)', '-1'],
				['i^(-3)', 'i'],
				['i^(-4)', '1'],
				['(-i)^1', '-i'],
				['(-i)^2', '-1'],
				['(-i)^3', 'i'],
				['(-i)^4', '1'],
				['(-3*i)^1', '-3*i'],
				['(-3*i)^2', '-9'],
				['(-3*i)^3', '27*i'],
				['(-3*i)^4', '81'],
				['(-3*i)^5', '-243*i'],
				['(2/3*i)^2', '-4/9'],
				['(2/3*i)^3', '(-8/27)*i'],
				['(-2/3*i)^2', '-4/9'],
				['(-2/3*i)^3', '(8/27)*i'],
				['(-3*i)^(-1)', '(1/3)*i'],
				['(-3*i)^(-3)', '(-1/27)*i'],
				['(-2*x)^3', '-8*x^3'],
				['(-2*x)^4', '16*x^4'],
			];

			for (const [input, expected] of cases) {
				expect(nerdamer(input).text()).toEqual(expected);
			}
		});
	});

	describe('complex arithmetic invariants', () => {
		it('does not expose the imaginary unit as a free variable', () => {
			expect(Expression.create('i').variables()).toEqual([]);
			expect(Expression.create('x+i').variables()).toEqual(['x']);

			const solution = nerdamer.solve('(3+i)*x=5');
			expect(solution.elements).toHaveLength(1);
			expect(
				Expression.create('(3+i)*x-5', { x: solution.elements[0] }).isNearlyZero()
			).toBe(true);
		});

		it('decomposes principal powers of the imaginary unit consistently', () => {
			const cases = [
				['i^(1/2)', '(1/2)*2^(1/2)', '(1/2)*2^(1/2)'],
				['(-i)^(1/2)', '(1/2)*2^(1/2)', '(-1/2)*2^(1/2)'],
				['i^(3/2)', '(-1/2)*2^(1/2)', '(1/2)*2^(1/2)'],
				['(-i)^(3/2)', '(-1/2)*2^(1/2)', '(-1/2)*2^(1/2)'],
			];

			for (const [input, real, imaginary] of cases) {
				const actual = Expression.create(input);
				expect(actual.realPart().text()).toEqual(real);
				expect(actual.imagPart().text()).toEqual(imaginary);
			}
		});

		it('does not collapse unevaluated complex functions to zero components', () => {
			const value = Expression.create('sin(i)');
			const real = value.realPart();
			const imaginary = value.imagPart();

			expect(real.isZero() && imaginary.isZero()).toBe(false);
		});

		it('preserves conjugates of powers with an unknown branch-cut position', () => {
			expect(nerdamer('conjugate((-x)^(1/2))').text()).toEqual(
				'conjugate((-x)^(1/2))'
			);
		});

		it('preserves function terms without complex inputs during decomposition', () => {
			const value = Expression.create('cbrt(a)+i*b');
			const expectedReal = Expression.create('cbrt(a)');

			expect(value.realPart().minus(expectedReal).text()).toEqual('0');
			expect(value.imagPart().minus(Expression.create('b')).text()).toEqual('0');
		});

		it('decomposes products containing unevaluated complex factors', () => {
			const value = Expression.create('i*sin(i)');
			const expectedReal = Expression.create('-imagpart(sin(i))');
			const expectedImaginary = Expression.create('realpart(sin(i))');

			expect(value.realPart().minus(expectedReal).text()).toEqual('0');
			expect(value.imagPart().minus(expectedImaginary).text()).toEqual('0');
		});

		it('decomposes products containing multiple complex factors', () => {
			const left = Expression.create('sin(i)');
			const right = Expression.create('cos(i)');
			const value = Expression.create('sin(i)*cos(i)');
			const expectedReal = left
				.realPart()
				.times(right.realPart())
				.minus(left.imagPart().times(right.imagPart()));
			const expectedImaginary = left
				.realPart()
				.times(right.imagPart())
				.plus(left.imagPart().times(right.realPart()));

			expect(value.realPart().minus(expectedReal).text()).toEqual('0');
			expect(value.imagPart().minus(expectedImaginary).text()).toEqual('0');
		});

		it('preserves real scaling around unevaluated complex factors', () => {
			expect(Expression.create('x*realpart(sin(i))').isComplex()).toBe(false);
			expect(Expression.create('x*imagpart(sin(i))').isComplex()).toBe(false);

			const cases = [
				['x*sin(i)', 'x*realpart(sin(i))', 'x*imagpart(sin(i))'],
				['(3/2)*x*sin(i)', '(3/2)*x*realpart(sin(i))', '(3/2)*x*imagpart(sin(i))'],
			];

			for (const [input, real, imaginary] of cases) {
				const value = Expression.create(input);
				const expectedReal = Expression.create(real);
				const expectedImaginary = Expression.create(imaginary);

				expect(value.realPart().minus(expectedReal).text()).toEqual('0');
				expect(value.imagPart().minus(expectedImaginary).text()).toEqual('0');
			}
		});

		it('does not guess the sign of a symbolic imaginary component', () => {
			expect(nerdamer('arg(a*i)').text()).toEqual('atan2(a, 0)');
			expect(nerdamer('arg(-a*i)').text()).toEqual('atan2(-a, 0)');
			expect(nerdamer('arg(3*i)').text()).toEqual('(1/2)*pi');
			expect(nerdamer('arg(-3*i)').text()).toEqual('(-1/2)*pi');
		});

		it('keeps exact Gaussian rational arithmetic exact', () => {
			const cases = [
				['(1/2+(2/3)*i)+(3/4-(5/6)*i)', '5/4', '-1/6'],
				['(1/2+(2/3)*i)-(3/4-(5/6)*i)', '-1/4', '3/2'],
				['(1/2+(2/3)*i)*(3/4-(5/6)*i)', '67/72', '1/12'],
				['(1/2+(2/3)*i)/(3/4-(5/6)*i)', '-26/181', '132/181'],
			];

			for (const [input, real, imaginary] of cases) {
				const actual = Expression.create(input);
				expect(actual.realPart().text()).toEqual(real);
				expect(actual.imagPart().text()).toEqual(imaginary);
			}
		});
	});

	describe('Gaussian arithmetic and complex functions', () => {

		// Regression: https://github.com/jiggzson/nerdamer/issues/181
		it('expands exact Gaussian squares correctly', () => {
			const cases = [
				['(1+i)^2', '0', '2'],
				['(-1+i)^2', '0', '-2'],
				['(1-i)^2', '0', '-2'],
				['(-1-i)^2', '0', '2'],
				['(2+3*i)^2', '-5', '12'],
				['(2-3*i)^2', '-5', '-12'],
				['(1/2+(2/3)*i)^2', '-7/36', '2/3'],
			];

			for (const [input, real, imaginary] of cases) {
				const actual = Expression.create(nerdamer(input).expand().text());
				expect(actual.realPart().text()).toEqual(real);
				expect(actual.imagPart().text()).toEqual(imaginary);
			}
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/181
		it('does not apply real known-value inverse-trig shortcuts to i', () => {
			expect(nerdamer('asin(i)').text()).not.toEqual('pi/2');
			expect(nerdamer('acos(i)').text()).not.toEqual('0');
			expect(nerdamer('atan(i)').text()).not.toEqual('pi/4');
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/181
		it('evaluates tan(i) through the complex identity i*tanh(1)', () => {
			const actual = Expression.create('tan(i)').evaluate();
			const expected = Expression.create('i*tanh(1)').evaluate();
			expect(actual.minus(expected).evaluate().isNearlyZero()).toBe(true);
		});
	});
});

describe('Complex invariant regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/174
	it('returns identical complex arguments from min and max', () => {
		expect(nerdamer('min(i,i)').text()).toEqual('i');
		expect(nerdamer('max(i,i)').text()).toEqual('i');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/181
	it('does not expose an arbitrary total ordering for complex numbers', () => {
		expect(() => nerdamer('(1+i)<(2+i)')).toThrow();
		expect(() => nerdamer('(1+i)>(2+i)')).toThrow();
		expect(() => nerdamer('(1+i)<=(2+i)')).toThrow();
		expect(() => nerdamer('(1+i)>=(2+i)')).toThrow();
	});
});
