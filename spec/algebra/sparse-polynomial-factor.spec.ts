import { Expression } from '../../src/core/classes/expression/Expression';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import {
	factorSquareFreeUnivariateInteger,
	factorUnivariateInteger,
	recombineLiftedUnivariateFactors,
	squareFreeFactorizationMultivariate,
	squareFreeFactorizationUnivariate,
} from '../../src/algebra/polynomial/SparsePolynomialFactor';
import {
	factorSquareFreeUnivariateFiniteField,
	henselLiftUnivariateFactors,
} from '../../src/algebra/polynomial/ModularSparsePolynomialFactor';
import { ModularSparsePolynomial } from '../../src/algebra/polynomial/ModularSparsePolynomial';
import { SparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomial';
import { polynomialToSparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomialAdapter';

function x(variableCount = 1): SparsePolynomial {
	return SparsePolynomial.variable(variableCount, 0);
}

function constant(value: bigint, variableCount = 1): SparsePolynomial {
	return SparsePolynomial.constant(variableCount, value);
}

function pow(base: SparsePolynomial, exponent: bigint): SparsePolynomial {
	let result = SparsePolynomial.constant(base.variableCount, 1n);
	let factor = base;
	let power = exponent;

	while (power > 0n) {
		if ((power & 1n) === 1n) {
			result = result.multiply(factor);
		}
		power >>= 1n;
		if (power > 0n) {
			factor = factor.multiply(factor);
		}
	}

	return result;
}

describe('SparsePolynomial multivariate square-free factorization', () => {
	it('decomposes repeated factors across two variables', () => {
		const xVariable = SparsePolynomial.variable(2, 0);
		const yVariable = SparsePolynomial.variable(2, 1);
		const xPlusY = xVariable.add(yVariable);
		const polynomial = pow(xVariable, 3n).multiply(pow(xPlusY, 2n));

		const factorization = squareFreeFactorizationMultivariate(
			polynomial,
			[0, 1]
		);

		expect(factorization.content).toBe(1n);
		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 2n &&
					entry.factor.equals(xPlusY)
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 3n &&
					entry.factor.equals(xVariable)
			)
		).toBe(true);
	});

	it('recurses through coefficient content and merges equal multiplicities', () => {
		const xVariable = SparsePolynomial.variable(3, 0);
		const yVariable = SparsePolynomial.variable(3, 1);
		const zVariable = SparsePolynomial.variable(3, 2);
		const multiplicityTwo = xVariable.add(yVariable).multiply(zVariable.add(constant(1n, 3)));
		const multiplicityThree = xVariable.subtract(yVariable);
		const polynomial = pow(multiplicityTwo, 2n)
			.multiply(pow(multiplicityThree, 3n))
			.scale(-6n);

		const factorization = squareFreeFactorizationMultivariate(
			polynomial,
			[0, 1, 2]
		);

		expect(factorization.content).toBe(-6n);
		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 2n &&
					entry.factor.equals(multiplicityTwo)
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 3n &&
					entry.factor.equals(multiplicityThree)
			)
		).toBe(true);
	});

	it('handles factors entirely contained in a coefficient polynomial', () => {
		const xVariable = SparsePolynomial.variable(2, 0);
		const yVariable = SparsePolynomial.variable(2, 1);
		const polynomial = pow(yVariable, 2n).multiply(
			pow(xVariable.add(constant(1n, 2)), 3n)
		);

		const factorization = squareFreeFactorizationMultivariate(
			polynomial,
			[0, 1]
		);

		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 2n &&
					entry.factor.equals(yVariable)
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 3n &&
					entry.factor.equals(xVariable.add(constant(1n, 2)))
			)
		).toBe(true);
	});

	it('requires selected variables to include every active coordinate in ring order', () => {
		const polynomial = SparsePolynomial.variable(3, 0).add(
			SparsePolynomial.variable(3, 2)
		);

		expect(() =>
			squareFreeFactorizationMultivariate(polynomial, [0, 1])
		).toThrow(RangeError);
		expect(() =>
			squareFreeFactorizationMultivariate(polynomial, [2, 0])
		).toThrow(RangeError);
	});
});

describe('SparsePolynomial Zassenhaus recombination', () => {
	function modularFactors(
		polynomial: SparsePolynomial,
		prime: bigint
	): readonly ModularSparsePolynomial[] {
		return factorSquareFreeUnivariateFiniteField(
			new ModularSparsePolynomial(polynomial.variableCount, prime, polynomial.terms()),
			0
		);
	}

	it('recombines two lifted factors over the integers', () => {
		const polynomial = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [2n] },
			{ coefficient: 3n, exponents: [1n] },
			{ coefficient: -28n, exponents: [0n] },
		]);
		const prime = 5n;
		const lifted = henselLiftUnivariateFactors(
			polynomial,
			prime,
			modularFactors(polynomial, prime),
			0,
			625n
		);

		const factors = recombineLiftedUnivariateFactors(polynomial, lifted, 0);
		const variable = x();
		const expected = [
			variable.add(constant(7n)),
			variable.subtract(constant(4n)),
		];

		expect(factors).toHaveLength(2);
		expect(
			expected.every(target => factors.some(factor => factor.equals(target)))
		).toBe(true);
	});

	it('recovers non-monic integer factors from monic modular lifts', () => {
		const polynomial = new SparsePolynomial(1, [
			{ coefficient: 6n, exponents: [2n] },
			{ coefficient: 19n, exponents: [1n] },
			{ coefficient: 15n, exponents: [0n] },
		]);
		const prime = 5n;
		const lifted = henselLiftUnivariateFactors(
			polynomial,
			prime,
			modularFactors(polynomial, prime),
			0,
			390625n
		);

		const factors = recombineLiftedUnivariateFactors(polynomial, lifted, 0);
		const variable = x();
		const expected = [
			variable.scale(2n).add(constant(3n)),
			variable.scale(3n).add(constant(5n)),
		];

		expect(factors).toHaveLength(2);
		expect(
			expected.every(target => factors.some(factor => factor.equals(target)))
		).toBe(true);
	});

	it('recombines three lifted factors', () => {
		const polynomial = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [3n] },
			{ coefficient: -6n, exponents: [2n] },
			{ coefficient: 11n, exponents: [1n] },
			{ coefficient: -6n, exponents: [0n] },
		]);
		const prime = 5n;
		const lifted = henselLiftUnivariateFactors(
			polynomial,
			prime,
			modularFactors(polynomial, prime),
			0,
			625n
		);

		const factors = recombineLiftedUnivariateFactors(polynomial, lifted, 0);

		expect(factors).toHaveLength(3);
		expect(
			[1n, 2n, 3n].every(root =>
				factors.some(factor => factor.equals(x().subtract(constant(root))))
			)
		).toBe(true);
	});

	it('keeps an integer-irreducible polynomial whole when it splits modulo p', () => {
		const polynomial = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [2n] },
			{ coefficient: 1n, exponents: [0n] },
		]);
		const prime = 5n;
		const lifted = henselLiftUnivariateFactors(
			polynomial,
			prime,
			modularFactors(polynomial, prime),
			0,
			25n
		);

		const factors = recombineLiftedUnivariateFactors(polynomial, lifted, 0);

		expect(factors).toHaveLength(1);
		expect(factors[0].equals(polynomial)).toBe(true);
	});

	it('rejects a lift modulus below the coefficient reconstruction bound', () => {
		const polynomial = new SparsePolynomial(1, [
			{ coefficient: 1n, exponents: [2n] },
			{ coefficient: 3n, exponents: [1n] },
			{ coefficient: -28n, exponents: [0n] },
		]);
		const prime = 5n;
		const lifted = henselLiftUnivariateFactors(
			polynomial,
			prime,
			modularFactors(polynomial, prime),
			0,
			25n
		);

		expect(() =>
			recombineLiftedUnivariateFactors(polynomial, lifted, 0)
		).toThrow(RangeError);
	});
});

describe('SparsePolynomial univariate factor corpus', () => {
	function parsePolynomial(input: string): SparsePolynomial {
		return polynomialToSparsePolynomial(
			new Polynomial(Expression.create(input), ['x'], 'lex'),
			['x']
		);
	}

	function checkFactorization(
		input: string,
		content: bigint,
		expected: ReadonlyArray<Readonly<{ factor: string; multiplicity?: bigint }>>
	): void {
		const factorization = factorUnivariateInteger(parsePolynomial(input), 0);

		expect(factorization.content).toBe(content);
		expect(factorization.factors).toHaveLength(expected.length);

		const unmatched = [...factorization.factors];
		for (const entry of expected) {
			const target = parsePolynomial(entry.factor)
				.primitivePart()
				.normalizeLeadingSign('lex');
			const multiplicity = entry.multiplicity ?? 1n;
			const index = unmatched.findIndex(
				actual =>
					actual.multiplicity === multiplicity &&
					actual.factor.equals(target)
			);
			expect(index).toBeGreaterThanOrEqual(0);
			unmatched.splice(index, 1);
		}
		expect(unmatched).toHaveLength(0);
	}

	it.each([
		{
			input: 'x^2+5*x+6',
			content: 1n,
			factors: [{ factor: 'x+2' }, { factor: 'x+3' }],
		},
		{
			input: '6*x^2+11*x+3',
			content: 1n,
			factors: [{ factor: '2*x+3' }, { factor: '3*x+1' }],
		},
		{
			input: '4*x^2+12*x+9',
			content: 1n,
			factors: [{ factor: '2*x+3', multiplicity: 2n }],
		},
		{
			input: '9*x^2-30*x+25',
			content: 1n,
			factors: [{ factor: '3*x-5', multiplicity: 2n }],
		},
		{
			input: '25*x^2-16',
			content: 1n,
			factors: [{ factor: '5*x-4' }, { factor: '5*x+4' }],
		},
		{
			input: 'x^3+8',
			content: 1n,
			factors: [{ factor: 'x+2' }, { factor: 'x^2-2*x+4' }],
		},
		{
			input: '27*x^3-125',
			content: 1n,
			factors: [{ factor: '3*x-5' }, { factor: '9*x^2+15*x+25' }],
		},
		{
			input: 'x^3-6*x^2+11*x-6',
			content: 1n,
			factors: [{ factor: 'x-1' }, { factor: 'x-2' }, { factor: 'x-3' }],
		},
		{
			input: 'x^3-3*x+2',
			content: 1n,
			factors: [
				{ factor: 'x+2' },
				{ factor: 'x-1', multiplicity: 2n },
			],
		},
		{
			input: 'x^4-81',
			content: 1n,
			factors: [
				{ factor: 'x-3' },
				{ factor: 'x+3' },
				{ factor: 'x^2+9' },
			],
		},
		{
			input: 'x^4-5*x^2+4',
			content: 1n,
			factors: [
				{ factor: 'x-2' },
				{ factor: 'x-1' },
				{ factor: 'x+1' },
				{ factor: 'x+2' },
			],
		},
		{
			input: '4*x^4-37*x^2+9',
			content: 1n,
			factors: [
				{ factor: 'x-3' },
				{ factor: 'x+3' },
				{ factor: '2*x-1' },
				{ factor: '2*x+1' },
			],
		},
		{
			input: 'x^4+4*x^3+6*x^2+4*x+1',
			content: 1n,
			factors: [{ factor: 'x+1', multiplicity: 4n }],
		},
		{
			input: 'x^5-32',
			content: 1n,
			factors: [
				{ factor: 'x-2' },
				{ factor: 'x^4+2*x^3+4*x^2+8*x+16' },
			],
		},
		{
			input: 'x^5+243',
			content: 1n,
			factors: [
				{ factor: 'x+3' },
				{ factor: 'x^4-3*x^3+9*x^2-27*x+81' },
			],
		},
		{
			input: 'x^6-64',
			content: 1n,
			factors: [
				{ factor: 'x-2' },
				{ factor: 'x+2' },
				{ factor: 'x^2-2*x+4' },
				{ factor: 'x^2+2*x+4' },
			],
		},
		{
			input: 'x^4+x^3+x^2+x+1',
			content: 1n,
			factors: [{ factor: 'x^4+x^3+x^2+x+1' }],
		},
		{
			input: 'x^4+1',
			content: 1n,
			factors: [{ factor: 'x^4+1' }],
		},
		{
			input: 'x^4-x^2+1',
			content: 1n,
			factors: [{ factor: 'x^4-x^2+1' }],
		},
		{
			input: 'x^6-7*x^3+12',
			content: 1n,
			factors: [{ factor: 'x^3-3' }, { factor: 'x^3-4' }],
		},
		{
			input: 'x^3+3*x^2+2*x+6',
			content: 1n,
			factors: [{ factor: 'x+3' }, { factor: 'x^2+2' }],
		},
		{
			input: 'x^4-2*x^3-3*x^2+4*x+4',
			content: 1n,
			factors: [
				{ factor: 'x-2', multiplicity: 2n },
				{ factor: 'x+1', multiplicity: 2n },
			],
		},
		{
			input: '6*x^2-5*x+1',
			content: 1n,
			factors: [{ factor: '2*x-1' }, { factor: '3*x-1' }],
		},
		{
			input: 'x^4+64',
			content: 1n,
			factors: [
				{ factor: 'x^2-4*x+8' },
				{ factor: 'x^2+4*x+8' },
			],
		},
		{
			input: 'x^4+x^2+1',
			content: 1n,
			factors: [
				{ factor: 'x^2-x+1' },
				{ factor: 'x^2+x+1' },
			],
		},
		{
			input: '64+16*x^2+4*x^4+x^6',
			content: 1n,
			factors: [{ factor: 'x^2+4' }, { factor: 'x^4+16' }],
		},
		{
			input: 'x^4-4',
			content: 1n,
			factors: [{ factor: 'x^2-2' }, { factor: 'x^2+2' }],
		},
		{
			input: '35*x^9+7*x^8+65*x^7-64*x^6-138*x^4-34*x^3-7*x^2-11*x+77',
			content: 1n,
			factors: [
				{ factor: '5*x^3+x^2-11' },
				{ factor: '7*x^6+13*x^4+x-7' },
			],
		},
	])('$input', ({ input, content, factors }) => {
		checkFactorization(input, content, factors);
	});
});

describe('SparsePolynomial integer factorization', () => {
	it('factors a square-free difference of fourth powers over the integers', () => {
		const variable = x();
		const polynomial = pow(variable, 4n).subtract(constant(81n));

		const factors = factorSquareFreeUnivariateInteger(polynomial, 0);
		const expected = [
			variable.subtract(constant(3n)),
			variable.add(constant(3n)),
			variable.multiply(variable).add(constant(9n)),
		];

		expect(factors).toHaveLength(3);
		expect(
			expected.every(target => factors.some(factor => factor.equals(target)))
		).toBe(true);
	});

	it('factors a non-monic square-free polynomial', () => {
		const variable = x();
		const polynomial = variable
			.multiply(variable)
			.scale(6n)
			.add(variable.scale(11n))
			.add(constant(3n));

		const factors = factorSquareFreeUnivariateInteger(polynomial, 0);
		const expected = [
			variable.scale(2n).add(constant(3n)),
			variable.scale(3n).add(constant(1n)),
		];

		expect(factors).toHaveLength(2);
		expect(
			expected.every(target => factors.some(factor => factor.equals(target)))
		).toBe(true);
	});

	it('keeps the high-degree solve regression polynomial irreducible', () => {
		const polynomial = polynomialToSparsePolynomial(
			new Polynomial(
				Expression.create('3*x^20+3*x^19-6*x^11+14*x^5-2*x-1'),
				['x'],
				'lex'
			),
			['x']
		);

		const factors = factorSquareFreeUnivariateInteger(polynomial, 0);

		expect(factors).toHaveLength(1);
		expect(factors[0].equals(polynomial)).toBe(true);
	});

	it('leaves an integer-irreducible cyclotomic polynomial whole', () => {
		const variable = x();
		const polynomial = pow(variable, 4n)
			.add(pow(variable, 3n))
			.add(pow(variable, 2n))
			.add(variable)
			.add(constant(1n));

		const factors = factorSquareFreeUnivariateInteger(polynomial, 0);

		expect(factors).toHaveLength(1);
		expect(factors[0].equals(polynomial)).toBe(true);
	});

	it('combines square-free decomposition with irreducible factor splitting', () => {
		const variable = x();
		const xMinusOne = variable.subtract(constant(1n));
		const xPlusTwo = variable.add(constant(2n));
		const irreducible = variable.multiply(variable).add(constant(1n));
		const polynomial = pow(variable, 2n)
			.multiply(pow(xMinusOne, 3n))
			.multiply(pow(xPlusTwo, 2n))
			.multiply(irreducible)
			.scale(-12n);

		const factorization = factorUnivariateInteger(polynomial, 0);

		expect(factorization.content).toBe(-12n);
		expect(factorization.factors).toHaveLength(4);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(variable) && entry.multiplicity === 2n
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(xMinusOne) && entry.multiplicity === 3n
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(xPlusTwo) && entry.multiplicity === 2n
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(irreducible) && entry.multiplicity === 1n
			)
		).toBe(true);
	});

	it('returns constants without polynomial factors', () => {
		expect(factorUnivariateInteger(constant(-18n), 0)).toEqual({
			content: -18n,
			factors: [],
		});
	});
});

describe('SparsePolynomial square-free factorization', () => {
	it('separates coefficient content and repeated factors', () => {
		const variable = x();
		const xPlusOne = variable.add(constant(1n));
		const xPlusTwo = variable.add(constant(2n));
		const polynomial = pow(xPlusOne, 2n).multiply(pow(xPlusTwo, 3n)).scale(6n);

		const factorization = squareFreeFactorizationUnivariate(polynomial, 0);

		expect(factorization.content).toBe(6n);
		expect(factorization.factors).toHaveLength(2);
		expect(factorization.factors[0].multiplicity).toBe(2n);
		expect(factorization.factors[0].factor.equals(xPlusOne)).toBe(true);
		expect(factorization.factors[1].multiplicity).toBe(3n);
		expect(factorization.factors[1].factor.equals(xPlusTwo)).toBe(true);
	});

	it('preserves a negative global sign in the returned content', () => {
		const variable = x();
		const polynomial = pow(variable.add(constant(3n)), 2n).scale(-10n);

		const factorization = squareFreeFactorizationUnivariate(polynomial, 0);

		expect(factorization.content).toBe(-10n);
		expect(factorization.factors).toHaveLength(1);
		expect(factorization.factors[0].factor.equals(variable.add(constant(3n)))).toBe(true);
		expect(factorization.factors[0].multiplicity).toBe(2n);
	});

	it('extracts a common variable power before Yun decomposition', () => {
		const variable = x();
		const polynomial = pow(variable, 5n)
			.multiply(pow(variable.add(constant(1n)), 2n))
			.multiply(variable.add(constant(2n)));

		const factorization = squareFreeFactorizationUnivariate(polynomial, 0);

		expect(factorization.factors).toHaveLength(3);
		expect(
			factorization.factors.some(
				entry => entry.multiplicity === 5n && entry.factor.equals(variable)
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 2n &&
					entry.factor.equals(variable.add(constant(1n)))
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry =>
					entry.multiplicity === 1n &&
					entry.factor.equals(variable.add(constant(2n)))
			)
		).toBe(true);
	});

	it('extracts huge sparse monomial multiplicity without iterating through it', () => {
		const exponent = BigInt(Number.MAX_SAFE_INTEGER) + 1000n;
		const polynomial = SparsePolynomial.monomial(1, 7n, [exponent]);

		const factorization = squareFreeFactorizationUnivariate(polynomial, 0);

		expect(factorization.content).toBe(7n);
		expect(factorization.factors).toHaveLength(1);
		expect(factorization.factors[0].factor.equals(x())).toBe(true);
		expect(factorization.factors[0].multiplicity).toBe(exponent);
	});

	it('returns a square-free polynomial as one multiplicity-one factor', () => {
		const variable = x();
		const polynomial = variable.multiply(variable).subtract(constant(1n));

		const factorization = squareFreeFactorizationUnivariate(polynomial, 0);

		expect(factorization.content).toBe(1n);
		expect(factorization.factors).toHaveLength(1);
		expect(factorization.factors[0].factor.equals(polynomial)).toBe(true);
		expect(factorization.factors[0].multiplicity).toBe(1n);
	});

	it('handles zero and nonzero constants without manufacturing factors', () => {
		expect(squareFreeFactorizationUnivariate(SparsePolynomial.zero(1), 0)).toEqual({
			content: 0n,
			factors: [],
		});
		expect(squareFreeFactorizationUnivariate(constant(-12n), 0)).toEqual({
			content: -12n,
			factors: [],
		});
	});

	it('rejects polynomials that are not univariate in the selected variable', () => {
		const polynomial = new SparsePolynomial(2, [
			{ coefficient: 1n, exponents: [1n, 1n] },
			{ coefficient: 1n, exponents: [0n, 0n] },
		]);

		expect(() => squareFreeFactorizationUnivariate(polynomial, 0)).toThrow(RangeError);
	});
});
