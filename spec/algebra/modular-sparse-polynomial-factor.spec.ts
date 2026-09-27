import {
	factorSquareFreeUnivariateFiniteField,
	henselLiftMultivariateFactors,
	henselLiftUnivariateFactors,
} from '../../src/algebra/polynomial/ModularSparsePolynomialFactor';
import { ModularSparsePolynomial } from '../../src/algebra/polynomial/ModularSparsePolynomial';
import { SparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomial';

function x(modulus: bigint, variableCount = 1, variableIndex = 0): ModularSparsePolynomial {
	return ModularSparsePolynomial.variable(variableCount, modulus, variableIndex);
}

function c(
	value: bigint,
	modulus: bigint,
	variableCount = 1
): ModularSparsePolynomial {
	return ModularSparsePolynomial.constant(variableCount, modulus, value);
}

function product(
	factors: readonly ModularSparsePolynomial[],
	variableCount: number,
	modulus: bigint
): ModularSparsePolynomial {
	return factors.reduce(
		(result, factor) => result.multiply(factor),
		ModularSparsePolynomial.constant(variableCount, modulus, 1n)
	);
}

describe('Sparse polynomial Hensel lifting', () => {
	it('lifts two monic factors to a larger prime-power modulus', () => {
		const integer = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [2n] },
			{ coefficient: 3n, exponents: [1n] },
			{ coefficient: -28n, exponents: [0n] },
		]);
		const prime = 5n;
		const variable = x(prime);
		const modularFactors = [
			variable.add(c(2n, prime)),
			variable.add(c(1n, prime)),
		];

		const lifted = henselLiftUnivariateFactors(
			integer,
			prime,
			modularFactors,
			0,
			625n
		);

		expect(lifted).toHaveLength(2);
		expect(lifted.every(factor => factor.modulus === 625n)).toBe(true);
		const constants = lifted.map(factor => factor.constantTerm()).sort((a, b) =>
			a < b ? -1 : a > b ? 1 : 0
		);
		expect(constants).toEqual([7n, 621n]);
		expect(
			product(lifted, 1, 625n).equals(
				new ModularSparsePolynomial(1, 625n, integer.terms())
			)
		).toBe(true);
	});

	it('lifts modular factors of a non-monic integer polynomial', () => {
		const integer = new SparsePolynomial(1, [
			{ coefficient: 6n, exponents: [2n] },
			{ coefficient: 19n, exponents: [1n] },
			{ coefficient: 15n, exponents: [0n] },
		]);
		const prime = 5n;
		const variable = x(prime);
		const modularFactors = [variable, variable.add(c(4n, prime))];

		const lifted = henselLiftUnivariateFactors(
			integer,
			prime,
			modularFactors,
			0,
			625n
		);

		const leading = integer.leadingTerm();
		expect(leading).not.toBeNull();
		if (leading !== null) {
			const reconstructed = product(lifted, 1, 625n).scale(
				leading.coefficient
			);
			expect(
				reconstructed.equals(
					new ModularSparsePolynomial(1, 625n, integer.terms())
				)
			).toBe(true);
		}
	});

	it('lifts three factors recursively', () => {
		const integer = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [3n] },
			{ coefficient: -6n, exponents: [2n] },
			{ coefficient: 11n, exponents: [1n] },
			{ coefficient: -6n, exponents: [0n] },
		]);
		const prime = 5n;
		const variable = x(prime);
		const modularFactors = [
			variable.subtract(c(1n, prime)),
			variable.subtract(c(2n, prime)),
			variable.subtract(c(3n, prime)),
		];

		const lifted = henselLiftUnivariateFactors(
			integer,
			prime,
			modularFactors,
			0,
			625n
		);

		expect(lifted).toHaveLength(3);
		expect(
			product(lifted, 1, 625n).equals(
				new ModularSparsePolynomial(1, 625n, integer.terms())
			)
		).toBe(true);
	});

	it('rejects incompatible target moduli and bad modular factorizations', () => {
		const integer = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [2n] },
			{ coefficient: -1n, exponents: [0n] },
		]);
		const prime = 5n;
		const variable = x(prime);

		expect(() =>
			henselLiftUnivariateFactors(
				integer,
				prime,
				[variable.subtract(c(1n, prime)), variable.add(c(1n, prime))],
				0,
				125n
			)
		).toThrow(RangeError);

		expect(() =>
			henselLiftUnivariateFactors(
				integer,
				prime,
				[variable.add(c(2n, prime))],
				0,
				25n
			)
		).toThrow(RangeError);
	});
});

describe('Sparse polynomial multivariate Hensel lifting', () => {
	it('lifts manually supplied trivariate specialization data', () => {
		const sx = SparsePolynomial.variable(3, 0);
		const sy = SparsePolynomial.variable(3, 1);
		const sz = SparsePolynomial.variable(3, 2);
		const one = SparsePolynomial.constant(3, 1n);
		const two = SparsePolynomial.constant(3, 2n);
		const first = sx.add(sy).add(sz).add(one);
		const second = sx.add(sy.multiply(sz)).add(two);
		const polynomial = first.multiply(second);
		const specializedFactors = [
			sx.add(SparsePolynomial.constant(3, 6n)),
			sx.add(SparsePolynomial.constant(3, 8n)),
		];
		const leadingCoefficients = [one, one];

		const lifted = henselLiftMultivariateFactors(
			polynomial,
			specializedFactors,
			leadingCoefficients,
			[0, 1, 2],
			[2n, 3n],
			1_000_003n
		);

		expect(lifted).not.toBeNull();
		if (lifted !== null) {
			expect(lifted).toHaveLength(2);
			expect(lifted.some(factor => factor.equals(first))).toBe(true);
			expect(lifted.some(factor => factor.equals(second))).toBe(true);
		}
	});

	it('lifts specialization data through three tail variables', () => {
		const sx = SparsePolynomial.variable(4, 0);
		const sy = SparsePolynomial.variable(4, 1);
		const sz = SparsePolynomial.variable(4, 2);
		const sw = SparsePolynomial.variable(4, 3);
		const first = sx
			.add(sy)
			.add(sz)
			.add(sw)
			.add(SparsePolynomial.constant(4, 1n));
		const second = sx
			.add(sy.multiply(sz))
			.add(sz.multiply(sw))
			.add(SparsePolynomial.constant(4, 2n));
		const polynomial = first.multiply(second);
		const specializedFactors = [
			sx.add(SparsePolynomial.constant(4, 11n)),
			sx.add(SparsePolynomial.constant(4, 23n)),
		];
		const one = SparsePolynomial.constant(4, 1n);

		const lifted = henselLiftMultivariateFactors(
			polynomial,
			specializedFactors,
			[one, one],
			[0, 1, 2, 3],
			[2n, 3n, 5n],
			1_000_003n
		);

		expect(lifted).not.toBeNull();
		if (lifted !== null) {
			expect(lifted).toHaveLength(2);
			expect(lifted.some(factor => factor.equals(first))).toBe(true);
			expect(lifted.some(factor => factor.equals(second))).toBe(true);
		}
	});

	it('rejects specialization data that does not reconstruct the target', () => {
		const sx = SparsePolynomial.variable(2, 0);
		const sy = SparsePolynomial.variable(2, 1);
		const polynomial = sx
			.add(sy)
			.multiply(sx.subtract(sy).add(SparsePolynomial.constant(2, 1n)));

		expect(
			henselLiftMultivariateFactors(
				polynomial,
				[
					sx.add(SparsePolynomial.constant(2, 1n)),
					sx.add(SparsePolynomial.constant(2, 2n)),
				],
				[
					SparsePolynomial.constant(2, 1n),
					SparsePolynomial.constant(2, 1n),
				],
				[0, 1],
				[3n],
				1_000_003n
			)
		).toBeNull();
	});
});

describe('ModularSparsePolynomial Berlekamp factorization', () => {
	it('splits a square-free polynomial into irreducible factors over F3', () => {
		const modulus = 3n;
		const variable = x(modulus);
		const linearOne = variable.add(c(1n, modulus));
		const linearTwo = variable.add(c(2n, modulus));
		const quadratic = variable.multiply(variable).add(c(1n, modulus));
		const polynomial = linearOne.multiply(linearTwo).multiply(quadratic);

		const factors = factorSquareFreeUnivariateFiniteField(polynomial, 0);

		expect(factors).toHaveLength(3);
		expect(product(factors, 1, modulus).equals(polynomial.monic())).toBe(true);
		expect(factors.some(factor => factor.equals(linearOne.monic()))).toBe(true);
		expect(factors.some(factor => factor.equals(linearTwo.monic()))).toBe(true);
		expect(factors.some(factor => factor.equals(quadratic.monic()))).toBe(true);
	});

	it('returns an irreducible quadratic unchanged', () => {
		const modulus = 3n;
		const variable = x(modulus);
		const polynomial = variable.multiply(variable).add(c(1n, modulus));

		const factors = factorSquareFreeUnivariateFiniteField(polynomial, 0);

		expect(factors).toHaveLength(1);
		expect(factors[0].equals(polynomial.monic())).toBe(true);
	});

	it('splits completely over F5', () => {
		const modulus = 5n;
		const variable = x(modulus);
		const polynomial = variable
			.subtract(c(1n, modulus))
			.multiply(variable.subtract(c(2n, modulus)))
			.multiply(variable.subtract(c(3n, modulus)));

		const factors = factorSquareFreeUnivariateFiniteField(polynomial, 0);

		expect(factors).toHaveLength(3);
		expect(factors.every(factor => factor.degree(0) === 1n)).toBe(true);
		expect(product(factors, 1, modulus).equals(polynomial.monic())).toBe(true);
	});

	it('preserves dormant ring coordinates', () => {
		const modulus = 3n;
		const variable = x(modulus, 4, 2);
		const polynomial = variable
			.add(c(1n, modulus, 4))
			.multiply(variable.multiply(variable).add(c(1n, modulus, 4)));

		const factors = factorSquareFreeUnivariateFiniteField(polynomial, 2);

		expect(factors).toHaveLength(2);
		expect(factors.every(factor => factor.variableCount === 4)).toBe(true);
		expect(product(factors, 4, modulus).equals(polynomial.monic())).toBe(true);
	});

	it('rejects repeated factors because the input must be square-free', () => {
		const modulus = 5n;
		const factor = x(modulus).add(c(1n, modulus));
		const polynomial = factor.multiply(factor);

		expect(() => factorSquareFreeUnivariateFiniteField(polynomial, 0)).toThrow(
			RangeError
		);
	});

	it('rejects composite moduli and multivariate input', () => {
		const composite = x(9n).add(c(1n, 9n));
		expect(() => factorSquareFreeUnivariateFiniteField(composite, 0)).toThrow(
			RangeError
		);

		const multivariate = x(5n, 2, 0).add(x(5n, 2, 1));
		expect(() => factorSquareFreeUnivariateFiniteField(multivariate, 0)).toThrow(
			RangeError
		);
	});

	it('returns no factors for constants', () => {
		expect(
			factorSquareFreeUnivariateFiniteField(c(2n, 5n), 0)
		).toEqual([]);
	});
});
