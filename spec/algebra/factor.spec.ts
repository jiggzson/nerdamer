'use strict';

import { factor } from '../../src/algebra/factor/factor';

describe('Factor', () => {
	const check = (input: string, expected: string) => {
		expect(factor(input).text()).toEqual(expected);
	};

	it('x^2*y+3*x*y+2*y+x^2+3*x+2', () => {
		check('x^2*y+3*x*y+2*y+x^2+3*x+2', '(1+x)*(2+x)*(1+y)');
	});

	it('-a*x^3*y+b*x^2*y-c*x*y-d*y+a^2*x^4-a*b*x^3+a*c*x^2+a*d*x', () => {
		check(
			'-a*x^3*y+b*x^2*y-c*x*y-d*y+a^2*x^4-a*b*x^3+a*c*x^2+a*d*x',
			'(y-a*x)*(b*x^2-a*x^3-c*x-d)'
		);
	});

	it('6*x^2*y+12*x^2+6*x*y+12*x', () => {
		check('6*x^2*y+12*x^2+6*x*y+12*x', '6*x*(2+y)*(1+x)');
	});

	it('x^2*y^2-1', () => {
		check('x^2*y^2-1', '(1+x*y)*(-1+x*y)');
	});

	it('x^2+2*x*y+y^2', () => {
		check('x^2+2*x*y+y^2', '(x+y)^2');
	});

	it('x*y*z+x*y+x*z+y*z+x+y+z+1', () => {
		check('x*y*z+x*y+x*z+y*z+x+y+z+1', '(1+z)*(1+y)*(1+x)');
	});

	it('2*x+3*y-5', () => {
		check('2*x+3*y-5', '2*x+3*y-5');
	});

	it('b^6+3*a^2*b^4+3*a^4*b^2+a^6', () => {
		check('b^6+3*a^2*b^4+3*a^4*b^2+a^6', '(a^2+b^2)^3');
	});

	it('3*w^2+u^2*v*w+3*u*v*w-15*w+u^3*v^2-5*u^2*v', () => {
		check('3*w^2+u^2*v*w+3*u*v*w-15*w+u^3*v^2-5*u^2*v', '(w+u*v-5)*(3*w+u^2*v)');
	});

	it('b*x^2-3*b^2*x+a*b*x+a^2*x-3*a^2*b+a^3', () => {
		check('b*x^2-3*b^2*x+a*b*x+a^2*x-3*a^2*b+a^3', '(x+a-3*b)*(a^2+b*x)');
	});

	it('a^2*x^4+a*x^4+2*a^2*x^3+2*a*x^3+6*a^2*x^2+6*a*x^2+x^2+2*x+6', () => {
		check(
			'a^2*x^4+a*x^4+2*a^2*x^3+2*a*x^3+6*a^2*x^2+6*a*x^2+x^2+2*x+6',
			'(6+2*x+x^2)*(1+a*x^2+a^2*x^2)'
		);
	});

	it('-x^2*y^2+b^2*x^4*y+b*x^2*y+b*y-a*y-b^3*x^4-b^3*x^2+a*b^2*x^2', () => {
		check(
			'-x^2*y^2+b^2*x^4*y+b*x^2*y+b*y-a*y-b^3*x^4-b^3*x^2+a*b^2*x^2',
			'(-y+b^2*x^2)*(a-b*x^2-b+x^2*y)'
		);
	});

	it('a*x^14*z+b*x^13*z+a*x^3*z+b*x^2*z+a*b*x^13+b^2*x^12-a^2*x^12-a*b*x^11+a*b*x^2+b^2*x-a^2*x-a*b', () => {
		check(
			'a*x^14*z+b*x^13*z+a*x^3*z+b*x^2*z+a*b*x^13+b^2*x^12-a^2*x^12-a*b*x^11+a*b*x^2+b^2*x-a^2*x-a*b',
			'-(1+x)*(-1+x-x^2+x^3-x^4+x^5-x^6+x^7-x^8+x^9-x^10)*(b+a*x)*(-a+x^2*z+b*x)'
		);
	});

	// Monomial factoring (GCF extraction)
	it('6*x^3+12*x^2-18*x', () => {
		check('6*x^3+12*x^2-18*x', '6*x*(-1+x)*(3+x)');
	});

	// GCF with coefficient greater than 1
	it('12*x^4-8*x^3+20*x^2', () => {
		check('12*x^4-8*x^3+20*x^2', '4*x^2*(5-2*x+3*x^2)');
	});

	// Monic quadratic trinomial over ℤ
	it('x^2+5*x+6', () => {
		check('x^2+5*x+6', '(2+x)*(3+x)');
	});

	// Non-monic quadratic trinomial over ℤ
	it('6*x^2+11*x+3', () => {
		check('6*x^2+11*x+3', '(3+2*x)*(1+3*x)');
	});

	// Perfect square trinomial (positive)
	it('4*x^2+12*x+9', () => {
		check('4*x^2+12*x+9', '(3+2*x)^2');
	});

	// Perfect square trinomial (negative)
	it('9*x^2-30*x+25', () => {
		check('9*x^2-30*x+25', '(-5+3*x)^2');
	});

	// Difference of squares
	it('25*x^2-16', () => {
		check('25*x^2-16', '(-4+5*x)*(4+5*x)');
	});

	// Sum of cubes
	it('x^3+8', () => {
		check('x^3+8', '(2+x)*(4-2*x+x^2)');
	});

	// Difference of cubes
	it('27*x^3-125', () => {
		check('27*x^3-125', '(-5+3*x)*(25+15*x+9*x^2)');
	});

	// General cubic over ℤ with one rational root
	it('x^3-6*x^2+11*x-6', () => {
		check('x^3-6*x^2+11*x-6', '(-1+x)*(-2+x)*(-3+x)');
	});

	// Depressed cubic (no x^2 term)
	it('x^3-7*x+6', () => {
		check('x^3-7*x+6', '(-1+x)*(-2+x)*(3+x)');
	});

	// Cubic with all three integer roots
	it('x^3+2*x^2-5*x-6', () => {
		check('x^3+2*x^2-5*x-6', '(-2+x)*(3+x)*(1+x)');
	});

	// Cubic with a repeated root
	it('x^3-3*x+2', () => {
		check('x^3-3*x+2', '(2+x)*((-1+x)^2)');
	});

	// Cubic with a triple root
	it('x^3-3*x^2+3*x-1', () => {
		check('x^3-3*x^2+3*x-1', '(-1+x)^3');
	});

	// Difference of fourth powers
	it('x^4-81', () => {
		check('x^4-81', '(-3+x)*(3+x)*(9+x^2)');
	});

	// Biquadratic (quadratic in x^2)
	it('x^4-5*x^2+4', () => {
		check('x^4-5*x^2+4', '(1+x)*(2+x)*(-2+x)*(-1+x)');
	});

	// Biquadratic with non-unit leading coefficient
	it('4*x^4-37*x^2+9', () => {
		check('4*x^4-37*x^2+9', '(3+x)*(-3+x)*(-1+2*x)*(1+2*x)');
	});

	// Quartic as perfect square
	it('x^4+4*x^3+6*x^2+4*x+1', () => {
		check('x^4+4*x^3+6*x^2+4*x+1', '(1+x)^4');
	});

	// Quartic with four integer roots
	it('x^4-10*x^3+35*x^2-50*x+24', () => {
		check('x^4-10*x^3+35*x^2-50*x+24', '(-2+x)*(-4+x)*(-3+x)*(-1+x)');
	});

	// Difference of fifth powers
	it('x^5-32', () => {
		check('x^5-32', '(-2+x)*(16+8*x+4*x^2+2*x^3+x^4)');
	});

	// Sum of fifth powers (n odd)
	it('x^5+243', () => {
		check('x^5+243', '(3+x)*(81-27*x+9*x^2-3*x^3+x^4)');
	});

	// Difference of sixth powers
	it('x^6-64', () => {
		check('x^6-64', '(-2+x)*(2+x)*(4-2*x+x^2)*(4+2*x+x^2)');
	});

	// Cyclotomic polynomial Φ_5(x) (irreducible over ℤ; should remain unfactored)
	it('x^4+x^3+x^2+x+1', () => {
		check('x^4+x^3+x^2+x+1', '1+x+x^2+x^3+x^4');
	});

	// Cyclotomic polynomial Φ_8(x) (irreducible over ℤ; should remain unfactored)
	it('x^4+1', () => {
		check('x^4+1', '1+x^4');
	});

	// Cyclotomic polynomial Φ_12(x) (irreducible over ℤ; should remain unfactored)
	it('x^4-x^2+1', () => {
		check('x^4-x^2+1', '1-x^2+x^4');
	});

	// Reciprocal (palindromic) quartic (typically irreducible here; should remain unfactored)
	it('x^4+3*x^3+5*x^2+3*x+1', () => {
		check('x^4+3*x^3+5*x^2+3*x+1', '1+3*x+5*x^2+3*x^3+x^4');
	});

	// Anti-palindromic polynomial (factorable: (x-1)*(x^3-x^2-x+1))
	it('x^4-2*x^3+2*x-1', () => {
		check('x^4-2*x^3+2*x-1', '(1+x)*((-1+x)^3)');
	});

	// Power of a binomial fully expanded
	it('x^5+5*x^4+10*x^3+10*x^2+5*x+1', () => {
		check('x^5+5*x^4+10*x^3+10*x^2+5*x+1', '(1+x)^5');
	});

	// Substitution factoring (u = x^3) [should factor]
	it('x^6-7*x^3+12', () => {
		check('x^6-7*x^3+12', '(-3+x^3)*(-4+x^3)');
	});

	// Substitution factoring (u = x^4) [partial over ℤ is acceptable]
	it('x^8-5*x^4+4', () => {
		check('x^8-5*x^4+4', '(-1+x)*(1+x)*(1+x^2)*(2+x^2)*(-2+x^2)');
	});

	// Factoring by grouping (2+2)
	it('x^3+3*x^2+2*x+6', () => {
		check('x^3+3*x^2+2*x+6', '(3+x)*(2+x^2)');
	});

	// Factoring by grouping (3+1)
	it('x^3+x^2-x-1', () => {
		check('x^3+x^2-x-1', '(-1+x)*((1+x)^2)');
	});

	// Squarefree factorization (f = f1 * f2^2 * f3^3)
	it('x^5-2*x^4-x^3+2*x^2', () => {
		check('x^5-2*x^4-x^3+2*x^2', 'x^2*(1+x)*(-1+x)*(-2+x)');
	});

	// Double root extraction
	it('x^4-2*x^3-3*x^2+4*x+4', () => {
		check('x^4-2*x^3-3*x^2+4*x+4', '((-2+x)^2)*((1+x)^2)');
	});

	// Triple root extraction
	it('x^4-3*x^3+3*x^2-x', () => {
		check('x^4-3*x^3+3*x^2-x', 'x*((-1+x)^3)');
	});

	// Factorization over ℚ with rational non-integer roots (should factor over ℤ as well)
	it('6*x^2-5*x+1', () => {
		check('6*x^2-5*x+1', '(-1+3*x)*(-1+2*x)');
	});

	// Factorization over ℝ note is misleading: actually factors by grouping over ℤ
	it('x^3-x^2+x-1', () => {
		check('x^3-x^2+x-1', '(-1+x)*(1+x^2)');
	});

	// GCF extraction in multiple variables
	it('6*x^2*y+9*x*y^2-3*x*y', () => {
		check('6*x^2*y+9*x*y^2-3*x*y', '3*x*y*(2*x+3*y-1)');
	});

	// Difference of squares in two variables
	it('x^2-y^2', () => {
		check('x^2-y^2', '(x+y)*(x-y)');
	});

	// Perfect square trinomial in two variables
	it('x^2+2*x*y+y^2 (dup)', () => {
		check('x^2+2*x*y+y^2', '(x+y)^2');
	});

	// Sum of cubes in two variables
	it('x^3+y^3', () => {
		check('x^3+y^3', '(x+y)*(x^2-x*y+y^2)');
	});

	// Difference of cubes in two variables
	it('x^3-y^3', () => {
		check('x^3-y^3', '(x-y)*(x^2+x*y+y^2)');
	});

	// Difference of fourth powers in two variables
	it('x^4-y^4 (dup)', () => {
		check('x^4-y^4', '(x-y)*(x+y)*(x^2+y^2)');
	});

	// Difference of fifth powers in two variables
	it('x^5-y^5', () => {
		check('x^5-y^5', '(x-y)*(x^4+x^3*y+x^2*y^2+x*y^3+y^4)');
	});

	// Sum of fifth powers in two variables
	it('x^5+y^5', () => {
		check('x^5+y^5', '(x+y)*(x^4-x^3*y+x^2*y^2-x*y^3+y^4)');
	});

	// Bivariate monic quadratic factorable over ℤ
	it('x^2+3*x*y+2*y^2', () => {
		check('x^2+3*x*y+2*y^2', '(x+y)*(x+2*y)');
	});

	// Perfect square in three variables
	it('x^2-6*x*y*z+9*y^2*z^2', () => {
		check('x^2-6*x*y*z+9*y^2*z^2', '(-x+3*y*z)^2');
	});

	// Bivariate with repeated factor
	it('x^4-2*x^2*y^2+y^4', () => {
		check('x^4-2*x^2*y^2+y^4', '((x+y)^2)*((x-y)^2)');
	});

	// Multivariate grouping (2+2) linear
	it('a*x+a*y+b*x+b*y', () => {
		check('a*x+a*y+b*x+b*y', '(x+y)*(b+a)');
	});

	// Multivariate grouping (2+2) higher degree
	it('x^3*y-x^2*y^2+x-y', () => {
		check('x^3*y-x^2*y^2+x-y', '(x-y)*(1+x^2*y)');
	});

	// Multivariate grouping (3+3)
	it('x^3+x^2*y+x*y^2+y^3+x^2+x*y', () => {
		check('x^3+x^2*y+x*y^2+y^3+x^2+x*y', '(x+y)*(y^2+x+x^2)');
	});

	// Substitution treating (x+y) as a single unit
	it('(x+y)^2-(x+y)-6', () => {
		check('(x+y)^2-(x+y)-6', '(x+y-3)*(x+y+2)');
	});

	// Homogeneous quadratic in two variables
	it('2*x^2+5*x*y-3*y^2', () => {
		check('2*x^2+5*x*y-3*y^2', '(x+3*y)*(2*x-y)');
	});

	// Homogeneous cubic in two variables
	it('x^3-x^2*y-x*y^2+y^3', () => {
		check('x^3-x^2*y-x*y^2+y^3', '(x+y)*((x-y)^2)');
	});

	// Homogeneous quartic in two variables
	it('x^4-y^4 (homogeneous)', () => {
		check('x^4-y^4', '(x-y)*(x+y)*(x^2+y^2)');
	});

	// Power sum symmetric polynomial
	it('x^3+y^3+z^3-3*x*y*z', () => {
		check('x^3+y^3+z^3-3*x*y*z', '(y+z+x)*(x^2-x*y-x*z+y^2-y*z+z^2)');
	});

	// Complete homogeneous symmetric polynomial
	it('x^2+y^2+z^2+2*x*y+2*x*z+2*y*z', () => {
		check('x^2+y^2+z^2+2*x*y+2*x*z+2*y*z', '(y+x+z)^2');
	});

	// Three-variable GCF extraction
	it('4*x^2*y*z+8*x*y^2*z-12*x*y*z^2', () => {
		check('4*x^2*y*z+8*x*y^2*z-12*x*y*z^2', '4*x*y*z*(x+2*y-3*z)');
	});

	// Three-variable difference of squares
	it('x^2-y^2-2*y*z-z^2', () => {
		check('x^2-y^2-2*y*z-z^2', '(x-y-z)*(y+x+z)');
	});

	// Three-variable perfect cube
	it('x^3+3*x^2*y+3*x*y^2+y^3', () => {
		check('x^3+3*x^2*y+3*x*y^2+y^3', '(x+y)^3');
	});

	// Three-variable factoring by grouping
	it('x^2-y^2+x-y', () => {
		check('x^2-y^2+x-y', '(x-y)*(x+y+1)');
	});

	// Three-variable factoring with mixed terms
	it('x^2+x*y-x*z-y*z', () => {
		check('x^2+x*y-x*z-y*z', '(x-z)*(x+y)');
	});

	// Four-variable pairwise grouping
	it('a*c+a*d+b*c+b*d', () => {
		check('a*c+a*d+b*c+b*d', '(c+d)*(b+a)');
	});

	// Sparse bivariate high degree
	it('x^10-y^10', () => {
		check(
			'x^10-y^10',
			'(x-y)*(x+y)*(y^4-x*y^3+x^2*y^2-x^3*y+x^4)*(y^4+x*y^3+x^2*y^2+x^3*y+x^4)'
		);
	});

	// Sparse trivariate (may be reducible; treat as “analysis needed”, not guaranteed)
	it('x^6-y^6-z^6+y^3*z^3', () => {
		check('x^6-y^6-z^6+y^3*z^3', 'x^6-y^6+y^3*z^3-z^6');
	});

	// Dense trivariate low-degree
	it('x^2+y^2+z^2+2*x*y+2*y*z+2*x*z', () => {
		check('x^2+y^2+z^2+2*x*y+2*y*z+2*x*z', '(y+x+z)^2');
	});

	// Difference of squares with symbolic parameter
	it('x^2-a^2', () => {
		check('x^2-a^2', '-(a+x)*(a-x)');
	});

	// Quadratic with symbolic roots (Vieta form)
	it('x^2-(a+b)*x+a*b', () => {
		check('x^2-(a+b)*x+a*b', '(b-x)*(a-x)');
	});

	// Multivariate squarefree decomposition
	it('x^3*y-x*y^3', () => {
		check('x^3*y-x*y^3', 'x*y*(x+y)*(x-y)');
	});

	// Bivariate non-monic quadratic over ℤ
	it('6*x^2+7*x*y-3*y^2', () => {
		check('6*x^2+7*x*y-3*y^2', '(2*x+3*y)*(3*x-y)');
	});

	// Difference of squares with coefficients
	it('4*x^2-9*y^2', () => {
		check('4*x^2-9*y^2', '(2*x+3*y)*(2*x-3*y)');
	});

	// Perfect square trinomial in two variables
	it('4*x^2-12*x*y+9*y^2', () => {
		check('4*x^2-12*x*y+9*y^2', '(2*x-3*y)^2');
	});

	// Sophie Germain identity (x^4 + 64)
	it('x^4+64', () => {
		check('x^4+64', '(8+4*x+x^2)*(8-4*x+x^2)');
	});

	// Even quartic split (x^4 + x^2 + 1)
	it('x^4+x^2+1', () => {
		check('x^4+x^2+1', '(1+x+x^2)*(1-x+x^2)');
	});

	// Sophie Germain identity (x^4 + 4)
	it('x^4+4', () => {
		check('x^4+4', '(2+2*x+x^2)*(2-2*x+x^2)');
	});

	// Biquadratic (quadratic in x^2)
	it('x^4-5*x^2+6', () => {
		check('x^4-5*x^2+6', '(-3+x^2)*(-2+x^2)');
	});

	// Even quartic split (x^4 + 2*x^2 + 9)
	it('x^4+2*x^2+9', () => {
		check('x^4+2*x^2+9', '(3+2*x+x^2)*(3-2*x+x^2)');
	});

	// Sophie Germain identity in two variables
	it('x^4+4*y^4', () => {
		check('x^4+4*y^4', '(2*y^2+2*x*y+x^2)*(2*y^2-2*x*y+x^2)');
	});

	// Bivariate cyclotomic-type quartic
	it('x^4+x^2*y^2+y^4', () => {
		check('x^4+x^2*y^2+y^4', '(x^2+x*y+y^2)*(x^2+y^2-x*y)');
	});

	// Polynomial in monomial (u = x*y)
	it('x^2*y^2-5*x*y+6', () => {
		check('x^2*y^2-5*x*y+6', '(-2+x*y)*(-3+x*y)');
	});

	// Negative leading coefficient (global sign lost)
	it('-2*x^2-3*x', () => {
		check('-2*x^2-3*x', '-x*(3+2*x)');
	});

	// Perfect square quartic in two variables not split
	it('16*x^4-72*x^2*y^2+81*y^4', () => {
		check('16*x^4-72*x^2*y^2+81*y^4', '((2*x+3*y)^2)*((2*x-3*y)^2)');
	});

	// Quadratic-in-x with symbolic parameters (regression)
	it('b*x^2-3*b^2*x+a*b*x+a^2*x-3*a^2*b+a^3 (regression)', () => {
		check('b*x^2-3*b^2*x+a*b*x+a^2*x-3*a^2*b+a^3', '(x+a-3*b)*(a^2+b*x)');
	});

	// Septic univariate
	it('64+16*x^2+4*x^4+x^6', () => {
		check('64+16*x^2+4*x^4+x^6', '(4+x^2)*(16+x^4)');
	});

	// Perfect square univariate
	it('x^4-4', () => {
		check('x^4-4', '(-2+x^2)*(2+x^2)');
	});

	it('35*x^9+7*x^8+65*x^7-64*x^6-138*x^4-34*x^3-7*x^2-11*x+77', () => {
		check(
			'35*x^9+7*x^8+65*x^7-64*x^6-138*x^4-34*x^3-7*x^2-11*x+77',
			'(-11+x^2+5*x^3)*(-7+x+13*x^4+7*x^6)'
		);
	});
});
