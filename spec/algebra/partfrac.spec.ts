import { partfrac } from '../../src/algebra/partfrac';
import { Expression } from '../../src/core/classes/expression/Expression';

const text = (expr: string | number) => Expression.create(expr).text();

/**
 * Verifies that the decomposition is mathematically equivalent to the original
 * by substituting several numeric values and comparing results.
 *
 * @param original  The original expression string
 * @param result    The decomposed Expression
 * @param variable  The decomposition variable
 * @param points    Numeric values to substitute for the variable
 * @param extraKnowns  Additional variable substitutions for multivariate expressions
 */
function verifyEquivalence(
	original: string,
	result: Expression,
	variable: string,
	points: string[],
	extraKnowns?: Record<string, string>
) {
	for (const val of points) {
		const knownObj: Record<string, string> = { [variable]: val, ...extraKnowns };
		const origVal = Expression.create(Expression.create(original).text(), knownObj).text();
		const resultVal = Expression.create(result.text(), knownObj).text();
		expect(resultVal).toEqual(origVal);
	}
}

describe('partfrac', () => {
	// ================================================================
	// No decomposition needed — passthrough cases
	// ================================================================
	describe('passthrough (no decomposition)', () => {
		it('returns a constant unchanged', () => {
			expect(partfrac('5').text()).toEqual(text('5'));
		});

		it('returns a polynomial unchanged', () => {
			expect(partfrac('x^2+3*x+1').text()).toEqual(text('x^2+3*x+1'));
		});

		it('returns an expression with no variable unchanged', () => {
			expect(partfrac('a/b').text()).toEqual(text('a/b'));
		});

		it('returns a fraction with linear denominator unchanged', () => {
			expect(partfrac('1/(x+1)', 'x').text()).toEqual(text('1/(x+1)'));
		});

		it('returns a fraction with irreducible quadratic denominator unchanged', () => {
			expect(partfrac('1/(x^2+1)', 'x').text()).toEqual(text('1/(x^2+1)'));
		});

		it('returns a fraction with constant denominator unchanged', () => {
			expect(partfrac('x/3', 'x').text()).toEqual(text('x/3'));
		});
	});

	// ================================================================
	// Distinct linear factors
	// ================================================================
	describe('distinct linear factors', () => {
		it('decomposes 1/(x*(x-1))', () => {
			const result = partfrac('1/(x*(x-1))', 'x');
			expect(result.text()).not.toEqual(text('1/(x*(x-1))'));
			verifyEquivalence('1/(x*(x-1))', result, 'x', ['2', '3', '-1', '5']);
		});

		it('decomposes 1/((x+1)*(x-1))', () => {
			const result = partfrac('1/(x^2-1)', 'x');
			expect(result.text()).not.toEqual(text('1/(x^2-1)'));
			verifyEquivalence('1/(x^2-1)', result, 'x', ['2', '3', '-2', '5']);
		});

		it('decomposes (2*x+3)/(x^2+3*x+2)', () => {
			const result = partfrac('(2*x+3)/(x^2+3*x+2)', 'x');
			expect(result.text()).not.toEqual(text('(2*x+3)/(x^2+3*x+2)'));
			verifyEquivalence('(2*x+3)/(x^2+3*x+2)', result, 'x', ['0', '1', '3', '-3']);
		});

		it('decomposes 1/(x*(x+1))', () => {
			const result = partfrac('1/(x*(x+1))', 'x');
			expect(result.text()).not.toEqual(text('1/(x*(x+1))'));
			verifyEquivalence('1/(x*(x+1))', result, 'x', ['1', '2', '-2', '5']);
		});

		it('decomposes (x+1)/(x*(x-1)*(x+2))', () => {
			const result = partfrac('(x+1)/(x*(x-1)*(x+2))', 'x');
			verifyEquivalence('(x+1)/(x*(x-1)*(x+2))', result, 'x', ['2', '3', '-1', '-3']);
		});
	});

	// ================================================================
	// Repeated linear factors
	// ================================================================
	describe('repeated linear factors', () => {
		it('decomposes 1/(x^2*(x-1))', () => {
			const result = partfrac('1/(x^2*(x-1))', 'x');
			expect(result.text()).not.toEqual(text('1/(x^2*(x-1))'));
			verifyEquivalence('1/(x^2*(x-1))', result, 'x', ['2', '3', '-1', '5']);
		});

		it('decomposes (x^2+a)/(x*(x-1)^3)', () => {
			const result = partfrac('(x^2+a)/(x*(x-1)^3)', 'x');
			expect(result.text()).not.toEqual(text('(x*((-1+x)^3))^-1*(x^2+a)'));
			verifyEquivalence('(x^2+a)/(x*(x-1)^3)', result, 'x', ['2', '3', '-1'], { a: '7' });
			verifyEquivalence('(x^2+a)/(x*(x-1)^3)', result, 'x', ['2', '3', '-1'], { a: '-2' });
		});

		it('decomposes 1/(x-1)^2', () => {
			const result = partfrac('1/(x-1)^2', 'x');
			verifyEquivalence('1/(x-1)^2', result, 'x', ['0', '2', '3', '-1']);
		});

		it('decomposes x/(x-1)^3', () => {
			const result = partfrac('x/(x-1)^3', 'x');
			verifyEquivalence('x/(x-1)^3', result, 'x', ['0', '2', '3', '-1']);
		});

		it('decomposes (3*x+5)/(x+1)^2', () => {
			const result = partfrac('(3*x+5)/(x+1)^2', 'x');
			verifyEquivalence('(3*x+5)/(x+1)^2', result, 'x', ['0', '1', '2', '-2']);
		});
	});

	// ================================================================
	// Irreducible quadratic factors
	// ================================================================
	describe('irreducible quadratic factors', () => {
		it('decomposes 1/((x^2+1)*(x-1))', () => {
			const result = partfrac('1/((x^2+1)*(x-1))', 'x');
			expect(result.text()).not.toEqual(text('1/((x^2+1)*(x-1))'));
			verifyEquivalence('1/((x^2+1)*(x-1))', result, 'x', ['0', '2', '3', '-1']);
		});

		it('decomposes x/((x^2+1)*(x-2))', () => {
			const result = partfrac('x/((x^2+1)*(x-2))', 'x');
			expect(result.text()).not.toEqual(text('x/((x^2+1)*(x-2))'));
			verifyEquivalence('x/((x^2+1)*(x-2))', result, 'x', ['0', '1', '3', '-1']);
		});

		it('decomposes (x+3)/((x^2+4)*(x+1))', () => {
			const result = partfrac('(x+3)/((x^2+4)*(x+1))', 'x');
			verifyEquivalence('(x+3)/((x^2+4)*(x+1))', result, 'x', ['0', '1', '2', '-2']);
		});
	});

	// ================================================================
	// Improper fractions (deg numerator >= deg denominator)
	// ================================================================
	describe('improper fractions', () => {
		it('decomposes x^2/(x-1) into quotient + remainder', () => {
			const result = partfrac('x^2/(x-1)', 'x');
			expect(result.text()).not.toEqual(text('x^2/(x-1)'));
			verifyEquivalence('x^2/(x-1)', result, 'x', ['2', '3', '-1', '5']);
		});

		it('decomposes x^3/(x^2-1) (improper with factored denominator)', () => {
			const result = partfrac('x^3/(x^2-1)', 'x');
			expect(result.text()).not.toEqual(text('x^3/(x^2-1)'));
			verifyEquivalence('x^3/(x^2-1)', result, 'x', ['2', '3', '-2', '5']);
		});

		it('returns polynomial when remainder is zero', () => {
			const result = partfrac('(x^2-1)/(x-1)', 'x');
			expect(result.text()).toEqual(text('x+1'));
		});
	});

	// ================================================================
	// Alternate variables
	// ================================================================
	describe('alternate variables', () => {
		it('decomposes 1/(t*(t-1)) in variable t', () => {
			const result = partfrac('1/(t*(t-1))', 't');
			expect(result.text()).not.toEqual(text('1/(t*(t-1))'));
			verifyEquivalence('1/(t*(t-1))', result, 't', ['2', '3', '-1', '5']);
		});

		it('decomposes with explicit variable when expression has multiple', () => {
			const result = partfrac('(x+a)/(x*(x-1))', 'x');
			verifyEquivalence('(x+a)/(x*(x-1))', result, 'x', ['2', '3', '-1'], { a: '5' });
			verifyEquivalence('(x+a)/(x*(x-1))', result, 'x', ['2', '3', '-1'], { a: '-3' });
		});
	});

	// ================================================================
	// Edge cases
	// ================================================================
	describe('edge cases', () => {
		it('handles zero numerator', () => {
			expect(partfrac('0/(x^2-1)', 'x').text()).toEqual(text('0'));
		});

		it('handles numeric-only expression', () => {
			expect(partfrac('42').text()).toEqual(text('42'));
		});
	});
});
