import { SparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomial';
import {
	combinePolynomialCongruences,
	sparsePolynomialGcd,
} from '../../src/algebra/polynomial/SparsePolynomialGcd';

describe('combinePolynomialCongruences', () => {
	it('reconstructs shared and disjoint sparse terms symmetrically', () => {
		const left = new SparsePolynomial(2, [
			{ coefficient: 2n, exponents: [2n, 0n] },
			{ coefficient: 4n, exponents: [0n, 1n] },
		]);
		const right = new SparsePolynomial(2, [
			{ coefficient: 5n, exponents: [2n, 0n] },
			{ coefficient: 1n, exponents: [1n, 1n] },
		]);

		const combined = combinePolynomialCongruences(left, 7n, right, 11n);

		expect(combined.modulus).toBe(77n);
		expect(combined.polynomial.coefficient([2n, 0n])).toBe(16n);
		expect(combined.polynomial.coefficient([0n, 1n])).toBe(11n);
		expect(combined.polynomial.coefficient([1n, 1n])).toBe(-21n);
	});

	it('rejects incompatible rings and non-coprime moduli', () => {
		const oneVariable = SparsePolynomial.constant(1, 1n);
		const twoVariables = SparsePolynomial.constant(2, 1n);

		expect(() =>
			combinePolynomialCongruences(oneVariable, 7n, twoVariables, 11n)
		).toThrow(RangeError);
		expect(() =>
			combinePolynomialCongruences(oneVariable, 6n, oneVariable, 9n)
		).toThrow(RangeError);
		expect(() =>
			combinePolynomialCongruences(oneVariable, 0n, oneVariable, 7n)
		).toThrow(RangeError);
	});
});

describe('sparsePolynomialGcd', () => {
	it('returns integer content immediately when a good modular image is coprime', () => {
		const x = SparsePolynomial.variable(2, 0);
		const y = SparsePolynomial.variable(2, 1);
		const left = x
			.multiply(x)
			.add(y)
			.add(SparsePolynomial.constant(2, 1n))
			.scale(6n);
		const right = x
			.add(y.multiply(y))
			.add(SparsePolynomial.constant(2, 2n))
			.scale(15n);

		const gcd = sparsePolynomialGcd(left, right, [0, 1]);

		expect(gcd.equals(SparsePolynomial.constant(2, 3n))).toBe(true);
	});

	it('reconstructs a primitive bivariate integer GCD', () => {
		const x = SparsePolynomial.variable(2, 0);
		const y = SparsePolynomial.variable(2, 1);
		const common = x.scale(2n).add(y.scale(3n)).add(
			SparsePolynomial.constant(2, 5n)
		);
		const left = common.multiply(x.add(SparsePolynomial.constant(2, 7n)));
		const right = common.multiply(y.add(SparsePolynomial.constant(2, 11n)));

		const gcd = sparsePolynomialGcd(left, right, [0, 1]);

		expect(gcd.equals(common.normalizeLeadingSign('lex'))).toBe(true);
		expect(left.divideExact(gcd) !== null).toBe(true);
		expect(right.divideExact(gcd) !== null).toBe(true);
	});

	it('restores integer coefficient content', () => {
		const x = SparsePolynomial.variable(2, 0);
		const y = SparsePolynomial.variable(2, 1);
		const common = x.add(y).add(SparsePolynomial.constant(2, 1n));
		const left = common.multiply(x.add(SparsePolynomial.constant(2, 2n))).scale(18n);
		const right = common.multiply(y.add(SparsePolynomial.constant(2, 3n))).scale(-30n);

		const gcd = sparsePolynomialGcd(left, right, [0, 1]);

		expect(gcd.equals(common.scale(6n))).toBe(true);
	});

	it('reconstructs a trivariate integer GCD', () => {
		const x = SparsePolynomial.variable(3, 0);
		const y = SparsePolynomial.variable(3, 1);
		const z = SparsePolynomial.variable(3, 2);
		const common = x.scale(4n).add(y.scale(-7n)).add(z.scale(9n)).add(
			SparsePolynomial.constant(3, 13n)
		);
		const left = common.multiply(x.add(y).add(SparsePolynomial.constant(3, 2n)));
		const right = common.multiply(y.add(z).add(SparsePolynomial.constant(3, 5n)));

		const gcd = sparsePolynomialGcd(left, right, [0, 1, 2]);

		expect(gcd.equals(common.normalizeLeadingSign('lex'))).toBe(true);
	});


	// Regression: Nerdamer 2.0 issue #224
	it('retains a planted nontrivial trivariate common factor', () => {
		const x = SparsePolynomial.variable(3, 0);
		const y = SparsePolynomial.variable(3, 1);
		const z = SparsePolynomial.variable(3, 2);
		const one = SparsePolynomial.constant(3, 1n);
		const common = x
			.add(y)
			.add(z)
			.add(one)
			.pow(2n)
			.multiply(x.multiply(x).add(y.multiply(z)).add(one));
		const left = common.multiply(
			x.multiply(x).add(y.scale(2n)).add(SparsePolynomial.constant(3, 3n))
		);
		const right = common.multiply(
			z.multiply(z).add(x.scale(2n)).add(SparsePolynomial.constant(3, 5n))
		);

		const gcd = sparsePolynomialGcd(left, right, [0, 1, 2]);

		expect(gcd.equals(common.normalizeLeadingSign('lex'))).toBe(true);
		expect(left.divideExact(gcd) !== null).toBe(true);
		expect(right.divideExact(gcd) !== null).toBe(true);
	});

	it('handles zero, constants, and negative leading signs', () => {
		const zero = SparsePolynomial.zero(1);
		const x = SparsePolynomial.variable(1, 0);
		const polynomial = x.scale(-6n).add(SparsePolynomial.constant(1, 9n));
		const constant = SparsePolynomial.constant(1, -15n);

		expect(sparsePolynomialGcd(zero, zero, [0]).isZero()).toBe(true);
		expect(
			sparsePolynomialGcd(polynomial, zero, [0]).equals(
				polynomial.normalizeLeadingSign('lex')
			)
		).toBe(true);
		expect(
			sparsePolynomialGcd(SparsePolynomial.constant(1, 21n), constant, [0]).equals(
				SparsePolynomial.constant(1, 3n)
			)
		).toBe(true);
	});

	it('preserves bigint exponents during modular reconstruction', () => {
		const exponent = 9007199254740991n + 91n;
		const common = new SparsePolynomial(1, [
			{ coefficient: 5n, exponents: [exponent] },
			{ coefficient: 3n, exponents: [0n] },
		]);
		const x = SparsePolynomial.variable(1, 0);
		const left = common.multiply(x.add(SparsePolynomial.constant(1, 2n)));
		const right = common.multiply(x.add(SparsePolynomial.constant(1, 7n)));

		const gcd = sparsePolynomialGcd(left, right, [0]);

		expect(gcd.equals(common)).toBe(true);
		expect(gcd.degree(0)).toBe(exponent);
	});

	it('supports dormant coordinates in the integer polynomial ring', () => {
		const x = SparsePolynomial.variable(6, 1);
		const y = SparsePolynomial.variable(6, 3);
		const z = SparsePolynomial.variable(6, 5);
		const common = x.add(y.scale(2n)).add(z.scale(3n)).add(
			SparsePolynomial.constant(6, 4n)
		);
		const left = common.multiply(x.add(SparsePolynomial.constant(6, 5n)));
		const right = common.multiply(y.add(SparsePolynomial.constant(6, 6n)));

		const gcd = sparsePolynomialGcd(left, right, [1, 3, 5]);

		expect(gcd.equals(common)).toBe(true);
	});

	it('rejects invalid variable selections and ring mismatches', () => {
		const x = SparsePolynomial.variable(3, 0);
		const y = SparsePolynomial.variable(3, 1);
		const z = SparsePolynomial.variable(3, 2);
		const otherRing = SparsePolynomial.variable(2, 0);

		expect(() => sparsePolynomialGcd(x, otherRing, [0])).toThrow(RangeError);
		expect(() => sparsePolynomialGcd(x, y, [])).toThrow(RangeError);
		expect(() => sparsePolynomialGcd(x, y, [0, 0])).toThrow(RangeError);
		expect(() => sparsePolynomialGcd(x, y, [1, 0])).toThrow(RangeError);
		expect(() => sparsePolynomialGcd(x.add(z), y, [0, 1])).toThrow(RangeError);
	});
});
