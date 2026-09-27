import {
	ModularSparsePolynomial,
} from '../../src/algebra/polynomial/ModularSparsePolynomial';
import { type MonomialOrder } from '../../src/core/classes/polynomial/SparsePolynomial';

describe('ModularSparsePolynomial', () => {
	it('normalizes all coefficients to canonical residues', () => {
		const polynomial = new ModularSparsePolynomial(2, 7n, [
			{ coefficient: -1n, exponents: [2n, 0n] },
			{ coefficient: 15n, exponents: [0n, 1n] },
			{ coefficient: 14n, exponents: [0n, 0n] },
		]);

		expect(polynomial.coefficient([2n, 0n])).toBe(6n);
		expect(polynomial.coefficient([0n, 1n])).toBe(1n);
		expect(polynomial.constantTerm()).toBe(0n);
		expect(polynomial.termCount).toBe(2);
	});

	it('converts canonical residues to centered integer representatives', () => {
		const polynomial = new ModularSparsePolynomial(2, 10n, [
			{ coefficient: 9n, exponents: [2n, 0n] },
			{ coefficient: 5n, exponents: [1n, 0n] },
			{ coefficient: 6n, exponents: [0n, 1n] },
		]);

		const lifted = polynomial.toSymmetricIntegerPolynomial();

		expect(lifted.variableCount).toBe(2);
		expect(lifted.coefficient([2n, 0n])).toBe(-1n);
		expect(lifted.coefficient([1n, 0n])).toBe(5n);
		expect(lifted.coefficient([0n, 1n])).toBe(-4n);
	});

	it('reduces coefficients again after duplicate monomials are combined', () => {
		const polynomial = new ModularSparsePolynomial(1, 7n, [
			{ coefficient: 5n, exponents: [3n] },
			{ coefficient: 3n, exponents: [3n] },
			{ coefficient: -1n, exponents: [0n] },
			{ coefficient: 1n, exponents: [0n] },
		]);

		expect(polynomial.coefficient([3n])).toBe(1n);
		expect(polynomial.constantTerm()).toBe(0n);
		expect(polynomial.termCount).toBe(1);
	});

	it('adds, subtracts, scales, and negates modulo the ring modulus', () => {
		const left = new ModularSparsePolynomial(1, 7n, [
			{ coefficient: 6n, exponents: [2n] },
			{ coefficient: 5n, exponents: [0n] },
		]);
		const right = new ModularSparsePolynomial(1, 7n, [
			{ coefficient: 4n, exponents: [2n] },
			{ coefficient: 3n, exponents: [1n] },
		]);

		const sum = left.add(right);
		const difference = left.subtract(right);
		const scaled = right.scale(5n);
		const negated = right.negate();

		expect(sum.coefficient([2n])).toBe(3n);
		expect(sum.coefficient([1n])).toBe(3n);
		expect(sum.constantTerm()).toBe(5n);
		expect(difference.coefficient([2n])).toBe(2n);
		expect(difference.coefficient([1n])).toBe(4n);
		expect(scaled.coefficient([2n])).toBe(6n);
		expect(scaled.coefficient([1n])).toBe(1n);
		expect(negated.coefficient([2n])).toBe(3n);
		expect(negated.coefficient([1n])).toBe(4n);
	});

	it('differentiates coefficients and exponents modulo the ring modulus', () => {
		const polynomial = new ModularSparsePolynomial(2, 7n, [
			{ coefficient: 5n, exponents: [3n, 2n] },
			{ coefficient: 6n, exponents: [1n, 0n] },
			{ coefficient: 4n, exponents: [0n, 5n] },
		]);

		const derivative = polynomial.derivative(0);

		expect(derivative.coefficient([2n, 2n])).toBe(1n);
		expect(derivative.constantTerm()).toBe(6n);
		expect(derivative.termCount).toBe(2);
	});

	it('raises modular sparse polynomials by exact non-negative powers', () => {
		const x = ModularSparsePolynomial.variable(1, 5n, 0);
		const base = x.add(ModularSparsePolynomial.constant(1, 5n, 1n));
		const cube = base.pow(3n);
		expect(cube.coefficient([3n])).toBe(1n);
		expect(cube.coefficient([2n])).toBe(3n);
		expect(cube.coefficient([1n])).toBe(3n);
		expect(cube.constantTerm()).toBe(1n);
		expect(base.pow(0n).equals(ModularSparsePolynomial.constant(1, 5n, 1n))).toBe(true);
		expect(() => base.pow(-1n)).toThrow(RangeError);
	});

	it('multiplies sparse polynomials with coefficient reduction', () => {
		const x = ModularSparsePolynomial.variable(2, 5n, 0);
		const y = ModularSparsePolynomial.variable(2, 5n, 1);
		const left = x.add(y).add(ModularSparsePolynomial.constant(2, 5n, 3n));
		const right = x.subtract(y).add(ModularSparsePolynomial.constant(2, 5n, 4n));

		const product = left.multiply(right);

		expect(product.coefficient([2n, 0n])).toBe(1n);
		expect(product.coefficient([1n, 1n])).toBe(0n);
		expect(product.coefficient([0n, 2n])).toBe(4n);
		expect(product.coefficient([1n, 0n])).toBe(2n);
		expect(product.coefficient([0n, 1n])).toBe(1n);
		expect(product.constantTerm()).toBe(2n);
	});

	it('makes a nonzero polynomial monic with an exact modular inverse', () => {
		const polynomial = new ModularSparsePolynomial(2, 7n, [
			{ coefficient: 3n, exponents: [2n, 0n] },
			{ coefficient: 5n, exponents: [0n, 1n] },
		]);

		const monic = polynomial.monic('lex');

		expect(monic.leadingTerm('lex')?.coefficient).toBe(1n);
		expect(monic.coefficient([0n, 1n])).toBe(4n);
	});

	it.each<MonomialOrder>(['lex', 'grlex', 'grevlex'])(
		'divides exact products modulo a prime under %s order',
		order => {
			const x = ModularSparsePolynomial.variable(2, 101n, 0);
			const y = ModularSparsePolynomial.variable(2, 101n, 1);
			const divisor = x.scale(3n).add(y.scale(5n)).add(
				ModularSparsePolynomial.constant(2, 101n, 7n)
			);
			const quotient = new ModularSparsePolynomial(2, 101n, [
				{ coefficient: 17n, exponents: [2n, 0n] },
				{ coefficient: 83n, exponents: [0n, 1n] },
				{ coefficient: 29n, exponents: [0n, 0n] },
			]);
			const dividend = divisor.multiply(quotient);

			const result = dividend.divideExact(divisor, order);

			expect(result?.equals(quotient)).toBe(true);
		}
	);

	it('returns null when modular polynomial division leaves a remainder', () => {
		const x = ModularSparsePolynomial.variable(1, 7n, 0);
		const dividend = x.multiply(x).add(ModularSparsePolynomial.constant(1, 7n, 1n));
		const divisor = x.add(ModularSparsePolynomial.constant(1, 7n, 1n));

		expect(dividend.divideExact(divisor)).toBeNull();
	});

	it('preserves bigint exponents during modular arithmetic and division', () => {
		const exponent = 9007199254740991n + 555n;
		const divisor = new ModularSparsePolynomial(1, 101n, [
			{ coefficient: 9n, exponents: [exponent] },
			{ coefficient: 4n, exponents: [0n] },
		]);
		const quotient = new ModularSparsePolynomial(1, 101n, [
			{ coefficient: 12n, exponents: [3n] },
			{ coefficient: 77n, exponents: [0n] },
		]);
		const dividend = divisor.multiply(quotient);

		const result = dividend.divideExact(divisor);

		expect(result?.equals(quotient)).toBe(true);
		expect(dividend.degree(0)).toBe(exponent + 3n);
	});

	it('extracts coefficient polynomials at arbitrary powers of a variable', () => {
		const polynomial = new ModularSparsePolynomial(2, 11n, [
			{ coefficient: 3n, exponents: [4n, 2n] },
			{ coefficient: 5n, exponents: [4n, 1n] },
			{ coefficient: 7n, exponents: [3n, 5n] },
			{ coefficient: 9n, exponents: [1n, 0n] },
		]);

		const coefficientAtFour = polynomial.coefficientIn(0, 4n);
		const missing = polynomial.coefficientIn(0, 2n);

		expect(coefficientAtFour.coefficient([0n, 2n])).toBe(3n);
		expect(coefficientAtFour.coefficient([0n, 1n])).toBe(5n);
		expect(coefficientAtFour.termCount).toBe(2);
		expect(missing.isZero()).toBe(true);
		expect(() => polynomial.coefficientIn(0, -1n)).toThrow(RangeError);
	});

	it('returns quotient and remainder for modular polynomial division', () => {
		const x = ModularSparsePolynomial.variable(1, 7n, 0);
		const dividend = x.multiply(x).add(ModularSparsePolynomial.constant(1, 7n, 1n));
		const divisor = x.add(ModularSparsePolynomial.constant(1, 7n, 1n));

		const division = dividend.divideWithRemainder(divisor);

		expect(division.quotient.coefficient([1n])).toBe(1n);
		expect(division.quotient.constantTerm()).toBe(6n);
		expect(division.remainder.constantTerm()).toBe(2n);
		expect(division.remainder.termCount).toBe(1);
		expect(dividend.divideExact(divisor)).toBeNull();
	});

	it('evaluates one variable exactly while preserving the polynomial ring', () => {
		const polynomial = new ModularSparsePolynomial(2, 7n, [
			{ coefficient: 3n, exponents: [2n, 1n] },
			{ coefficient: 5n, exponents: [1n, 1n] },
			{ coefficient: 4n, exponents: [0n, 0n] },
		]);

		const evaluated = polynomial.evaluateVariable(0, 2n);

		expect(evaluated.variableCount).toBe(2);
		expect(evaluated.coefficient([0n, 1n])).toBe(1n);
		expect(evaluated.constantTerm()).toBe(4n);
		expect(evaluated.degree(0)).toBe(0n);
		expect(evaluated.degree(1)).toBe(1n);
	});

	it('evaluates exponents beyond the JavaScript safe integer range', () => {
		const exponent = 9007199254740993n;
		const polynomial = ModularSparsePolynomial.monomial(1, 5n, 3n, [exponent]);

		const evaluated = polynomial.evaluateVariable(0, 2n);

		expect(evaluated.constantTerm()).toBe(1n);
	});

	it('reconstructs a polynomial from modular evaluations in either variable', () => {
		const polynomial = new ModularSparsePolynomial(2, 11n, [
			{ coefficient: 3n, exponents: [2n, 1n] },
			{ coefficient: 4n, exponents: [2n, 0n] },
			{ coefficient: 5n, exponents: [1n, 2n] },
			{ coefficient: 2n, exponents: [1n, 0n] },
			{ coefficient: 7n, exponents: [0n, 1n] },
			{ coefficient: 1n, exponents: [0n, 0n] },
		]);

		const xSamples = [0n, 1n, 2n].map(value => ({
			value,
			polynomial: polynomial.evaluateVariable(0, value),
		}));
		const ySamples = [0n, 1n, 2n].map(value => ({
			value,
			polynomial: polynomial.evaluateVariable(1, value),
		}));

		const fromX = ModularSparsePolynomial.interpolateVariable(0, xSamples);
		const fromY = ModularSparsePolynomial.interpolateVariable(1, ySamples);

		expect(fromX.equals(polynomial)).toBe(true);
		expect(fromY.equals(polynomial)).toBe(true);
	});

	it('rejects invalid modular interpolation samples', () => {
		const polynomial = new ModularSparsePolynomial(1, 11n, [
			{ coefficient: 4n, exponents: [2n] },
			{ coefficient: 3n, exponents: [0n] },
		]);
		const atOne = polynomial.evaluateVariable(0, 1n);

		expect(() => ModularSparsePolynomial.interpolateVariable(0, [])).toThrow(RangeError);
		expect(() =>
			ModularSparsePolynomial.interpolateVariable(0, [
				{ value: 1n, polynomial: atOne },
				{ value: 12n, polynomial: atOne },
			])
		).toThrow(RangeError);
		expect(() =>
			ModularSparsePolynomial.interpolateVariable(0, [
				{ value: 1n, polynomial },
			])
		).toThrow(RangeError);
		expect(() =>
			ModularSparsePolynomial.interpolateVariable(0, [
				{ value: 1n, polynomial: atOne },
				{
					value: 2n,
					polynomial: new ModularSparsePolynomial(1, 13n, [
						{ coefficient: 1n, exponents: [0n] },
					]),
				},
			])
		).toThrow(RangeError);
	});

	it('extracts a coefficient polynomial at the highest power of a selected variable', () => {
		const polynomial = new ModularSparsePolynomial(2, 11n, [
			{ coefficient: 3n, exponents: [4n, 2n] },
			{ coefficient: 5n, exponents: [4n, 1n] },
			{ coefficient: 7n, exponents: [3n, 5n] },
			{ coefficient: 9n, exponents: [1n, 0n] },
		]);

		const coefficientInX = polynomial.leadingCoefficientIn(0);
		const coefficientInY = polynomial.leadingCoefficientIn(1);

		expect(coefficientInX?.coefficient([0n, 2n])).toBe(3n);
		expect(coefficientInX?.coefficient([0n, 1n])).toBe(5n);
		expect(coefficientInX?.termCount).toBe(2);
		expect(coefficientInY?.coefficient([3n, 0n])).toBe(7n);
		expect(coefficientInY?.termCount).toBe(1);
		expect(ModularSparsePolynomial.zero(2, 11n).leadingCoefficientIn(0)).toBeNull();
	});

	it('keeps the modulus and variable count as part of ring identity', () => {
		const modFive = ModularSparsePolynomial.variable(2, 5n, 0);
		const modSeven = ModularSparsePolynomial.variable(2, 7n, 0);
		const threeVariables = ModularSparsePolynomial.variable(3, 5n, 0);

		expect(modFive.equals(modSeven)).toBe(false);
		expect(() => modFive.add(modSeven)).toThrow(RangeError);
		expect(() => modFive.multiply(threeVariables)).toThrow(RangeError);
	});

	it('rejects invalid moduli and noninvertible leading coefficients', () => {
		expect(() => ModularSparsePolynomial.zero(1, 1n)).toThrow(RangeError);

		const composite = new ModularSparsePolynomial(1, 8n, [
			{ coefficient: 2n, exponents: [1n] },
			{ coefficient: 1n, exponents: [0n] },
		]);
		const dividend = composite.multiply(composite);

		expect(() => composite.monic()).toThrow(RangeError);
		expect(() => dividend.divideExact(composite)).toThrow(RangeError);
	});
});
