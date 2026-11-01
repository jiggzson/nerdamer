import { rationalLogarithmicArgument } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { squareFreeLogarithmicData } from '../../../src/calculus/integrate/algorithms/algebraicResidues';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';
import { divide } from '../../../src/core/classes/polynomial/utils';

describe('Exact rational logarithmic arguments', () => {
	const cases = [
		['2*x', 'x^2+1', '1', 'x^2+1'],
		['3*x^2', 'x^3-1', '1', 'x^3-1'],
		['x+1', 'x^2-1', '1', 'x-1'],
		['x+1', 'x^2-1', '0', 'x+1'],
	] as const;

	it.each(cases)('associates residue %s for P=%s, Q=%s', (top, bottom, root, expected) => {
		const data = squareFreeLogarithmicData(Expression.create(top), Expression.create(bottom), 'x');
		const result = rationalLogarithmicArgument(data, Expression.create(root), 'x');
		expect(result.type).toBe('argument');
		if (result.type === 'argument' && data.type === 'residues') {
			expect(new Polynomial(result.polynomial.minus(Expression.create(expected)).expand(), ['x'])
				.toArray(false, 'x').every(coefficient => coefficient.isZero())).toBe(true);
			const [, remainderQ] = divide(data.denominator, result.polynomial, undefined, ['x']);
			const [, remainderP] = divide(
				data.numerator.minus(result.residue.times(data.denominatorDerivative)).expand(),
				result.polynomial,
				undefined, ['x']
			);
			expect(remainderQ.isZero()).toBe(true);
			expect(remainderP.isZero()).toBe(true);
		}
	});

	it('rejects values that are not roots of the residue polynomial', () => {
		const data = squareFreeLogarithmicData(Expression.create('1'), Expression.create('x^2+1'), 'x');
		expect(rationalLogarithmicArgument(data, Expression.create('1'), 'x').type)
			.toBe('unsupported');
	});

	it('rejects symbolic or decimal residues', () => {
		const data = squareFreeLogarithmicData(Expression.create('2*x'), Expression.create('x^2+1'), 'x');
		expect(rationalLogarithmicArgument(data, Expression.create('z'), 'x').type)
			.toBe('unsupported');
		expect(rationalLogarithmicArgument(data, Expression.create('1.0'), 'x').type)
			.toBe('unsupported');
	});
});
