import { Expression } from '../../src/core/classes/expression/Expression';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import {
	expressionToIntegerSparsePolynomial,
	expressionToSparsePolynomial,
	polynomialToIntegerSparsePolynomial,
	polynomialToSparsePolynomial,
	sparsePolynomialToExpression,
} from '../../src/core/classes/polynomial/SparsePolynomialAdapter';
import {
	SparsePolynomial,
	type MonomialOrder,
} from '../../src/core/classes/polynomial/SparsePolynomial';

describe('SparsePolynomial', () => {
	it('retains the polynomial ring even when the polynomial is zero', () => {
		const polynomial = SparsePolynomial.zero(4);

		expect(polynomial.variableCount).toBe(4);
		expect(polynomial.termCount).toBe(0);
		expect(polynomial.isZero()).toBe(true);
		expect(polynomial.isConstant()).toBe(true);
		expect(polynomial.degree(2)).toBeNull();
		expect(polynomial.totalDegree()).toBeNull();
		expect(polynomial.variables()).toEqual([]);
	});

	it('stores exponents exactly beyond the safe JavaScript integer range', () => {
		const exponent = 9007199254740991n + 123456789n;
		const polynomial = SparsePolynomial.monomial(2, 7n, [exponent, 3n]);

		expect(polynomial.degree(0)).toBe(exponent);
		expect(polynomial.degree(1)).toBe(3n);
		expect(polynomial.totalDegree()).toBe(exponent + 3n);
		expect(polynomial.coefficient([exponent, 3n])).toBe(7n);
	});

	it('combines duplicate monomials and removes zero coefficients', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 5n, exponents: [2n, 1n] },
			{ coefficient: -2n, exponents: [2n, 1n] },
			{ coefficient: -3n, exponents: [2n, 1n] },
			{ coefficient: 9n, exponents: [0n, 0n] },
		]);

		expect(polynomial.termCount).toBe(1);
		expect(polynomial.constantTerm()).toBe(9n);
		expect(polynomial.coefficient([2n, 1n])).toBe(0n);
	});

	it('constructs constants and variables without exposing the storage encoding', () => {
		const constant = SparsePolynomial.constant(3, -11n);
		const variable = SparsePolynomial.variable(3, 1);

		expect(constant.isConstant()).toBe(true);
		expect(constant.constantTerm()).toBe(-11n);
		expect(variable.coefficient([0n, 1n, 0n])).toBe(1n);
		expect(variable.variables()).toEqual([1]);
	});

	it.each<{
		order: MonomialOrder;
		expected: readonly bigint[];
	}>([
		{ order: 'lex', expected: [2n, 0n, 1n] },
		{ order: 'grlex', expected: [2n, 0n, 1n] },
		{ order: 'grevlex', expected: [1n, 2n, 0n] },
	])('uses exact $order monomial ordering', ({ order, expected }) => {
		const polynomial = new SparsePolynomial(3, [
			{ coefficient: 5n, exponents: [1n, 2n, 0n] },
			{ coefficient: 7n, exponents: [2n, 0n, 1n] },
		]);

		expect(polynomial.leadingTerm(order)?.exponents).toEqual(expected);
	});

	it.each<{
		order: MonomialOrder;
		left: readonly bigint[];
		right: readonly bigint[];
	}>([
		{
			order: 'lex',
			left: [9007199254740991n + 5n, 0n],
			right: [9007199254740991n + 4n, 1000n],
		},
		{
			order: 'grlex',
			left: [9007199254740991n + 5n, 2n],
			right: [9007199254740991n + 6n, 0n],
		},
		{
			order: 'grevlex',
			left: [9007199254740991n + 6n, 1n],
			right: [9007199254740991n + 5n, 2n],
		},
	])('compares bigint exponent vectors exactly under $order', ({ order, left, right }) => {
		expect(SparsePolynomial.compareMonomials(left, right, order)).toBe(1);
		expect(SparsePolynomial.compareMonomials(right, left, order)).toBe(-1);
		expect(SparsePolynomial.compareMonomials(left, left, order)).toBe(0);
	});

	it('uses total degree before lexicographic comparison for grlex', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 2n, exponents: [2n, 0n] },
			{ coefficient: 3n, exponents: [1n, 10n] },
		]);

		expect(polynomial.leadingTerm('lex')?.exponents).toEqual([2n, 0n]);
		expect(polynomial.leadingTerm('grlex')?.exponents).toEqual([1n, 10n]);
	});

	it('does not expose mutable term storage', () => {
		const polynomial = SparsePolynomial.monomial(2, 4n, [3n, 1n]);
		const returnedTerms = polynomial.terms();

		expect(Object.isFrozen(returnedTerms[0].exponents)).toBe(true);
		expect(polynomial.coefficient([3n, 1n])).toBe(4n);
		expect(polynomial.termCount).toBe(1);
	});

	it('adds like monomials exactly without mutating either input', () => {
		const left = new SparsePolynomial(2, [
			{ coefficient: 5n, exponents: [2n, 0n] },
			{ coefficient: 3n, exponents: [0n, 1n] },
		]);
		const right = new SparsePolynomial(2, [
			{ coefficient: -5n, exponents: [2n, 0n] },
			{ coefficient: 7n, exponents: [1n, 1n] },
		]);

		const sum = left.add(right);

		expect(sum.termCount).toBe(2);
		expect(sum.coefficient([2n, 0n])).toBe(0n);
		expect(sum.coefficient([0n, 1n])).toBe(3n);
		expect(sum.coefficient([1n, 1n])).toBe(7n);
		expect(left.coefficient([2n, 0n])).toBe(5n);
		expect(right.coefficient([2n, 0n])).toBe(-5n);
	});

	it('subtracts and negates with exact bigint coefficients', () => {
		const left = new SparsePolynomial(1, [
			{ coefficient: 11n, exponents: [3n] },
			{ coefficient: -4n, exponents: [0n] },
		]);
		const right = new SparsePolynomial(1, [
			{ coefficient: 6n, exponents: [3n] },
			{ coefficient: 9n, exponents: [1n] },
		]);

		const difference = left.subtract(right);
		const negated = difference.negate();

		expect(difference.coefficient([3n])).toBe(5n);
		expect(difference.coefficient([1n])).toBe(-9n);
		expect(difference.constantTerm()).toBe(-4n);
		expect(negated.coefficient([3n])).toBe(-5n);
		expect(negated.coefficient([1n])).toBe(9n);
		expect(negated.constantTerm()).toBe(4n);
	});

	it('combines scaled monomial subtraction without changing either input', () => {
		const left = new SparsePolynomial(2, [
			{ coefficient: 3n, exponents: [2n, 0n] },
			{ coefficient: 5n, exponents: [0n, 1n] },
		]);
		const right = new SparsePolynomial(2, [
			{ coefficient: 2n, exponents: [1n, 0n] },
			{ coefficient: -7n, exponents: [0n, 0n] },
		]);

		const result = left.scaleSubtractMonomial(4n, right, 6n, [1n, 0n]);

		expect(result.coefficient([2n, 0n])).toBe(0n);
		expect(result.coefficient([1n, 0n])).toBe(42n);
		expect(result.coefficient([0n, 1n])).toBe(20n);
		expect(result.termCount).toBe(2);
		expect(left.coefficient([2n, 0n])).toBe(3n);
		expect(right.coefficient([1n, 0n])).toBe(2n);
	});

	it('combines two monomial-scaled polynomials without changing either input', () => {
		const left = new SparsePolynomial(2, [
			{ coefficient: 3n, exponents: [1n, 0n] },
			{ coefficient: 5n, exponents: [0n, 1n] },
		]);
		const right = new SparsePolynomial(2, [
			{ coefficient: 2n, exponents: [0n, 1n] },
			{ coefficient: -7n, exponents: [0n, 0n] },
		]);

		const result = left.monomialScaleSubtract(4n, [0n, 1n], right, 6n, [1n, 0n]);

		expect(result.coefficient([1n, 1n])).toBe(0n);
		expect(result.coefficient([0n, 2n])).toBe(20n);
		expect(result.coefficient([1n, 0n])).toBe(42n);
		expect(result.termCount).toBe(2);
		expect(left.coefficient([1n, 0n])).toBe(3n);
		expect(right.coefficient([0n, 1n])).toBe(2n);
	});

	it('maps coefficients while preserving sparse monomials', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 8n, exponents: [2n, 0n] },
			{ coefficient: 7n, exponents: [0n, 1n] },
			{ coefficient: -3n, exponents: [0n, 0n] },
		]);

		const mapped = polynomial.mapCoefficients(coefficient => coefficient % 7n);

		expect(mapped.coefficient([2n, 0n])).toBe(1n);
		expect(mapped.coefficient([0n, 1n])).toBe(0n);
		expect(mapped.constantTerm()).toBe(-3n);
		expect(mapped.termCount).toBe(2);
	});

	it('scales coefficients without moving large integers through Number', () => {
		const coefficient = 10n ** 80n + 123456789n;
		const scalar = -(10n ** 65n + 987654321n);
		const polynomial = SparsePolynomial.monomial(1, coefficient, [4n]);

		const scaled = polynomial.scale(scalar);

		expect(scaled.coefficient([4n])).toBe(coefficient * scalar);
		expect(polynomial.coefficient([4n])).toBe(coefficient);
		expect(polynomial.scale(0n).equals(SparsePolynomial.zero(1))).toBe(true);
	});

	it('multiplies sparse polynomials and combines matching product monomials', () => {
		const x = SparsePolynomial.variable(2, 0);
		const y = SparsePolynomial.variable(2, 1);
		const one = SparsePolynomial.constant(2, 1n);
		const left = x.add(y).add(one);
		const right = x.subtract(y);

		const product = left.multiply(right);

		expect(product.termCount).toBe(4);
		expect(product.coefficient([2n, 0n])).toBe(1n);
		expect(product.coefficient([1n, 1n])).toBe(0n);
		expect(product.coefficient([0n, 2n])).toBe(-1n);
		expect(product.coefficient([1n, 0n])).toBe(1n);
		expect(product.coefficient([0n, 1n])).toBe(-1n);
	});

	it('adds exponents exactly during multiplication beyond Number safe integer range', () => {
		const exponent = 9007199254740991n + 17n;
		const left = SparsePolynomial.monomial(1, 3n, [exponent]);
		const right = SparsePolynomial.monomial(1, 5n, [exponent + 2n]);

		const product = left.multiply(right);

		expect(product.coefficient([2n * exponent + 2n])).toBe(15n);
		expect(product.degree(0)).toBe(2n * exponent + 2n);
	});

	it('preserves the ring for zero arithmetic', () => {
		const zero = SparsePolynomial.zero(3);
		const polynomial = SparsePolynomial.monomial(3, 8n, [1n, 0n, 2n]);

		expect(zero.add(polynomial).equals(polynomial)).toBe(true);
		expect(polynomial.subtract(polynomial).equals(zero)).toBe(true);
		expect(zero.multiply(polynomial).equals(zero)).toBe(true);
		expect(polynomial.multiply(zero).equals(zero)).toBe(true);
	});

	it('rejects arithmetic across different polynomial rings', () => {
		const twoVariables = SparsePolynomial.variable(2, 0);
		const threeVariables = SparsePolynomial.variable(3, 0);

		expect(() => twoVariables.add(threeVariables)).toThrow(RangeError);
		expect(() => twoVariables.subtract(threeVariables)).toThrow(RangeError);
		expect(() => twoVariables.multiply(threeVariables)).toThrow(RangeError);
	});

	it('computes positive coefficient content and primitive parts exactly', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: -18n, exponents: [2n, 0n] },
			{ coefficient: 30n, exponents: [1n, 1n] },
			{ coefficient: -42n, exponents: [0n, 0n] },
		]);

		const primitive = polynomial.primitivePart();

		expect(polynomial.content()).toBe(6n);
		expect(primitive.content()).toBe(1n);
		expect(primitive.coefficient([2n, 0n])).toBe(-3n);
		expect(primitive.coefficient([1n, 1n])).toBe(5n);
		expect(primitive.constantTerm()).toBe(-7n);
		expect(SparsePolynomial.zero(2).content()).toBe(0n);
	});

	it('normalizes the leading sign independently of coefficient content', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: -6n, exponents: [3n, 0n] },
			{ coefficient: 9n, exponents: [0n, 5n] },
		]);

		const lex = polynomial.normalizeLeadingSign('lex');
		const grlex = polynomial.normalizeLeadingSign('grlex');

		expect(lex.coefficient([3n, 0n])).toBe(6n);
		expect(lex.coefficient([0n, 5n])).toBe(-9n);
		expect(grlex.equals(polynomial)).toBe(true);
		expect(lex.content()).toBe(3n);
	});

	it('divides by integer scalars only when every coefficient divides exactly', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 18n, exponents: [4n, 0n] },
			{ coefficient: -30n, exponents: [0n, 2n] },
		]);

		const quotient = polynomial.divideByScalarExact(-6n);

		expect(quotient.coefficient([4n, 0n])).toBe(-3n);
		expect(quotient.coefficient([0n, 2n])).toBe(5n);
		expect(() => polynomial.divideByScalarExact(4n)).toThrow(RangeError);
		expect(() => polynomial.divideByScalarExact(0n)).toThrow(RangeError);
	});

	it('divides exactly by a monomial using bigint exponent subtraction', () => {
		const exponent = 9007199254740991n + 999n;
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 30n, exponents: [exponent + 7n, 5n] },
			{ coefficient: -18n, exponents: [exponent + 2n, 3n] },
		]);

		const quotient = polynomial.divideByMonomial({
			coefficient: 6n,
			exponents: [exponent, 2n],
		});

		expect(quotient?.coefficient([7n, 3n])).toBe(5n);
		expect(quotient?.coefficient([2n, 1n])).toBe(-3n);
	});

	it('returns null when a monomial does not divide every term exactly', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 10n, exponents: [3n, 2n] },
			{ coefficient: 15n, exponents: [2n, 4n] },
		]);

		expect(
			polynomial.divideByMonomial({ coefficient: 2n, exponents: [1n, 1n] })
		).toBeNull();
		expect(
			polynomial.divideByMonomial({ coefficient: 5n, exponents: [3n, 1n] })
		).toBeNull();
		expect(() =>
			polynomial.divideByMonomial({ coefficient: 0n, exponents: [0n, 0n] })
		).toThrow(RangeError);
	});

	it.each<MonomialOrder>(['lex', 'grlex', 'grevlex'])(
		'divides exact multivariate products under %s order',
		order => {
			const x = SparsePolynomial.variable(2, 0);
			const y = SparsePolynomial.variable(2, 1);
			const divisor = x.add(y).add(SparsePolynomial.constant(2, 1n));
			const quotient = new SparsePolynomial(2, [
				{ coefficient: 3n, exponents: [2n, 0n] },
				{ coefficient: -5n, exponents: [0n, 1n] },
				{ coefficient: 7n, exponents: [0n, 0n] },
			]);
			const dividend = divisor.multiply(quotient);

			const result = dividend.divideExact(divisor, order);

			expect(result?.equals(quotient)).toBe(true);
		}
	);

	it('returns null when polynomial division leaves a remainder', () => {
		const x = SparsePolynomial.variable(1, 0);
		const dividend = x.multiply(x).add(SparsePolynomial.constant(1, 1n));
		const divisor = x.add(SparsePolynomial.constant(1, 1n));

		expect(dividend.divideExact(divisor)).toBeNull();
	});

	it('returns null when leading coefficients do not divide in the integer ring', () => {
		const dividend = new SparsePolynomial(1, [
			{ coefficient: 3n, exponents: [2n] },
			{ coefficient: 1n, exponents: [0n] },
		]);
		const divisor = new SparsePolynomial(1, [
			{ coefficient: 2n, exponents: [1n] },
			{ coefficient: 1n, exponents: [0n] },
		]);

		expect(dividend.divideExact(divisor)).toBeNull();
	});

	it('preserves bigint exponents during exact polynomial division', () => {
		const exponent = 9007199254740991n + 12345n;
		const divisor = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [exponent] },
			{ coefficient: 1n, exponents: [0n] },
		]);
		const quotient = new SparsePolynomial(1, [
			{ coefficient: 2n, exponents: [3n] },
			{ coefficient: -5n, exponents: [0n] },
		]);
		const dividend = divisor.multiply(quotient);

		const result = dividend.divideExact(divisor);

		expect(result?.equals(quotient)).toBe(true);
		expect(dividend.degree(0)).toBe(exponent + 3n);
	});

	it('handles zero dividend and rejects invalid polynomial divisors', () => {
		const zeroTwo = SparsePolynomial.zero(2);
		const divisorTwo = SparsePolynomial.variable(2, 0);
		const divisorThree = SparsePolynomial.variable(3, 0);

		expect(zeroTwo.divideExact(divisorTwo)?.equals(zeroTwo)).toBe(true);
		expect(() => divisorTwo.divideExact(zeroTwo)).toThrow(RangeError);
		expect(() => divisorTwo.divideExact(divisorThree)).toThrow(RangeError);
	});

	it('compares exact terms without treating equal support in different rings as equal', () => {
		const left = SparsePolynomial.monomial(2, 4n, [3n, 1n]);
		const same = SparsePolynomial.monomial(2, 4n, [3n, 1n]);
		const differentRing = SparsePolynomial.monomial(3, 4n, [3n, 1n, 0n]);

		expect(left.equals(same)).toBe(true);
		expect(left.equals(differentRing)).toBe(false);
	});

	it('rejects unsupported monomial orders instead of treating them as grevlex', () => {
		const polynomial = SparsePolynomial.variable(2, 0);

		expect(() => Reflect.apply(polynomial.leadingTerm, polynomial, ['unknown'])).toThrow(
			RangeError
		);
	});

	it('rejects malformed ring and exponent data instead of coercing it', () => {
		expect(() => new SparsePolynomial(-1)).toThrow(RangeError);
		expect(() => SparsePolynomial.variable(2, 2)).toThrow(RangeError);
		expect(() => SparsePolynomial.monomial(2, 1n, [1n])).toThrow(RangeError);
		expect(
			() =>
				new SparsePolynomial(1, [
					{ coefficient: 1n, exponents: [-1n] },
				])
		).toThrow(RangeError);
	});
});


describe('SparsePolynomial coefficient magnitude', () => {
	it('returns the largest absolute coefficient', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: -17n, exponents: [2n, 0n] },
			{ coefficient: 9n, exponents: [0n, 1n] },
			{ coefficient: -4n, exponents: [0n, 0n] },
		]);
		expect(polynomial.maxAbsoluteCoefficient()).toBe(17n);
		expect(SparsePolynomial.zero(2).maxAbsoluteCoefficient()).toBe(0n);
	});
});

describe('SparsePolynomial powers', () => {
	it('raises sparse polynomials by exact non-negative powers', () => {
		const variable = SparsePolynomial.variable(1, 0);
		const base = variable.add(SparsePolynomial.constant(1, 1n));
		const cube = base.pow(3n);
		expect(cube.coefficient([3n])).toBe(1n);
		expect(cube.coefficient([2n])).toBe(3n);
		expect(cube.coefficient([1n])).toBe(3n);
		expect(cube.constantTerm()).toBe(1n);
		expect(base.pow(0n).equals(SparsePolynomial.constant(1, 1n))).toBe(true);
	});
	it('rejects negative powers', () => {
		expect(() => SparsePolynomial.variable(1, 0).pow(-1n)).toThrow(RangeError);
	});
});

describe('SparsePolynomial variable-relative operations', () => {
	const polynomial = new SparsePolynomial(3, [
		{ coefficient: 2n, exponents: [2n, 1n, 0n] },
		{ coefficient: -3n, exponents: [2n, 0n, 2n] },
		{ coefficient: 5n, exponents: [1n, 1n, 0n] },
		{ coefficient: 7n, exponents: [0n, 0n, 0n] },
	]);

	it('extracts coefficient polynomials while preserving ring coordinates', () => {
		const coefficient = polynomial.coefficientIn(0, 2n);

		expect(coefficient.variableCount).toBe(3);
		expect(coefficient.coefficient([0n, 1n, 0n])).toBe(2n);
		expect(coefficient.coefficient([0n, 0n, 2n])).toBe(-3n);
		expect(coefficient.degree(0)).toBe(0n);
	});

	it('returns the leading coefficient polynomial in a selected variable', () => {
		const coefficient = polynomial.leadingCoefficientIn(0);

		expect(coefficient).not.toBeNull();
		if (coefficient !== null) {
			expect(coefficient.coefficient([0n, 1n, 0n])).toBe(2n);
			expect(coefficient.coefficient([0n, 0n, 2n])).toBe(-3n);
		}
	});

	it('evaluates a variable exactly and combines resulting like terms', () => {
		const evaluated = polynomial.evaluateVariable(0, 2n);

		expect(evaluated.coefficient([0n, 1n, 0n])).toBe(18n);
		expect(evaluated.coefficient([0n, 0n, 2n])).toBe(-12n);
		expect(evaluated.constantTerm()).toBe(7n);
	});

	it('evaluates a middle variable and combines matching projected monomials', () => {
		const sparse = new SparsePolynomial(3, [
			{ coefficient: 2n, exponents: [2n, 3n, 4n] },
			{ coefficient: -8n, exponents: [2n, 1n, 4n] },
			{ coefficient: 5n, exponents: [2n, 0n, 4n] },
			{ coefficient: 7n, exponents: [1n, 2n, 0n] },
		]);

		const evaluated = sparse.evaluateVariable(1, 2n);

		expect(evaluated.coefficient([2n, 0n, 4n])).toBe(5n);
		expect(evaluated.coefficient([1n, 0n, 0n])).toBe(28n);
		expect(evaluated.termCount).toBe(2);
	});

	it('evaluates several variables in one sparse traversal', () => {
		const sparse = new SparsePolynomial(4, [
			{ coefficient: 3n, exponents: [2n, 3n, 1n, 4n] },
			{ coefficient: 5n, exponents: [2n, 1n, 1n, 2n] },
			{ coefficient: 7n, exponents: [1n, 0n, 2n, 0n] },
			{ coefficient: 11n, exponents: [0n, 2n, 0n, 1n] },
		]);

		const evaluated = sparse.evaluateVariables([1, 3], [-1n, 0n]);
		const sequential = sparse
			.evaluateVariable(1, -1n)
			.evaluateVariable(3, 0n);

		expect(evaluated.equals(sequential)).toBe(true);
		expect(evaluated.coefficient([1n, 0n, 2n, 0n])).toBe(7n);
		expect(evaluated.termCount).toBe(1);
	});

	it('supports negative substitution values and bigint exponents', () => {
		const exponent = BigInt(Number.MAX_SAFE_INTEGER) + 2n;
		const sparse = new SparsePolynomial(2, [
			{ coefficient: 3n, exponents: [3n, 1n] },
			{ coefficient: 4n, exponents: [0n, exponent] },
		]);

		const evaluated = sparse.evaluateVariable(0, -2n);

		expect(evaluated.coefficient([0n, 1n])).toBe(-24n);
		expect(evaluated.coefficient([0n, exponent])).toBe(4n);
	});

	it('returns zero for an absent coefficient power', () => {
		const coefficient = polynomial.coefficientIn(0, 9n);

		expect(coefficient.isZero()).toBe(true);
		expect(coefficient.variableCount).toBe(3);
	});
});

describe('SparsePolynomial derivatives', () => {
	it('differentiates exact bigint coefficients and exponents', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 3n, exponents: [4n, 2n] },
			{ coefficient: -5n, exponents: [1n, 0n] },
			{ coefficient: 7n, exponents: [0n, 3n] },
		]);

		const derivative = polynomial.derivative(0);

		expect(derivative.coefficient([3n, 2n])).toBe(12n);
		expect(derivative.constantTerm()).toBe(-5n);
		expect(derivative.termCount).toBe(2);
	});

	it('preserves exponents above Number.MAX_SAFE_INTEGER', () => {
		const exponent = BigInt(Number.MAX_SAFE_INTEGER) + 123n;
		const polynomial = SparsePolynomial.monomial(1, 2n, [exponent]);

		const derivative = polynomial.derivative(0);

		expect(derivative.coefficient([exponent - 1n])).toBe(2n * exponent);
	});
});

describe('SparsePolynomial adapters', () => {
	it('converts polynomial expressions directly into sparse form', () => {
		const converted = expressionToSparsePolynomial(
			Expression.create('(x+1)*(y+2)')
		);

		expect(converted.variables).toEqual(['x', 'y']);
		expect(converted.polynomial.coefficient([1n, 1n])).toBe(1n);
		expect(converted.polynomial.coefficient([1n, 0n])).toBe(2n);
		expect(converted.polynomial.coefficient([0n, 1n])).toBe(1n);
		expect(converted.polynomial.constantTerm()).toBe(2n);
	});

	it('orders direct expression variables by degree without narrowing powers', () => {
		const exponent = 9007199254740991n + 17n;
		const converted = expressionToSparsePolynomial(
			Expression.create(`x^${exponent.toString()}+y^2+z^3`)
		);

		expect(converted.variables).toEqual(['y', 'z', 'x']);
		expect(converted.polynomial.degree(0)).toBe(2n);
		expect(converted.polynomial.degree(1)).toBe(3n);
		expect(converted.polynomial.degree(2)).toBe(exponent);
	});

	it('rejects rational coefficients in direct integer expression conversion', () => {
		expect(() =>
			expressionToSparsePolynomial(Expression.create('(1/2)*x+1'))
		).toThrow();
	});

	it('clears rational expression coefficients directly in caller variable order', () => {
		const converted = expressionToIntegerSparsePolynomial(
			Expression.create('(3/2)*x^2-(9/4)*x*y+5'),
			['y', 'x']
		);

		expect(converted.denominator).toBe(4n);
		expect(converted.polynomial.coefficient([0n, 2n])).toBe(6n);
		expect(converted.polynomial.coefficient([1n, 1n])).toBe(-9n);
		expect(converted.polynomial.constantTerm()).toBe(20n);
	});

	it('matches the legacy Polynomial adapter term order', () => {
		const expression = Expression.create('y^4+z^4-y^2*z^2');
		const variables = ['y', 'z'];
		const direct = expressionToIntegerSparsePolynomial(expression, variables);
		const legacy = polynomialToIntegerSparsePolynomial(
			new Polynomial(expression, variables, 'lex'),
			variables
		);

		expect(
			direct.polynomial.terms().map(term => ({
				coefficient: term.coefficient,
				exponents: term.exponents,
			}))
		).toEqual(
			legacy.polynomial.terms().map(term => ({
				coefficient: term.coefficient,
				exponents: term.exponents,
			}))
		);
	});

	it('clears nested rational denominators through sums, products, and powers', () => {
		const converted = expressionToIntegerSparsePolynomial(
			Expression.create('(x/2+y/3)^2'),
			['x', 'y']
		);

		expect(converted.denominator).toBe(36n);
		expect(converted.polynomial.coefficient([2n, 0n])).toBe(9n);
		expect(converted.polynomial.coefficient([1n, 1n])).toBe(12n);
		expect(converted.polynomial.coefficient([0n, 2n])).toBe(4n);
	});

	it('preserves bigint powers while clearing rational expression coefficients', () => {
		const exponent = 9007199254740991n + 101n;
		const converted = expressionToIntegerSparsePolynomial(
			Expression.create(`(1/2)*x^${exponent.toString()}+1/3`),
			['x']
		);

		expect(converted.denominator).toBe(6n);
		expect(converted.polynomial.degree(0)).toBe(exponent);
		expect(converted.polynomial.coefficient([exponent])).toBe(3n);
		expect(converted.polynomial.constantTerm()).toBe(2n);
	});

	it('requires the direct rational adapter variable list to cover the expression', () => {
		expect(() =>
			expressionToIntegerSparsePolynomial(
				Expression.create('x*y+1'),
				['x']
			)
		).toThrow(RangeError);
		expect(() =>
			expressionToIntegerSparsePolynomial(
				Expression.create('x+1'),
				['x', 'x']
			)
		).toThrow(RangeError);
	});

	it('converts integer Polynomial terms into exact sparse coordinates', () => {
		const polynomial = new Polynomial('6*x^2-3*x*y+9', ['x', 'y'], 'lex');

		const sparse = polynomialToSparsePolynomial(polynomial, ['x', 'y']);

		expect(sparse.coefficient([2n, 0n])).toBe(6n);
		expect(sparse.coefficient([1n, 1n])).toBe(-3n);
		expect(sparse.constantTerm()).toBe(9n);
	});

	it('clears rational coefficient denominators without changing sparse powers', () => {
		const polynomial = new Polynomial('(3/2)*x^2-(9/4)*x*y+5', ['x', 'y'], 'lex');

		const converted = polynomialToIntegerSparsePolynomial(polynomial, ['x', 'y']);

		expect(converted.denominator).toBe(4n);
		expect(converted.polynomial.coefficient([2n, 0n])).toBe(6n);
		expect(converted.polynomial.coefficient([1n, 1n])).toBe(-9n);
		expect(converted.polynomial.constantTerm()).toBe(20n);
	});

	it('uses denominator one for zero and integral polynomials', () => {
		const zero = polynomialToIntegerSparsePolynomial(new Polynomial('0'), ['x']);
		const integer = polynomialToIntegerSparsePolynomial(
			new Polynomial('6*x^2-9', ['x'], 'lex'),
			['x']
		);

		expect(zero.denominator).toBe(1n);
		expect(zero.polynomial.isZero()).toBe(true);
		expect(integer.denominator).toBe(1n);
		expect(integer.polynomial.coefficient([2n])).toBe(6n);
		expect(integer.polynomial.constantTerm()).toBe(-9n);
	});

	it('rejects rational and symbolic coefficients outside the integer sparse domain', () => {
		const rational = new Polynomial('(1/2)*x+1', ['x'], 'lex');
		const symbolicCoefficient = new Polynomial('a*x+1', ['x'], 'lex');

		expect(() => polynomialToSparsePolynomial(rational, ['x'])).toThrow();
		expect(() => polynomialToSparsePolynomial(symbolicCoefficient, ['x'])).toThrow();
	});

	it('converts sparse polynomials to expressions without narrowing bigint exponents', () => {
		const exponent = 9007199254740991n + 7654321n;
		const sparse = new SparsePolynomial(1, [
			{ coefficient: 3n, exponents: [exponent] },
			{ coefficient: -2n, exponents: [0n] },
		]);

		const expression = sparsePolynomialToExpression(sparse, ['x']);

		expect(
			expression.eq(Expression.create(`3*x^${exponent.toString()}-2`))
		).toBe(true);
	});

	it('requires complete unique variable coordinates at the adapter boundary', () => {
		const polynomial = new Polynomial('x*y+1');

		expect(() => polynomialToSparsePolynomial(polynomial, ['x'])).toThrow(RangeError);
		expect(() => polynomialToSparsePolynomial(polynomial, ['x', 'x'])).toThrow(
			RangeError
		);
		expect(() =>
			sparsePolynomialToExpression(SparsePolynomial.variable(2, 0), ['x'])
		).toThrow(RangeError);
	});
});
