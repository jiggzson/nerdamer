import '../../helpers/registerNerdamerFunctions';

import { rationalIntegralData, tryIntegrateExactRational } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { rationalIntegralExpression, rationalLogTerm } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';
import { diff } from '../../../src/calculus/derivative/diff';
import { toCommonDenominator } from '../../../src/core/functions/rationalNormalization';

describe('Exact rational backend boundary', () => {
	it.each([
		'1/(x^2+1)',
		'2*x/(x^2+1)',
		'1/(x^2+4)',
	])('constructs an independently verifiable antiderivative for %s', source => {
		const expr = Expression.create(source);
		const result = tryIntegrateExactRational(expr, 'x');
		expect(result).toBeDefined();
		if (result !== undefined) {
			const difference = toCommonDenominator(diff(result, 'x').minus(expr));
			expect(difference.getNumerator().expand().isZero()).toBe(true);
		}
	});

	it('does not claim a public primitive when higher-degree residue data cannot be expressed', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^3-x-1');
		const data = rationalIntegralData(numerator, denominator, 'x');
		expect(data.type).toBe('assembled');
		expect(rationalIntegralExpression(data, numerator, denominator, 'x')).toBeUndefined();
		expect(tryIntegrateExactRational(numerator.div(denominator), 'x')).toBeUndefined();
	});
});

describe('Rational integral expression conversion', () => {
	it.each([
		['2*x', 'x^2+1'],
		['1', 'x-1'],
		['1', 'x^2+1'],
		['1', 'x^2+4'],
	] as const)('converts a rational-residue integral of %s/(%s)', (top, bottom) => {
		const numerator = Expression.create(top);
		const denominator = Expression.create(bottom);
		const data = rationalIntegralData(numerator, denominator, 'x');
		const expression = rationalIntegralExpression(data, numerator, denominator, 'x');
		expect(expression).toBeDefined();
		if (expression !== undefined) {
			const derivative = diff(expression, Expression.create('x'));
			const difference = toCommonDenominator(derivative.minus(numerator.div(denominator)));
			expect(difference.getNumerator().expand().text()).toBe('0');
		}
	});

	it('converts rational integral data using a separate residue variable', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('z^2+1');
		const data = rationalIntegralData(numerator, denominator, 'z', undefined, 't');
		expect(data.type).toBe('assembled');
		const result = rationalIntegralExpression(data, numerator, denominator, 'z');
		expect(result).toBeDefined();
		if (result !== undefined) {
			const difference = toCommonDenominator(diff(result, 'z').minus(numerator.div(denominator)));
			expect(difference.getNumerator().expand().isZero()).toBe(true);
		}
	});

	it.each([
		['z^2+z+1', 'x+z', '(2-x)/(x^2-x+1)'],
		['z^2+4', 'x+z', '8/(x^2+4)'],
		['z^2+1', 'x+2*z', '4/(x^2+4)'],
	] as const)('differentiates conjugate quadratic log terms for %s, %s', (modulus, argument, expected) => {
		const result = rationalLogTerm({
			residuePolynomial: Expression.create(modulus),
			argument: Expression.create(argument),
		}, 'z');
		expect(result).toBeDefined();
		if (result !== undefined) {
			const derivative = diff(result, 'x');
			const difference = toCommonDenominator(derivative.minus(Expression.create(expected)));
			expect(difference.getNumerator().expand().text()).toBe('0');
		}
	});

	it('differentiates directly constructed logarithms without reparsing function text', () => {
		const argument = Expression.create('x^2+1');
		const logarithm = Expression.toFunction(Expression.LOG, [argument]);
		const derivative = diff(logarithm, Expression.create('x'));
		const difference = toCommonDenominator(derivative.minus(Expression.create('2*x').div(argument)));
		expect(difference.getNumerator().expand().isZero()).toBe(true);
	});

	it('converts quadratic conjugate residues to ordinary inverse tangents', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^2+1');
		const data = rationalIntegralData(numerator, denominator, 'x');
		const result = rationalIntegralExpression(data, numerator, denominator, 'x');
		expect(result).toBeDefined();
		expect(result?.hasFunction('atan', true)).toBe(true);
	});

	it('keeps higher-degree algebraic residues as internal data', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^3-x-1');
		const data = rationalIntegralData(numerator, denominator, 'x');
		if (data.type === 'assembled' && data.logarithmicTerms.some(
			term => new Polynomial(term.residuePolynomial, [data.residueVariable])
				.deg(data.residueVariable) > 2
		)) {
			expect(rationalIntegralExpression(data, numerator, denominator, 'x')).toBeUndefined();
		}
	});

	it('does not convert data verified against a different integrand', () => {
		const numerator = Expression.create('2*x');
		const denominator = Expression.create('x^2+1');
		const data = rationalIntegralData(numerator, denominator, 'x');
		expect(rationalIntegralExpression(data, Expression.create('1'), denominator, 'x')).toBeUndefined();
	});
});
