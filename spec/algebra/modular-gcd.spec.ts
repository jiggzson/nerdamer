import { ModularSparsePolynomial } from '../../src/algebra/polynomial/ModularSparsePolynomial';
import {
	modularGcdBivariate,
	modularGcdFiniteField,
	modularGcdTrivariate,
	modularGcdUnivariate,
} from '../../src/algebra/polynomial/modularGcd';

describe('modularGcdFiniteField', () => {
	it('reconstructs a four-variable common factor recursively', () => {
		const x = ModularSparsePolynomial.variable(4, 101n, 0);
		const y = ModularSparsePolynomial.variable(4, 101n, 1);
		const z = ModularSparsePolynomial.variable(4, 101n, 2);
		const w = ModularSparsePolynomial.variable(4, 101n, 3);
		const one = ModularSparsePolynomial.constant(4, 101n, 1n);
		const two = ModularSparsePolynomial.constant(4, 101n, 2n);
		const three = ModularSparsePolynomial.constant(4, 101n, 3n);
		const common = x.add(y).add(z).add(w).add(one);
		const left = common.multiply(x.add(y).add(two));
		const right = common.multiply(x.add(z).add(three));

		const gcd = modularGcdFiniteField(left, right, [0, 1, 2, 3]);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
		expect(gcd === null ? false : left.divideExact(gcd) !== null).toBe(true);
		expect(gcd === null ? false : right.divideExact(gcd) !== null).toBe(true);
	});

	it('supports arbitrary retained coordinates through four recursive variables', () => {
		const x = ModularSparsePolynomial.variable(8, 101n, 1);
		const y = ModularSparsePolynomial.variable(8, 101n, 3);
		const z = ModularSparsePolynomial.variable(8, 101n, 5);
		const w = ModularSparsePolynomial.variable(8, 101n, 7);
		const one = ModularSparsePolynomial.constant(8, 101n, 1n);
		const common = x.add(y).add(z).add(w).add(one);
		const left = common.multiply(x.add(ModularSparsePolynomial.constant(8, 101n, 4n)));
		const right = common.multiply(y.add(ModularSparsePolynomial.constant(8, 101n, 6n)));

		const gcd = modularGcdFiniteField(left, right, [1, 3, 5, 7]);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('matches the verified lower-dimensional entry points', () => {
		const x = ModularSparsePolynomial.variable(3, 101n, 0);
		const y = ModularSparsePolynomial.variable(3, 101n, 1);
		const z = ModularSparsePolynomial.variable(3, 101n, 2);
		const common = x.add(y).add(z).add(ModularSparsePolynomial.constant(3, 101n, 1n));
		const left = common.multiply(x.add(ModularSparsePolynomial.constant(3, 101n, 2n)));
		const right = common.multiply(y.add(ModularSparsePolynomial.constant(3, 101n, 3n)));

		const generic = modularGcdFiniteField(left, right, [0, 1, 2]);
		const trivariate = modularGcdTrivariate(left, right, 0, 1, 2);

		expect(generic?.equals(trivariate ?? ModularSparsePolynomial.zero(3, 101n))).toBe(
			true
		);
	});

	it('rejects invalid variable selections and non-field moduli', () => {
		const x = ModularSparsePolynomial.variable(3, 101n, 0);
		const y = ModularSparsePolynomial.variable(3, 101n, 1);
		const z = ModularSparsePolynomial.variable(3, 101n, 2);
		const x8 = ModularSparsePolynomial.variable(3, 8n, 0);

		expect(() => modularGcdFiniteField(x, y, [])).toThrow(RangeError);
		expect(() => modularGcdFiniteField(x, y, [0, 0])).toThrow(RangeError);
		expect(() => modularGcdFiniteField(x, y, [1, 0])).toThrow(RangeError);
		expect(() => modularGcdFiniteField(x.add(z), y, [0, 1])).toThrow(RangeError);
		expect(() => modularGcdFiniteField(x8, x8, [0])).toThrow(RangeError);
	});
});

describe('modularGcdTrivariate', () => {
	it('reconstructs a nontrivial trivariate common factor', () => {
		const x = ModularSparsePolynomial.variable(3, 101n, 0);
		const y = ModularSparsePolynomial.variable(3, 101n, 1);
		const z = ModularSparsePolynomial.variable(3, 101n, 2);
		const one = ModularSparsePolynomial.constant(3, 101n, 1n);
		const two = ModularSparsePolynomial.constant(3, 101n, 2n);
		const common = x.add(y).add(z).add(one);
		const left = common.multiply(x.add(y).add(two));
		const right = common.multiply(x.add(z.scale(2n)).add(two));

		const gcd = modularGcdTrivariate(left, right, 0, 1, 2);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
		expect(gcd === null ? false : left.divideExact(gcd) !== null).toBe(true);
		expect(gcd === null ? false : right.divideExact(gcd) !== null).toBe(true);
	});

	it('restores common content in the reconstructed variable', () => {
		const x = ModularSparsePolynomial.variable(3, 101n, 0);
		const y = ModularSparsePolynomial.variable(3, 101n, 1);
		const z = ModularSparsePolynomial.variable(3, 101n, 2);
		const one = ModularSparsePolynomial.constant(3, 101n, 1n);
		const two = ModularSparsePolynomial.constant(3, 101n, 2n);
		const content = z.add(ModularSparsePolynomial.constant(3, 101n, 5n));
		const common = content.multiply(x.add(y).add(one));
		const left = common.multiply(x.add(z).add(two));
		const right = common.multiply(y.add(z.scale(2n)).add(two));

		const gcd = modularGcdTrivariate(left, right, 0, 1, 2);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('discards a specialization with a larger bivariate GCD', () => {
		const x = ModularSparsePolynomial.variable(3, 101n, 0);
		const y = ModularSparsePolynomial.variable(3, 101n, 1);
		const z = ModularSparsePolynomial.variable(3, 101n, 2);
		const one = ModularSparsePolynomial.constant(3, 101n, 1n);
		const common = x.add(y).add(one);
		const left = common.multiply(x.add(z));
		const right = common.multiply(x.add(z.scale(2n)));

		const gcd = modularGcdTrivariate(left, right, 0, 1, 2);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('supports dormant coordinates in a larger retained ring', () => {
		const x = ModularSparsePolynomial.variable(6, 101n, 1);
		const y = ModularSparsePolynomial.variable(6, 101n, 3);
		const z = ModularSparsePolynomial.variable(6, 101n, 5);
		const common = x.add(y).add(z).add(
			ModularSparsePolynomial.constant(6, 101n, 4n)
		);
		const left = common.multiply(
			x.add(ModularSparsePolynomial.constant(6, 101n, 8n))
		);
		const right = common.multiply(
			y.add(ModularSparsePolynomial.constant(6, 101n, 9n))
		);

		const gcd = modularGcdTrivariate(left, right, 1, 3, 5);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('returns null when every field point collapses the leading bivariate monomial', () => {
		const x = ModularSparsePolynomial.variable(3, 3n, 0);
		const z = ModularSparsePolynomial.variable(3, 3n, 2);
		const one = ModularSparsePolynomial.constant(3, 3n, 1n);
		const two = ModularSparsePolynomial.constant(3, 3n, 2n);
		const vanishing = z.multiply(z).multiply(z).subtract(z);
		const left = vanishing.multiply(x).add(one);
		const right = vanishing.multiply(x).add(two);

		expect(modularGcdTrivariate(left, right, 0, 1, 2)).toBeNull();
	});

	it('rejects non-field moduli, variable reordering, and unexpected variables', () => {
		const x8 = ModularSparsePolynomial.variable(3, 8n, 0);
		const y8 = ModularSparsePolynomial.variable(3, 8n, 1);
		const x = ModularSparsePolynomial.variable(4, 101n, 0);
		const y = ModularSparsePolynomial.variable(4, 101n, 1);
		const z = ModularSparsePolynomial.variable(4, 101n, 2);
		const w = ModularSparsePolynomial.variable(4, 101n, 3);

		expect(() => modularGcdTrivariate(x8, y8, 0, 1, 2)).toThrow(RangeError);
		expect(() => modularGcdTrivariate(x, y, 1, 0, 2)).toThrow(RangeError);
		expect(() => modularGcdTrivariate(x.add(w), y.add(z), 0, 1, 2)).toThrow(
			RangeError
		);
	});
});

describe('modularGcdBivariate', () => {
	it('reconstructs a nontrivial bivariate common factor', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 0);
		const y = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const two = ModularSparsePolynomial.constant(2, 101n, 2n);
		const common = x.add(y).add(one);
		const left = common.multiply(x.add(two));
		const right = common.multiply(x.add(y.scale(2n)).add(two));

		const gcd = modularGcdBivariate(left, right, 0, 1);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
		expect(gcd === null ? false : left.divideExact(gcd) !== null).toBe(true);
		expect(gcd === null ? false : right.divideExact(gcd) !== null).toBe(true);
	});

	it('returns shared interpolation content when primitive images are coprime', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 0);
		const y = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const two = ModularSparsePolynomial.constant(2, 101n, 2n);
		const three = ModularSparsePolynomial.constant(2, 101n, 3n);
		const content = y.add(two);
		const left = content.multiply(x.add(y).add(one));
		const right = content.multiply(x.multiply(x).add(y).add(three));

		const gcd = modularGcdBivariate(left, right, 0, 1);

		expect(gcd?.equals(content.monic('lex'))).toBe(true);
	});

	it('recovers when the first nonzero specialization loses an interior GCD term', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 0);
		const y = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const two = ModularSparsePolynomial.constant(2, 101n, 2n);
		const three = ModularSparsePolynomial.constant(2, 101n, 3n);
		const common = x
			.multiply(x)
			.add(y.subtract(one).multiply(x))
			.add(one);
		const left = common.multiply(x.add(two));
		const right = common.multiply(x.add(three));

		const gcd = modularGcdBivariate(left, right, 0, 1);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('retries with fresh samples after a failed reconstructed candidate', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 0);
		const y = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const two = ModularSparsePolynomial.constant(2, 101n, 2n);
		const three = ModularSparsePolynomial.constant(2, 101n, 3n);
		const common = x.add(y).add(one);
		const left = common.multiply(x.add(two));
		const right = common.multiply(x.add(three));
		const interpolateVariable =
			ModularSparsePolynomial.interpolateVariable.bind(ModularSparsePolynomial);
		const interpolationSpy = jest
			.spyOn(ModularSparsePolynomial, 'interpolateVariable')
			.mockImplementationOnce(() => x)
			.mockImplementation(interpolateVariable);

		try {
			const gcd = modularGcdBivariate(left, right, 0, 1);

			expect(interpolationSpy).toHaveBeenCalledTimes(2);
			expect(gcd?.equals(common.monic('lex'))).toBe(true);
		} finally {
			interpolationSpy.mockRestore();
		}
	});

	it('removes interpolation scaling factors that are not part of the GCD', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 0);
		const y = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const two = ModularSparsePolynomial.constant(2, 101n, 2n);
		const common = x.add(y).add(one);
		const left = common.multiply(y.multiply(x).add(one));
		const right = common.multiply(y.multiply(x).add(two));

		const gcd = modularGcdBivariate(left, right, 0, 1);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('restores common polynomial content in the interpolation variable', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 0);
		const y = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const two = ModularSparsePolynomial.constant(2, 101n, 2n);
		const content = y.add(ModularSparsePolynomial.constant(2, 101n, 3n));
		const primitiveCommon = x.add(one);
		const common = content.multiply(primitiveCommon);
		const left = common.multiply(x.add(y).add(one));
		const right = common.multiply(x.add(y.scale(2n)).add(two));

		const gcd = modularGcdBivariate(left, right, 0, 1);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('discards specializations whose GCD degree is larger than the generic degree', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 0);
		const y = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const common = x.add(one);
		const left = common.multiply(x.add(y));
		const right = common.multiply(x.add(y.scale(2n)));

		const gcd = modularGcdBivariate(left, right, 0, 1);

		expect(gcd?.equals(common)).toBe(true);
	});

	it('supports dormant coordinates in a retained polynomial ring', () => {
		const x = ModularSparsePolynomial.variable(4, 101n, 1);
		const y = ModularSparsePolynomial.variable(4, 101n, 3);
		const common = x.add(y).add(ModularSparsePolynomial.constant(4, 101n, 4n));
		const left = common.multiply(x.add(ModularSparsePolynomial.constant(4, 101n, 8n)));
		const right = common.multiply(y.add(ModularSparsePolynomial.constant(4, 101n, 9n)));

		const gcd = modularGcdBivariate(left, right, 1, 3);

		expect(gcd?.equals(common.monic('lex'))).toBe(true);
	});

	it('returns null when every field point is unusable for reconstruction', () => {
		const x = ModularSparsePolynomial.variable(2, 3n, 0);
		const y = ModularSparsePolynomial.variable(2, 3n, 1);
		const one = ModularSparsePolynomial.constant(2, 3n, 1n);
		const two = ModularSparsePolynomial.constant(2, 3n, 2n);
		const vanishing = y.multiply(y).multiply(y).subtract(y);
		const left = vanishing.multiply(x).add(one);
		const right = vanishing.multiply(x).add(two);

		expect(modularGcdBivariate(left, right, 0, 1)).toBeNull();
	});

	it('rejects non-field moduli and unexpected active variables', () => {
		const x8 = ModularSparsePolynomial.variable(2, 8n, 0);
		const y8 = ModularSparsePolynomial.variable(2, 8n, 1);
		const x = ModularSparsePolynomial.variable(3, 101n, 0);
		const y = ModularSparsePolynomial.variable(3, 101n, 1);
		const z = ModularSparsePolynomial.variable(3, 101n, 2);

		expect(() => modularGcdBivariate(x8, y8, 0, 1)).toThrow(RangeError);
		expect(() => modularGcdBivariate(x.add(z), y, 0, 1)).toThrow(RangeError);
		expect(() => modularGcdBivariate(x, y, 1, 0)).toThrow(RangeError);
		expect(() => modularGcdBivariate(x, y, 0, 0)).toThrow(RangeError);
	});
});

describe('modularGcdUnivariate', () => {
	it('computes a monic shared factor in a retained multivariate ring', () => {
		const x = ModularSparsePolynomial.variable(2, 101n, 1);
		const one = ModularSparsePolynomial.constant(2, 101n, 1n);
		const common = x.add(ModularSparsePolynomial.constant(2, 101n, 3n));
		const left = common.multiply(
			x.multiply(x).add(x.scale(7n)).add(ModularSparsePolynomial.constant(2, 101n, 9n))
		);
		const right = common.multiply(x.add(ModularSparsePolynomial.constant(2, 101n, 5n)));

		const gcd = modularGcdUnivariate(left, right, 1);

		expect(gcd.equals(common.monic())).toBe(true);
		expect(left.divideExact(gcd)?.multiply(gcd).equals(left)).toBe(true);
		expect(right.divideExact(gcd)?.multiply(gcd).equals(right)).toBe(true);
		expect(one.degree(1)).toBe(0n);
	});

	it('returns one for coprime nonzero polynomials', () => {
		const x = ModularSparsePolynomial.variable(1, 7n, 0);
		const left = x.multiply(x).add(ModularSparsePolynomial.constant(1, 7n, 1n));
		const right = x.add(ModularSparsePolynomial.constant(1, 7n, 1n));

		const gcd = modularGcdUnivariate(left, right, 0);

		expect(gcd.equals(ModularSparsePolynomial.constant(1, 7n, 1n))).toBe(true);
	});

	it('handles zero and constant inputs with monic normalization', () => {
		const zero = ModularSparsePolynomial.zero(1, 11n);
		const x = ModularSparsePolynomial.variable(1, 11n, 0);
		const polynomial = x.scale(7n).add(ModularSparsePolynomial.constant(1, 11n, 3n));
		const constant = ModularSparsePolynomial.constant(1, 11n, 8n);

		expect(modularGcdUnivariate(zero, zero, 0).isZero()).toBe(true);
		expect(modularGcdUnivariate(polynomial, zero, 0).equals(polynomial.monic())).toBe(true);
		expect(
			modularGcdUnivariate(polynomial, constant, 0).equals(
				ModularSparsePolynomial.constant(1, 11n, 1n)
			)
		).toBe(true);
	});

	it('preserves bigint exponents beyond the safe JavaScript integer range', () => {
		const exponent = 9007199254740991n + 321n;
		const left = ModularSparsePolynomial.monomial(1, 101n, 9n, [exponent + 4n]);
		const right = ModularSparsePolynomial.monomial(1, 101n, 7n, [exponent]);

		const gcd = modularGcdUnivariate(left, right, 0);

		expect(gcd.coefficient([exponent])).toBe(1n);
		expect(gcd.termCount).toBe(1);
	});

	it('rejects incompatible rings and inputs that depend on another variable', () => {
		const x = ModularSparsePolynomial.variable(2, 7n, 0);
		const y = ModularSparsePolynomial.variable(2, 7n, 1);
		const otherModulus = ModularSparsePolynomial.variable(2, 11n, 0);
		const otherDimension = ModularSparsePolynomial.variable(3, 7n, 0);

		expect(() => modularGcdUnivariate(x, otherModulus, 0)).toThrow(RangeError);
		expect(() => modularGcdUnivariate(x, otherDimension, 0)).toThrow(RangeError);
		expect(() => modularGcdUnivariate(x.add(y), x, 0)).toThrow(RangeError);
		expect(() => modularGcdUnivariate(x, x, 2)).toThrow(RangeError);
	});

	it('rejects division when a composite modulus supplies a nonunit leading coefficient', () => {
		const left = new ModularSparsePolynomial(1, 8n, [
			{ coefficient: 1n, exponents: [2n] },
			{ coefficient: 1n, exponents: [0n] },
		]);
		const right = new ModularSparsePolynomial(1, 8n, [
			{ coefficient: 2n, exponents: [1n] },
			{ coefficient: 1n, exponents: [0n] },
		]);

		expect(() => modularGcdUnivariate(left, right, 0)).toThrow(RangeError);
	});
});
