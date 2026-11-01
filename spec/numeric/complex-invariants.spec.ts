import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Complex-number behavior', () => {
	describe('principal values and integer powers', () => {
		// Regression: https://github.com/jiggzson/nerdamer/issues/685
		it('uses the correct sign for exp(-i*pi/2)', () => {
			expect(nerdamer('exp(-2*i*pi*1/4)').text()).toEqual('-i');
		});

		it('simplifies principal powers of the unit imaginary values exactly', () => {
			const cases = [
				['i^i', 'e^((-1/2)*pi)'],
				['(-i)^i', 'e^((1/2)*pi)'],
				['i^(-i)', 'e^((1/2)*pi)'],
				['(-i)^(-i)', 'e^((-1/2)*pi)'],
			];

			for (const [input, expected] of cases) {
				expect(nerdamer(input).eq(Expression.create(expected))).toBe(true);
			}
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

	describe('complex arithmetic and decomposition', () => {
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
			const value = Expression.create('erf(i)');
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
			const value = Expression.create('i*erf(i)');
			const expectedReal = Expression.create('-imagpart(erf(i))');
			const expectedImaginary = Expression.create('realpart(erf(i))');

			expect(value.realPart().minus(expectedReal).expand().text()).toEqual('0');
			expect(value.imagPart().minus(expectedImaginary).expand().text()).toEqual('0');
		});

		it('decomposes products containing multiple complex factors', () => {
			const left = Expression.create('erf(i)');
			const right = Expression.create('Ei(i)');
			const value = Expression.create('erf(i)*Ei(i)');
			const expectedReal = left
				.realPart()
				.times(right.realPart())
				.minus(left.imagPart().times(right.imagPart()));
			const expectedImaginary = left
				.realPart()
				.times(right.imagPart())
				.plus(left.imagPart().times(right.realPart()));

			expect(value.realPart().minus(expectedReal).expand().text()).toEqual('0');
			expect(value.imagPart().minus(expectedImaginary).expand().text()).toEqual('0');
		});

		it('preserves real scaling around unevaluated complex factors', () => {
			expect(Expression.create('x*realpart(erf(i))').isComplex()).toBe(false);
			expect(Expression.create('x*imagpart(erf(i))').isComplex()).toBe(false);

			const cases = [
				['x*erf(i)', 'x*realpart(erf(i))', 'x*imagpart(erf(i))'],
				['(3/2)*x*erf(i)', '(3/2)*x*realpart(erf(i))', '(3/2)*x*imagpart(erf(i))'],
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

		it('simplifies division by a pure imaginary scalar without decomposing the numerator', () => {
			const cases = [
				['1/i', '-i'],
				['x/i', '-x*i'],
				['e^(2*x)/i', '-i*e^(2*x)'],
				['e^(i*x)/i', '-i*e^(i*x)'],
				['x/(3*i)', '(-1/3)*x*i'],
				['x/(-3*i)', '(1/3)*x*i'],
			];

			for (const [input, expected] of cases) {
				expect(nerdamer(input).text()).toEqual(expected);
			}
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

		it('evaluates exact Gaussian integer powers without decimal residue', () => {
			expect(nerdamer('(1+i)^2').evaluate().text()).toEqual('2*i');
			expect(nerdamer('(1-i)^2').evaluate().text()).toEqual('-2*i');
		});

		it('rewrites pure-imaginary trig and hyperbolic arguments exactly', () => {
			const cases = [
				['sin(i*x)', 'i*sinh(x)'],
				['cos(i*x)', 'cosh(x)'],
				['tan(i*x)', 'i*tanh(x)'],
				['sinh(i*x)', 'i*sin(x)'],
				['cosh(i*x)', 'cos(x)'],
				['tanh(i*x)', 'i*tan(x)'],
			];

			for (const [input, expected] of cases) {
				expect(nerdamer(input).eq(Expression.create(expected))).toBe(true);
			}
		});

		it('keeps e^(i*x) symbolic during evaluation without decimalizing e', () => {
			expect(nerdamer('e^(i*x)').evaluate().eq(Expression.create('cos(x)+i*sin(x)'))).toBe(true);
		});

		it('decomposes Euler exponentials with complex exponents', () => {
			const pureImaginary = Expression.create('e^(i*x)');
			const mixed = Expression.create('e^(2+i*x)');

			expect(pureImaginary.realPart().text()).toEqual(Expression.create('cos(x)').text());
			expect(pureImaginary.imagPart().text()).toEqual(Expression.create('sin(x)').text());
			expect(mixed.realPart().text()).toEqual(Expression.create('e^2*cos(x)').text());
			expect(mixed.imagPart().text()).toEqual(Expression.create('e^2*sin(x)').text());
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/181
		it('does not apply real known-value inverse-trig shortcuts to i', () => {
			expect(nerdamer('aerf(i)').text()).not.toEqual('pi/2');
			expect(nerdamer('aEi(i)').text()).not.toEqual('0');
			expect(nerdamer('atan(i)').text()).not.toEqual('pi/4');
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/181
		it('rewrites pure-imaginary sine and hyperbolic sine integrals exactly', () => {
			expect(nerdamer('Si(i*x)').eq(Expression.create('i*Shi(x)'))).toBe(true);
			expect(nerdamer('Shi(i*x)').eq(Expression.create('i*Si(x)'))).toBe(true);
		});

		it('uses principal-branch identities for special integrals on the imaginary axis', () => {
			const cases = [
				['Ci(i)', 'Chi(1)+(1/2)*i*pi'],
				['Ci(-i)', 'Chi(1)-(1/2)*i*pi'],
				['Chi(i)', 'Ci(1)+(1/2)*i*pi'],
				['Chi(-i)', 'Ci(1)-(1/2)*i*pi'],
				['Ei(i)', 'Ci(1)+i*(Si(1)+(1/2)*pi)'],
				['Ei(-i)', 'Ci(1)-i*(Si(1)+(1/2)*pi)'],
			];

			for (const [input, expected] of cases) {
				expect(nerdamer(input).eq(Expression.create(expected))).toBe(true);
			}
		});

		it('evaluates tan(i) through the complex identity i*tanh(1)', () => {
			const actual = Expression.create('tan(i)').evaluate();
			const expected = Expression.create('i*tanh(1)').evaluate();
			expect(actual.minus(expected).evaluate().isNearlyZero()).toBe(true);
		});
	});
});

describe('Complex-number regressions', () => {
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
