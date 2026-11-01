import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

describe('open legacy complex issue reproducers', () => {
	// https://github.com/jiggzson/nerdamer/issues/615
	it.each([
		['-8/(2+3*i)', '(-16+24*i)/13'],
		['3*i/(2+3*i)', '(9+6*i)/13'],
		['-8*i/(2+3*i)', '(-24-16*i)/13'],
	] as const)('rationalizes the complex quotient %s (#615)', (input, expected) => {
		const actual = nerdamer(input);
		if (!Expression.isExpression(actual)) {
			throw new Error(`Expected a scalar expression for ${input}`);
		}
		const residual = actual.minus(Expression.create(expected)).evaluate();
		expect(residual.isNearlyZero()).toBe(true);
	});

	// https://github.com/jiggzson/nerdamer/issues/616
	// j is an ordinary symbolic variable, unlike the imaginary unit i.
	it.each([
		['determinant(matrix([4,0,0],[0,1,2],[0,1,-2-j]))', '-16-4*j'],
		['determinant(matrix([4,0,0],[0,1,2],[0,1,-2-i]))', '-16-4*i'],
		['determinant(matrix([1,0,0],[0,1,2],[0,1,-2-i]))', '-4-i'],
	] as const)('preserves the leading cofactor of %s (#616)', (input, expected) => {
		const actual = nerdamer(input);
		if (!Expression.isExpression(actual)) {
			throw new Error(`Expected a scalar expression for ${input}`);
		}
		const residual = actual.minus(Expression.create(expected)).evaluate();
		expect(residual.isNearlyZero()).toBe(true);
	});

	// https://github.com/jiggzson/nerdamer/issues/685
	it.each([
		['exp(-2*i*pi*1/4)', '-i'],
		['exp(i*pi)', '-1'],
	] as const)('preserves the complex exponential sign for %s (#685)', (input, expected) => {
		const actual = nerdamer(input);
		if (!Expression.isExpression(actual)) {
			throw new Error(`Expected a scalar expression for ${input}`);
		}
		const residual = actual.minus(Expression.create(expected)).evaluate();
		expect(residual.isNearlyZero()).toBe(true);
	});
});
