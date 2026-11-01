import '../../helpers/registerNerdamerFunctions';

import {
	rationalIntegralData,
	rationalIntegralExpression,
	verifyIntegralData,
} from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { ResiduePolynomialRing } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

describe('Historical #334 quintic rational residue', () => {
	it('assembles and verifies the exact logarithmic remainder without numerical roots', () => {
		const numerator = Expression.create('4-3*x+2*x^2-x^3');
		const denominator = Expression.create('5*(1-x+x^2-x^3+x^4)').expand();
		const data = rationalIntegralData(numerator, denominator, 'x');
		expect(data.type).toBe('assembled');
		if (data.type === 'assembled') {
			expect(verifyIntegralData(data, numerator, denominator, 'x')).toBe(true);
			expect(data.logarithmicTerms).toHaveLength(1);
			const term = data.logarithmicTerms[0];
			const z = data.residueVariable;
			const ring = new ResiduePolynomialRing(term.residuePolynomial, z);
			const expected = Expression.create(`x+5*${z}`);
			const argumentDifference = term.argument.minus(expected).expand();
			expect(new Polynomial(argumentDifference, ['x']).toArray(false, 'x')
				.every(coefficient => ring.reduce(coefficient).isZero())).toBe(true);
			expect(rationalIntegralExpression(data, numerator, denominator, 'x')).toBeUndefined();
		}
	});
});
