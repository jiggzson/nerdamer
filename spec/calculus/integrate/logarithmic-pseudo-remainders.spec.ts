import { logarithmicPseudoRemainders } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { squareFreeLogarithmicData } from '../../../src/calculus/integrate/algorithms/algebraicResidues';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';

describe('Logarithmic pseudo-remainder sequence', () => {
	const cases = [
		['1', 'x^2+1'],
		['x', 'x^4+1'],
		['1', 'x^5+1'],
	] as const;

	it.each(cases)('reduces P=%s and Q=%s over the residue parameter', (top, bottom) => {
		const data = squareFreeLogarithmicData(Expression.create(top), Expression.create(bottom), 'x');
		expect(data.type).toBe('residues');
		if (data.type === 'residues') {
			const difference = data.numerator.minus(
				Expression.create(data.residueVariable).times(data.denominatorDerivative)
			).expand();
			const sequence = logarithmicPseudoRemainders(data.denominator, difference, 'x');
			expect(sequence).toBeDefined();
			if (sequence) {
				expect(sequence.length).toBeGreaterThanOrEqual(2);
				for (let i = 2; i < sequence.length; i++) {
					expect(sequence[i].length).toBeLessThan(sequence[i - 1].length);
				}
				for (const entry of sequence) {
					for (const coefficient of entry) {
						expect(coefficient.hasVariable('x')).toBe(false);
						expect(new Polynomial(coefficient, ['z']).toArray(false, 'z')
							.every(item => item.isNUM())).toBe(true);
					}
				}
			}
		}
	});

	it('preserves the quadratic residue relation', () => {
		const q = Expression.create('x^2+1');
		const f = Expression.create('1-2*z*x');
		const sequence = logarithmicPseudoRemainders(q, f, 'x');
		expect(sequence).toBeDefined();
		if (sequence) {
			const last = sequence[sequence.length - 1];
			expect(last.length).toBe(1);
			expect(last[0].minus('1+4*z^2').expand().isZero()).toBe(true);
		}
	});
});
