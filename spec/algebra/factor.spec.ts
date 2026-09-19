'use strict';

import { factor } from '../../src/algebra/factor/factor';
import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Factor', () => {
	const check = (input: string, expected: string) => {
		expect(factor(input).text()).toEqual(expected);
	};

	it('prime-factors exact integer input', () => {
		check('4677271', '2089*2239');
		check('3825123056546413051', '149491*747451*34233211');
		check('-12', '-2^2*3');
	});

	it('preserves mathematical constants used in rational factors', () => {
		check('c*pi^-5', 'c*pi^-5');
		check('c*e^-5', 'c*e^-5');
	});

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

describe('Factorization regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/354
	it('preserves factor and coefficient structure after division', () => {
		const source = Expression.create('sqrt(4*x^2*y+4*x^2)');
		const factored = nerdamer.factor('sqrt(4*x^2*y+4*x^2)');
		const sourceValue = Number(source.evaluate({ x: 2, y: 3 }).text({ decimal: true }));
		const factoredValue = Number(factored.evaluate({ x: 2, y: 3 }).text({ decimal: true }));

		expect(factored.text()).not.toEqual('1');
		expect(factoredValue).toBeCloseTo(sourceValue, 12);
		expect(Expression.create('a*b*x^2+c*x+d').coeffs('x').text()).toEqual(
			'{ 0: d, 1: c, 2: a*b }'
		);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/40
	it('exposes the repeated factor of a rational quadratic', () => {
		const actual = nerdamer('factor(x^2+x+1/4)');

		expect(actual.text()).toEqual('(1/4)*(1+2*x)^2');
		expect(Expression.isExpression(actual)).toBe(true);
		if (Expression.isExpression(actual)) {
			expect(actual.eq(Expression.create('(x+1/2)^2'))).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/164
	it('prime-factors an evaluated large factorial', () => {
		const evaluated = nerdamer('100!').evaluate();
		const expectedCounts = {
			'2': '97',
			'3': '48',
			'5': '24',
			'7': '16',
			'11': '9',
			'13': '7',
			'17': '5',
			'19': '5',
			'23': '4',
			'29': '3',
			'31': '3',
			'37': '2',
			'41': '2',
			'43': '2',
			'47': '2',
			'53': '1',
			'59': '1',
			'61': '1',
			'67': '1',
			'71': '1',
			'73': '1',
			'79': '1',
			'83': '1',
			'89': '1',
			'97': '1',
		};

		expect(Expression.isExpression(evaluated)).toBe(true);
		if (Expression.isExpression(evaluated)) {
			const actual = factor(evaluated);
			const actualCounts = Object.fromEntries(
				Object.values(actual.getElements()).map(element => [
					element.getBase().text(),
					element.getPower().text(),
				])
			);

			expect(actualCounts).toEqual(expectedCounts);
			expect(actual.div(evaluated).simplify().isOne()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/198
	it('preserves the sign while prime-factoring negative integers', () => {
		expect(factor('-8').text()).toEqual('-2^3');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/199
	it('does not collapse symbolic factor input to one', () => {
		const actual = factor('2+a');

		expect(actual.eq('2+a')).toBe(true);
		expect(actual.text()).not.toEqual('1');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/223
	it('preserves repeated powers and grouping during factorization', () => {
		const cases = [
			['x^2+2*x+1', '(1+x)^2'],
			['x^3+3*x^2+3*x+1', '(1+x)^3'],
			['x+x^2+x^3+x^4', 'x*(1+x)*(1+x^2)'],
		];

		for (const [input, expected] of cases) {
			expect(factor(input).text()).toEqual(expected);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/224
	it('factors zero without crashing or wrapping it in factor()', () => {
		expect(factor('0').text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/287
	it('preserves repeated factors during factorization', () => {
		const actual = nerdamer.factor('x^5-x^4-x+1').expand();
		const expected = nerdamer('(x-1)^2*(x+1)*(x^2+1)').expand();

		expect(actual.eq(expected)).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/294
	it('prime-factors factorial-offset integers correctly', () => {
		expect(nerdamer.factor('15!-1').text()).toEqual('17*31^2*53*1510259');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/298
	it('leaves symbolic pi unchanged when factoring', () => {
		expect(nerdamer.factor('pi').text()).toEqual('pi');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/409
	it('factors the strong pseudoprime correctly', () => {
		expect(nerdamer('factor(3825123056546413051)').text()).toEqual(
			'149491*747451*34233211'
		);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/124
	it('terminates when factorizing zero', () => {
		const result = factor(Expression.create(0));

		expect(Expression.isExpression(result)).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/547
	it('factors the reported perfect-square polynomial', () => {
		const actual = Expression.create('x^2-4*x+4').factor();

		expect(actual.minus('(x-2)^2').expand().isZero()).toBe(true);
	});
});
