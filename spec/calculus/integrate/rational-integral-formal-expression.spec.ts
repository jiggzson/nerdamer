import { rationalIntegralData } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { rationalIntegralFormalExpression } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { verifyIntegralData } from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { mathFunctionRegistry } from '../../../src/core/dispatch';

describe('Internal algebraic logarithmic data', () => {
	it.each([
		['1', 'x^3-x-1'],
	] as const)('keeps algebraic logarithms out of expressions for %s/(%s)', (top, bottom) => {
		const numerator = Expression.create(top).expand();
		const denominator = Expression.create(bottom).expand();
		const data = rationalIntegralData(numerator, denominator, 'x');
		expect(data.type).toBe('assembled');
		expect(verifyIntegralData(data, numerator, denominator, 'x')).toBe(true);
		expect(rationalIntegralFormalExpression(data, numerator, denominator, 'x')).toBeUndefined();
	});

	it('retains ordinary logarithms for rational residue factors', () => {
		const numerator = Expression.create('2*x');
		const denominator = Expression.create('x^2+1');
		const data = rationalIntegralData(numerator, denominator, 'x');
		const result = rationalIntegralFormalExpression(data, numerator, denominator, 'x');
		expect(result).toBeDefined();
		expect(result?.hasFunction(Expression.LOG, true)).toBe(true);
	});

	it('converts mixed rational and conjugate quadratic residues without partial results', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('(x-1)*(x^2+1)').expand();
		const data = rationalIntegralData(numerator, denominator, 'x');
		expect(data.type).toBe('assembled');
		expect(verifyIntegralData(data, numerator, denominator, 'x')).toBe(true);
		expect(rationalIntegralFormalExpression(data, numerator, denominator, 'x')).toBeDefined();
	});

	it('does not register logarithmic root sums as parser functions', () => {
		expect(mathFunctionRegistry.logrootsum).toBeUndefined();
	});

	it('rejects mismatched rational-integral data', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^2+1');
		const data = rationalIntegralData(numerator, denominator, 'x');
		expect(rationalIntegralFormalExpression(data, Expression.create('2'), denominator, 'x'))
			.toBeUndefined();
	});
});
