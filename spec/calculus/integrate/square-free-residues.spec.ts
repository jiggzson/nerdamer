import { Syl } from '../../../src/core/classes/matrix/Sylvester';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

/**
 * Resultant probes for the logarithmic stage of rational integration.
 * For square-free Q, roots of Res_x(Q, P-z*Q') are logarithmic residues.
 * No antiderivative or root representation is introduced here.
 */
describe('Square-free rational logarithmic residue resultant', () => {
	const cases = [
		['x+1', '1', '1-z', 'linear'],
		['x^2+1', '1', '1+4*z^2', 'quadratic with non-rational residues'],
		['x^2+1', '2*x', '4*(1-z)^2', 'repeated rational residue'],
		['x^3-1', '3*x^2', '27*(1-z)^3', 'triple rational residue'],
		['x^4+1', '1', '1+256*z^4', 'quartic with algebraic residues'],
		['x^4+1', 'x', '(1+16*z^2)^2', 'repeated algebraic residues'],
		['x^5+1', '1', '(1-5*z)*(625*z^4+125*z^3+25*z^2+5*z+1)', 'quintic'],
	] as const;

	it.each(cases)('computes resultant for Q=%s, P=%s (%s)', (denominator, numerator, expected, family) => {
		const q = Expression.create(denominator);
		const p = Expression.create(numerator);
		const derivative = new Polynomial(q, ['x']).diff('x').getExpression();
		const parameter = Expression.create('z');
		const resultant = new Syl(q, p.minus(parameter.times(derivative)), 'x').Res();
		const residual = resultant.minus(Expression.create(expected)).expand();
		expect(new Polynomial(residual, ['z']).toArray(false, 'z').every(coefficient => coefficient.isZero()))
			.toBe(true);
	}, 15000);
});
