import { Expression } from '../../src/core/classes/expression/Expression';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import {
	factorBivariateInteger,
	factorMultivariateInteger,
	factorSquareFreeBivariateInteger,
	factorSquareFreeMultivariateInteger,
	findWangBivariateConfiguration,
	findWangConfiguration,
	findWangEvaluationPoint,
	liftWangBivariateConfiguration,
	liftWangConfiguration,
	testWangBivariateConfiguration,
	testWangConfiguration,
	testWangEvaluationPoint,
} from '../../src/algebra/polynomial/SparsePolynomialMultivariateFactor';
import { SparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomial';
import { polynomialToSparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomialAdapter';

function variable(variableCount: number, variableIndex: number): SparsePolynomial {
	return SparsePolynomial.variable(variableCount, variableIndex);
}

function constant(variableCount: number, value: bigint): SparsePolynomial {
	return SparsePolynomial.constant(variableCount, value);
}

describe('SparsePolynomial bivariate factor corpus', () => {
	function parsePolynomial(input: string): SparsePolynomial {
		return polynomialToSparsePolynomial(
			new Polynomial(Expression.create(input), ['x', 'y'], 'lex'),
			['x', 'y']
		);
	}

	function checkFactorization(
		input: string,
		content: bigint,
		expected: ReadonlyArray<Readonly<{ factor: string; multiplicity?: bigint }>>
	): void {
		const factorization = factorBivariateInteger(parsePolynomial(input), [0, 1]);

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
			input: 'x^2-y^2',
			content: 1n,
			factors: [{ factor: 'x-y' }, { factor: 'x+y' }],
		},
		{
			input: 'x^3+y^3',
			content: 1n,
			factors: [{ factor: 'x+y' }, { factor: 'x^2-x*y+y^2' }],
		},
		{
			input: 'x^3-y^3',
			content: 1n,
			factors: [{ factor: 'x-y' }, { factor: 'x^2+x*y+y^2' }],
		},
		{
			input: 'x^5-y^5',
			content: 1n,
			factors: [
				{ factor: 'x-y' },
				{ factor: 'x^4+x^3*y+x^2*y^2+x*y^3+y^4' },
			],
		},
		{
			input: 'x^2+3*x*y+2*y^2',
			content: 1n,
			factors: [{ factor: 'x+y' }, { factor: 'x+2*y' }],
		},
		{
			input: '2*x^2+5*x*y-3*y^2',
			content: 1n,
			factors: [{ factor: 'x+3*y' }, { factor: '2*x-y' }],
		},
		{
			input: '4*x^2-9*y^2',
			content: 1n,
			factors: [{ factor: '2*x-3*y' }, { factor: '2*x+3*y' }],
		},
		{
			input: '4*x^2-12*x*y+9*y^2',
			content: 1n,
			factors: [{ factor: '2*x-3*y', multiplicity: 2n }],
		},
		{
			input: 'x^4+4*y^4',
			content: 1n,
			factors: [
				{ factor: 'x^2-2*x*y+2*y^2' },
				{ factor: 'x^2+2*x*y+2*y^2' },
			],
		},
		{
			input: 'x^4+x^2*y^2+y^4',
			content: 1n,
			factors: [
				{ factor: 'x^2-x*y+y^2' },
				{ factor: 'x^2+x*y+y^2' },
			],
		},
		{
			input: 'x^2*y^2-5*x*y+6',
			content: 1n,
			factors: [{ factor: 'x*y-2' }, { factor: 'x*y-3' }],
		},
		{
			input: '16*x^4-72*x^2*y^2+81*y^4',
			content: 1n,
			factors: [
				{ factor: '2*x-3*y', multiplicity: 2n },
				{ factor: '2*x+3*y', multiplicity: 2n },
			],
		},
		{
			input: '6*x^2*y+9*x*y^2-3*x*y',
			content: 3n,
			factors: [
				{ factor: 'x' },
				{ factor: 'y' },
				{ factor: '2*x+3*y-1' },
			],
		},
		{
			input: 'x^2*y+3*x*y+2*y+x^2+3*x+2',
			content: 1n,
			factors: [
				{ factor: 'x+1' },
				{ factor: 'x+2' },
				{ factor: 'y+1' },
			],
		},
		{
			input: 'x^3*y-x^2*y^2+x-y',
			content: 1n,
			factors: [{ factor: 'x-y' }, { factor: '1+x^2*y' }],
		},
		{
			input: 'x^10-y^10',
			content: 1n,
			factors: [
				{ factor: 'x-y' },
				{ factor: 'x+y' },
				{ factor: 'x^4-x^3*y+x^2*y^2-x*y^3+y^4' },
				{ factor: 'x^4+x^3*y+x^2*y^2+x*y^3+y^4' },
			],
		},
		{
			input: 'x^2*y^2-1',
			content: 1n,
			factors: [{ factor: 'x*y-1' }, { factor: 'x*y+1' }],
		},
		{
			input: 'x^2+2*x*y+y^2',
			content: 1n,
			factors: [{ factor: 'x+y', multiplicity: 2n }],
		},
		{
			input: 'x^4-y^4',
			content: 1n,
			factors: [
				{ factor: 'x-y' },
				{ factor: 'x+y' },
				{ factor: 'x^2+y^2' },
			],
		},
		{
			input: 'x^5+y^5',
			content: 1n,
			factors: [
				{ factor: 'x+y' },
				{ factor: 'x^4-x^3*y+x^2*y^2-x*y^3+y^4' },
			],
		},
		{
			input: 'x^4-2*x^2*y^2+y^4',
			content: 1n,
			factors: [
				{ factor: 'x-y', multiplicity: 2n },
				{ factor: 'x+y', multiplicity: 2n },
			],
		},
		{
			input: 'x^3+x^2*y+x*y^2+y^3+x^2+x*y',
			content: 1n,
			factors: [{ factor: 'x+y' }, { factor: 'x^2+x+y^2' }],
		},
		{
			input: 'x^2+2*x*y+y^2-x-y-6',
			content: 1n,
			factors: [{ factor: 'x+y-3' }, { factor: 'x+y+2' }],
		},
		{
			input: 'x^3-x^2*y-x*y^2+y^3',
			content: 1n,
			factors: [
				{ factor: 'x+y' },
				{ factor: 'x-y', multiplicity: 2n },
			],
		},
		{
			input: 'x^3*y-x*y^3',
			content: 1n,
			factors: [
				{ factor: 'x' },
				{ factor: 'y' },
				{ factor: 'x-y' },
				{ factor: 'x+y' },
			],
		},
		{
			input: '6*x^2+7*x*y-3*y^2',
			content: 1n,
			factors: [{ factor: '2*x+3*y' }, { factor: '3*x-y' }],
		},
	])('$input', ({ input, content, factors }) => {
		checkFactorization(input, content, factors);
	});
});

describe('SparsePolynomial complete bivariate factorization', () => {
	it('preserves numeric content and repeated irreducible factors', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = x.add(y).add(constant(2, 1n));
		const second = x.subtract(y).add(constant(2, 2n));
		const polynomial = first
			.multiply(first)
			.multiply(second)
			.scale(-6n);

		const factorization = factorBivariateInteger(polynomial, [0, 1]);

		expect(factorization.content).toBe(-6n);
		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(first) && entry.multiplicity === 2n
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(second) && entry.multiplicity === 1n
			)
		).toBe(true);
	});

	it('separates tail-only content from a bivariate factor at the same multiplicity', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const tail = y.add(constant(2, 3n));
		const mixed = x.add(y).add(constant(2, 1n));
		const polynomial = tail
			.multiply(tail)
			.multiply(mixed)
			.multiply(mixed);

		const factorization = factorBivariateInteger(polynomial, [0, 1]);

		expect(factorization.content).toBe(1n);
		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(tail) && entry.multiplicity === 2n
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(mixed) && entry.multiplicity === 2n
			)
		).toBe(true);
	});

	it('factors reducible tail content before Wang splitting', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const tailOne = y.subtract(constant(2, 1n));
		const tailTwo = y.add(constant(2, 2n));
		const mixed = x
			.multiply(y.add(constant(2, 1n)))
			.add(y.multiply(y))
			.add(constant(2, 1n));
		const polynomial = tailOne.multiply(tailTwo).multiply(mixed);

		const factorization = factorBivariateInteger(polynomial, [0, 1]);

		expect(factorization.factors).toHaveLength(3);
		expect(
			[tailOne, tailTwo, mixed].every(target =>
				factorization.factors.some(
					entry => entry.factor.equals(target) && entry.multiplicity === 1n
				)
			)
		).toBe(true);
	});

	it('preserves dormant coordinates in the polynomial ring', () => {
		const x = variable(3, 0);
		const y = variable(3, 2);
		const first = x.add(y).add(constant(3, 1n));
		const second = x.subtract(y).add(constant(3, 2n));
		const polynomial = first.multiply(second);

		const factorization = factorBivariateInteger(polynomial, [0, 2]);

		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.every(entry => entry.factor.variableCount === 3)
		).toBe(true);
		expect(
			[first, second].every(target =>
				factorization.factors.some(entry => entry.factor.equals(target))
			)
		).toBe(true);
	});

	it('returns constants without polynomial factors', () => {
		expect(
			factorBivariateInteger(SparsePolynomial.constant(2, -15n), [0, 1])
		).toEqual({
			content: -15n,
			factors: [],
		});
	});
});

describe('SparsePolynomial trivariate factor corpus', () => {
	function parsePolynomial(input: string): SparsePolynomial {
		return polynomialToSparsePolynomial(
			new Polynomial(Expression.create(input), ['x', 'y', 'z'], 'lex'),
			['x', 'y', 'z']
		);
	}

	function checkFactorization(
		input: string,
		content: bigint,
		expected: ReadonlyArray<Readonly<{ factor: string; multiplicity?: bigint }>>
	): void {
		const factorization = factorMultivariateInteger(
			parsePolynomial(input),
			[0, 1, 2]
		);

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
			input: 'x*y*z+x*y+x*z+y*z+x+y+z+1',
			content: 1n,
			factors: [
				{ factor: 'x+1' },
				{ factor: 'y+1' },
				{ factor: 'z+1' },
			],
		},
		{
			input: 'x^2-6*x*y*z+9*y^2*z^2',
			content: 1n,
			factors: [{ factor: 'x-3*y*z', multiplicity: 2n }],
		},
		{
			input: 'x^3+y^3+z^3-3*x*y*z',
			content: 1n,
			factors: [
				{ factor: 'x+y+z' },
				{ factor: 'x^2+y^2+z^2-x*y-x*z-y*z' },
			],
		},
		{
			input: 'x^2+y^2+z^2+2*x*y+2*x*z+2*y*z',
			content: 1n,
			factors: [{ factor: 'x+y+z', multiplicity: 2n }],
		},
		{
			input: '4*x^2*y*z+8*x*y^2*z-12*x*y*z^2',
			content: 4n,
			factors: [
				{ factor: 'x' },
				{ factor: 'y' },
				{ factor: 'z' },
				{ factor: 'x+2*y-3*z' },
			],
		},
		{
			input: 'x^2-y^2-2*y*z-z^2',
			content: 1n,
			factors: [
				{ factor: 'x-y-z' },
				{ factor: 'x+y+z' },
			],
		},
		{
			input: 'x^2+x*y-x*z-y*z',
			content: 1n,
			factors: [
				{ factor: 'x-z' },
				{ factor: 'x+y' },
			],
		},
		{
			input: '3*z^2+x^2*y*z+3*x*y*z-15*z+x^3*y^2-5*x^2*y',
			content: 1n,
			factors: [
				{ factor: 'z+x*y-5' },
				{ factor: '3*z+x^2*y' },
			],
		},
	])('$input', ({ input, content, factors }) => {
		checkFactorization(input, content, factors);
	});
});

describe('SparsePolynomial complete trivariate factorization', () => {
	it('factors a primitive square-free trivariate product', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const first = x.add(y).add(z).add(constant(3, 1n));
		const second = x.add(y.multiply(z)).add(constant(3, 2n));
		const polynomial = first.multiply(second);

		const factors = factorSquareFreeMultivariateInteger(
			polynomial,
			[0, 1, 2]
		);

		expect(factors).toHaveLength(2);
		expect(factors.some(factor => factor.equals(first))).toBe(true);
		expect(factors.some(factor => factor.equals(second))).toBe(true);
	});

	it('preserves numeric content and repeated trivariate factors', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const first = x.add(y).add(z).add(constant(3, 1n));
		const second = x.subtract(y.multiply(z)).add(constant(3, 2n));
		const polynomial = first
			.multiply(first)
			.multiply(second)
			.scale(-6n);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2]
		);

		expect(factorization.content).toBe(-6n);
		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(first) && entry.multiplicity === 2n
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(second) && entry.multiplicity === 1n
			)
		).toBe(true);
	});

	it('factors bivariate main-variable content before trivariate Wang lifting', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const tailOne = y.add(z).add(constant(3, 1n));
		const tailTwo = y.subtract(z).add(constant(3, 2n));
		const mixed = x.add(y.multiply(z)).add(constant(3, 3n));
		const polynomial = tailOne.multiply(tailTwo).multiply(mixed);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2]
		);

		expect(factorization.factors).toHaveLength(3);
		expect(
			[tailOne, tailTwo, mixed].every(target =>
				factorization.factors.some(
					entry => entry.factor.equals(target) && entry.multiplicity === 1n
				)
			)
		).toBe(true);
	});

	it('preserves dormant coordinates in a larger polynomial ring', () => {
		const x = variable(5, 0);
		const y = variable(5, 2);
		const z = variable(5, 4);
		const first = x.add(y).add(constant(5, 1n));
		const second = x.subtract(z).add(constant(5, 2n));
		const polynomial = first.multiply(second);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 2, 4]
		);

		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.every(entry => entry.factor.variableCount === 5)
		).toBe(true);
		expect(
			[first, second].every(target =>
				factorization.factors.some(entry => entry.factor.equals(target))
			)
		).toBe(true);
	});

	it('factors terms whose main-variable leading coefficients depend on both tail variables', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const firstLeading = y.add(z).add(constant(3, 1n));
		const secondLeading = y.subtract(z).add(constant(3, 2n));
		const first = firstLeading
			.multiply(x)
			.add(y.multiply(z))
			.add(constant(3, 1n));
		const second = secondLeading
			.multiply(x)
			.add(y)
			.add(constant(3, 3n));
		const polynomial = first.multiply(second);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2]
		);

		expect(factorization.factors).toHaveLength(2);
		expect(
			[first, second].every(target =>
				factorization.factors.some(entry => entry.factor.equals(target))
			)
		).toBe(true);
	});

	it('searches several two-dimensional shells before trivariate lifting', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const first = y.multiply(x).add(constant(3, 1n));
		const second = z.multiply(x).add(constant(3, 1n));
		const polynomial = first.multiply(second);

		const configuration = findWangConfiguration(polynomial, [0, 1, 2]);
		const radius = configuration.evaluation.values.reduce(
			(maximum, value) => {
				const absolute = value < 0n ? -value : value;
				return absolute > maximum ? absolute : maximum;
			},
			0n
		);

		expect(radius).toBeGreaterThanOrEqual(3n);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2]
		);
		expect(factorization.factors).toHaveLength(2);
		expect(
			[first, second].every(target =>
				factorization.factors.some(entry => entry.factor.equals(target))
			)
		).toBe(true);
	});

	it('keeps the bivariate entry points on the generalized factorization path', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = x
			.add(y)
			.multiply(x.subtract(y).add(constant(2, 1n)));

		const specialized = factorBivariateInteger(polynomial, [0, 1]);
		const generalized = factorMultivariateInteger(polynomial, [0, 1]);

		expect(specialized).toEqual(generalized);
	});
});

describe('SparsePolynomial complete four-variable factorization', () => {
	it('factors a primitive square-free four-variable product', () => {
		const x = variable(4, 0);
		const y = variable(4, 1);
		const z = variable(4, 2);
		const w = variable(4, 3);
		const first = x.add(y).add(z).add(w).add(constant(4, 1n));
		const second = x
			.add(y.multiply(z))
			.add(z.multiply(w))
			.add(constant(4, 2n));
		const polynomial = first.multiply(second);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2, 3]
		);

		expect(factorization.factors).toHaveLength(2);
		expect(
			[first, second].every(target =>
				factorization.factors.some(entry => entry.factor.equals(target))
			)
		).toBe(true);
	});

	it('recursively factors three-variable main-variable content', () => {
		const x = variable(4, 0);
		const y = variable(4, 1);
		const z = variable(4, 2);
		const w = variable(4, 3);
		const contentOne = y.add(z).add(w).add(constant(4, 1n));
		const contentTwo = y
			.add(z.multiply(w))
			.add(constant(4, 2n));
		const mixed = x.add(y.multiply(z)).add(w).add(constant(4, 3n));
		const polynomial = contentOne.multiply(contentTwo).multiply(mixed);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2, 3]
		);

		expect(factorization.factors).toHaveLength(3);
		expect(
			[contentOne, contentTwo, mixed].every(target =>
				factorization.factors.some(
					entry => entry.factor.equals(target) && entry.multiplicity === 1n
				)
			)
		).toBe(true);
	});
});

describe('SparsePolynomial recursive factor scaling', () => {
	it('preserves content and multiplicities with four-variable leading coefficients', () => {
		const x = variable(4, 0);
		const y = variable(4, 1);
		const z = variable(4, 2);
		const w = variable(4, 3);
		const firstLeading = y
			.scale(2n)
			.add(z.scale(3n))
			.add(w.scale(5n))
			.add(constant(4, 1n));
		const secondLeading = y
			.scale(3n)
			.subtract(z.scale(2n))
			.add(w.scale(4n))
			.add(constant(4, 2n));
		const first = firstLeading
			.multiply(x)
			.add(y.multiply(w).scale(7n))
			.add(constant(4, 11n));
		const second = secondLeading
			.multiply(x)
			.add(z.scale(5n))
			.add(constant(4, 13n));
		const polynomial = first
			.pow(2n)
			.multiply(second)
			.scale(-30n);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2, 3]
		);

		expect(factorization.content).toBe(-30n);
		expect(factorization.factors).toHaveLength(2);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(first) && entry.multiplicity === 2n
			)
		).toBe(true);
		expect(
			factorization.factors.some(
				entry => entry.factor.equals(second) && entry.multiplicity === 1n
			)
		).toBe(true);
	});

	it('factors across four tail variables', () => {
		const x = variable(5, 0);
		const y = variable(5, 1);
		const z = variable(5, 2);
		const w = variable(5, 3);
		const v = variable(5, 4);
		const first = x
			.add(y)
			.add(z)
			.add(w)
			.add(v)
			.add(constant(5, 1n));
		const second = x
			.add(y.multiply(z))
			.add(w.multiply(v))
			.add(constant(5, 2n));
		const polynomial = first.multiply(second);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2, 3, 4]
		);

		expect(factorization.factors).toHaveLength(2);
		expect(
			[first, second].every(target =>
				factorization.factors.some(entry => entry.factor.equals(target))
			)
		).toBe(true);
	});
});

describe('SparsePolynomial Wang extraneous specializations', () => {
	it('continues past reducible early evaluation shells', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = x.pow(2n).add(y.pow(2n).scale(3n)).subtract(constant(2, 4n));

		const factors = factorSquareFreeMultivariateInteger(polynomial, [0, 1]);

		expect(factors).toHaveLength(1);
		expect(factors[0].equals(polynomial)).toBe(true);
	});

	it('recognizes irreducibility when the first usable specialization splits', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const polynomial = x
			.pow(6n)
			.subtract(y.pow(6n))
			.subtract(z.pow(6n))
			.add(y.pow(3n).multiply(z.pow(3n)));

		const factors = factorSquareFreeMultivariateInteger(
			polynomial,
			[0, 1, 2]
		);

		expect(factors).toHaveLength(1);
		expect(factors[0].equals(polynomial)).toBe(true);
	});
});

describe('SparsePolynomial recursive Wang configuration', () => {
	it('reconstructs leading coefficients over two tail variables', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const firstLeading = y.add(constant(3, 1n));
		const secondLeading = z.add(constant(3, 2n));
		const first = firstLeading.multiply(x).add(constant(3, 1n));
		const second = secondLeading.multiply(x).add(constant(3, 1n));
		const polynomial = first.multiply(second);

		const configuration = testWangConfiguration(
			polynomial,
			[0, 1, 2],
			[1n, 1n]
		);

		expect(configuration).not.toBeNull();
		if (configuration !== null) {
			expect(configuration.leadingCoefficients).toHaveLength(2);
			expect(
				configuration.leadingCoefficients.some(coefficient =>
					coefficient.equals(firstLeading)
				)
			).toBe(true);
			expect(
				configuration.leadingCoefficients.some(coefficient =>
					coefficient.equals(secondLeading)
				)
			).toBe(true);
		}
	});

	it('searches deterministic shells for a usable three-variable configuration', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const first = y
			.add(constant(3, 1n))
			.multiply(x)
			.add(constant(3, 1n));
		const second = z
			.add(constant(3, 2n))
			.multiply(x)
			.add(constant(3, 1n));
		const polynomial = first.multiply(second);

		const configuration = findWangConfiguration(polynomial, [0, 1, 2]);

		expect(configuration.evaluation.values).toEqual([1n, 1n]);
		expect(configuration.factors).toHaveLength(2);
	});

	it('searches higher-dimensional shells until three leading values are usable', () => {
		const x = variable(4, 0);
		const y = variable(4, 1);
		const z = variable(4, 2);
		const w = variable(4, 3);
		const first = y.multiply(x).add(constant(4, 1n));
		const second = z.multiply(x).add(constant(4, 1n));
		const third = w.multiply(x).add(constant(4, 1n));
		const polynomial = first.multiply(second).multiply(third);

		const configuration = findWangConfiguration(
			polynomial,
			[0, 1, 2, 3]
		);
		const radius = configuration.evaluation.values.reduce(
			(maximum, value) => {
				const absolute = value < 0n ? -value : value;
				return absolute > maximum ? absolute : maximum;
			},
			0n
		);

		expect(radius).toBeGreaterThanOrEqual(5n);
		expect(configuration.factors).toHaveLength(3);

		const factorization = factorMultivariateInteger(
			polynomial,
			[0, 1, 2, 3]
		);
		expect(factorization.factors).toHaveLength(3);
		expect(
			[first, second, third].every(target =>
				factorization.factors.some(entry => entry.factor.equals(target))
			)
		).toBe(true);
	});

	it('reconstructs leading coefficients over three tail variables', () => {
		const x = variable(4, 0);
		const y = variable(4, 1);
		const z = variable(4, 2);
		const w = variable(4, 3);
		const firstLeading = y.add(z).add(constant(4, 1n));
		const secondLeading = z.add(w).add(constant(4, 2n));
		const first = firstLeading.multiply(x).add(w).add(constant(4, 1n));
		const second = secondLeading.multiply(x).add(y).add(constant(4, 1n));
		const polynomial = first.multiply(second);

		const configuration = findWangConfiguration(
			polynomial,
			[0, 1, 2, 3]
		);

		expect(configuration.leadingCoefficients).toHaveLength(2);
		expect(
			configuration.leadingCoefficients.some(coefficient =>
				coefficient.equals(firstLeading)
			)
		).toBe(true);
		expect(
			configuration.leadingCoefficients.some(coefficient =>
				coefficient.equals(secondLeading)
			)
		).toBe(true);
	});
});

describe('SparsePolynomial trivariate Wang lifting', () => {
	it('lifts specialized factors through two tail variables', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const first = x.add(y).add(z).add(constant(3, 1n));
		const second = x.add(y.multiply(z)).add(constant(3, 2n));
		const polynomial = first.multiply(second);
		const configuration = findWangConfiguration(polynomial, [0, 1, 2]);

		const lifted = liftWangConfiguration(
			configuration,
			[0, 1, 2],
			1_000_003n
		);

		expect(lifted).not.toBeNull();
		if (lifted !== null) {
			expect(lifted).toHaveLength(2);
			expect(lifted.some(factor => factor.equals(first))).toBe(true);
			expect(lifted.some(factor => factor.equals(second))).toBe(true);
		}
	});

	it('lifts trivariate factors with nonconstant main-variable leading coefficients', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const first = y
			.add(constant(3, 1n))
			.multiply(x)
			.add(z)
			.add(constant(3, 1n));
		const second = z
			.add(constant(3, 2n))
			.multiply(x)
			.add(y)
			.add(constant(3, 1n));
		const polynomial = first.multiply(second);
		const configuration = findWangConfiguration(polynomial, [0, 1, 2]);

		const lifted = liftWangConfiguration(
			configuration,
			[0, 1, 2],
			1_000_003n
		);

		expect(lifted).not.toBeNull();
		if (lifted !== null) {
			expect(lifted).toHaveLength(2);
			expect(lifted.some(factor => factor.equals(first))).toBe(true);
			expect(lifted.some(factor => factor.equals(second))).toBe(true);
		}
	});
});

describe('SparsePolynomial bivariate Wang lifting', () => {
	it('lifts two linear bivariate factors exactly', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = x.add(y).add(constant(2, 1n));
		const second = x.subtract(y).add(constant(2, 2n));
		const polynomial = first.multiply(second);
		const configuration = findWangBivariateConfiguration(polynomial, [0, 1]);

		const lifted = liftWangBivariateConfiguration(
			configuration,
			[0, 1],
			1_000_003n
		);

		expect(lifted).not.toBeNull();
		if (lifted !== null) {
			expect(lifted).toHaveLength(2);
			expect(lifted.some(factor => factor.equals(first))).toBe(true);
			expect(lifted.some(factor => factor.equals(second))).toBe(true);
		}
	});

	it('lifts factors with nonconstant main-variable leading coefficients', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = y
			.add(constant(2, 1n))
			.multiply(x)
			.add(y.multiply(y))
			.add(constant(2, 1n));
		const second = y
			.add(constant(2, 2n))
			.multiply(x)
			.add(y)
			.add(constant(2, 3n));
		const polynomial = first.multiply(second);

		const factors = factorSquareFreeBivariateInteger(polynomial, [0, 1]);

		expect(factors).toHaveLength(2);
		expect(factors.some(factor => factor.equals(first))).toBe(true);
		expect(factors.some(factor => factor.equals(second))).toBe(true);
	});

	it('lifts three bivariate factors', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = x.add(y).add(constant(2, 1n));
		const second = x.subtract(y).add(constant(2, 2n));
		const third = x.add(y.scale(2n)).add(constant(2, 3n));
		const polynomial = first.multiply(second).multiply(third);

		const factors = factorSquareFreeBivariateInteger(polynomial, [0, 1]);

		expect(factors).toHaveLength(3);
		expect(factors.some(factor => factor.equals(first))).toBe(true);
		expect(factors.some(factor => factor.equals(second))).toBe(true);
		expect(factors.some(factor => factor.equals(third))).toBe(true);
	});

	it('factors four linear terms with polynomial leading coefficients', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const factors = [
			y.add(constant(2, 1n)).multiply(x).add(y.multiply(y)).add(constant(2, 1n)),
			y.add(constant(2, 2n)).multiply(x).add(y.scale(2n)).add(constant(2, 3n)),
			y.add(constant(2, 3n)).multiply(x).add(y.pow(3n)).add(constant(2, 5n)),
			y.add(constant(2, 5n)).multiply(x).add(y).add(constant(2, 7n)),
		];
		const polynomial = factors.reduce(
			(product, factor) => product.multiply(factor),
			constant(2, 1n)
		);

		const actual = factorSquareFreeBivariateInteger(polynomial, [0, 1]);

		expect(actual).toHaveLength(factors.length);
		expect(
			factors.every(target => actual.some(factor => factor.equals(target)))
		).toBe(true);
	});

	it('factors sparse inputs with high tail-variable degree', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = x.add(y.pow(6n)).add(constant(2, 1n));
		const second = x.subtract(y.pow(5n)).add(constant(2, 2n));
		const polynomial = first.multiply(second);

		const factors = factorSquareFreeBivariateInteger(polynomial, [0, 1]);

		expect(factors).toHaveLength(2);
		expect(factors.some(factor => factor.equals(first))).toBe(true);
		expect(factors.some(factor => factor.equals(second))).toBe(true);
	});

	it('factors products with larger integer coefficients', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const factors = [
			x.scale(17n).add(y.scale(13n)).add(constant(2, 19n)),
			x.scale(23n).subtract(y.scale(11n)).add(constant(2, 29n)),
			x.scale(5n).add(y.scale(7n)).subtract(constant(2, 31n)),
		];
		const polynomial = factors.reduce(
			(product, factor) => product.multiply(factor),
			constant(2, 1n)
		);

		const actual = factorSquareFreeBivariateInteger(polynomial, [0, 1]);

		expect(actual).toHaveLength(factors.length);
		expect(
			factors.every(target => actual.some(factor => factor.equals(target)))
		).toBe(true);
	});

	it('leaves an irreducible bivariate polynomial whole', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = x.multiply(x).add(y.multiply(y)).add(constant(2, 1n));

		const factors = factorSquareFreeBivariateInteger(polynomial, [0, 1]);

		expect(factors).toHaveLength(1);
		expect(factors[0].equals(polynomial)).toBe(true);
	});

	it('rejects repeated main-variable factors before lifting', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const factor = x.add(y).add(constant(2, 1n));

		expect(() =>
			factorSquareFreeBivariateInteger(factor.multiply(factor), [0, 1])
		).toThrow(RangeError);
	});
});

describe('SparsePolynomial bivariate Wang leading coefficients', () => {
	it('assigns distinct leading-coefficient factors to specialized factors', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = y.add(constant(2, 1n)).multiply(x).add(constant(2, 1n));
		const second = y.add(constant(2, 2n)).multiply(x).add(constant(2, 1n));
		const polynomial = first.multiply(second);

		const configuration = testWangBivariateConfiguration(
			polynomial,
			[0, 1],
			1n
		);

		expect(configuration).not.toBeNull();
		if (configuration !== null) {
			expect(configuration.leadingCoefficients).toHaveLength(2);
			expect(
				configuration.leadingCoefficients.some(coefficient =>
					coefficient.equals(y.add(constant(2, 1n)))
				)
			).toBe(true);
			expect(
				configuration.leadingCoefficients.some(coefficient =>
					coefficient.equals(y.add(constant(2, 2n)))
				)
			).toBe(true);
		}
	});

	it('reconstructs repeated factors of the main leading coefficient', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const yPlusOne = y.add(constant(2, 1n));
		const first = yPlusOne
			.multiply(yPlusOne)
			.multiply(x)
			.add(constant(2, 1n));
		const second = y
			.add(constant(2, 2n))
			.multiply(x)
			.add(constant(2, 1n));
		const polynomial = first.multiply(second);

		const configuration = testWangBivariateConfiguration(
			polynomial,
			[0, 1],
			1n
		);

		expect(configuration).not.toBeNull();
		if (configuration !== null) {
			expect(
				configuration.leadingCoefficients.some(coefficient =>
					coefficient.equals(yPlusOne.multiply(yPlusOne))
				)
			).toBe(true);
		}
	});

	it('rejects an evaluation whose leading-factor values are not distinguishable', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = y
			.add(constant(2, 1n))
			.multiply(x)
			.scale(2n)
			.add(constant(2, 1n));
		const second = y
			.add(constant(2, 2n))
			.multiply(x)
			.scale(3n)
			.add(constant(2, 1n));
		const polynomial = first.multiply(second);

		expect(
			testWangBivariateConfiguration(polynomial, [0, 1], 1n)
		).toBeNull();
	});

	it('restores scalar parts of factor leading coefficients', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const firstLeading = y.add(constant(2, 1n)).scale(2n);
		const secondLeading = y.add(constant(2, 2n)).scale(3n);
		const polynomial = firstLeading
			.multiply(x)
			.add(constant(2, 1n))
			.multiply(
				secondLeading.multiply(x).add(constant(2, 1n))
			);

		const configuration = testWangBivariateConfiguration(
			polynomial,
			[0, 1],
			9n
		);

		expect(configuration).not.toBeNull();
		if (configuration !== null) {
			expect(
				configuration.leadingCoefficients.some(coefficient =>
					coefficient.equals(firstLeading)
				)
			).toBe(true);
			expect(
				configuration.leadingCoefficients.some(coefficient =>
					coefficient.equals(secondLeading)
				)
			).toBe(true);
		}
	});

	it('searches past unsuitable leading-factor evaluations', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const first = y
			.add(constant(2, 1n))
			.multiply(x)
			.scale(2n)
			.add(constant(2, 1n));
		const second = y
			.add(constant(2, 2n))
			.multiply(x)
			.scale(3n)
			.add(constant(2, 1n));
		const polynomial = first.multiply(second);

		const configuration = findWangBivariateConfiguration(polynomial, [0, 1]);

		expect(configuration.evaluation.values).not.toEqual([1n]);
		const targetLeading = configuration.polynomial.leadingCoefficientIn(0);
		expect(targetLeading).not.toBeNull();
		if (targetLeading !== null) {
			expect(
				productLeadingCoefficients(configuration.leadingCoefficients).equals(
					targetLeading
				)
			).toBe(true);
		}
	});

	it('requires primitive bivariate input with positive leading sign', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);

		expect(() =>
			testWangBivariateConfiguration(
				x.add(y).scale(2n),
				[0, 1],
				1n
			)
		).toThrow(RangeError);
		expect(() =>
			testWangBivariateConfiguration(
				x.add(y).negate(),
				[0, 1],
				1n
			)
		).toThrow(RangeError);
	});
});

function productLeadingCoefficients(
	factors: readonly SparsePolynomial[]
): SparsePolynomial {
	return factors.reduce(
		(product, factor) => product.multiply(factor),
		SparsePolynomial.constant(factors[0]?.variableCount ?? 2, 1n)
	);
}

describe('SparsePolynomial Wang evaluation', () => {
	it('accepts a specialization preserving degree and square-freeness', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = x
			.add(y)
			.multiply(x.subtract(y).add(constant(2, 1n)));

		const evaluation = testWangEvaluationPoint(polynomial, [0, 1], [2n]);

		expect(evaluation).not.toBeNull();
		if (evaluation !== null) {
			expect(evaluation.values).toEqual([2n]);
			expect(evaluation.content).toBe(1n);
			expect(evaluation.polynomial.degree(0)).toBe(2n);
			expect(evaluation.factors).toHaveLength(2);
		}
	});

	it('rejects a point where the main leading coefficient vanishes', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = y
			.subtract(constant(2, 2n))
			.multiply(x)
			.add(constant(2, 1n));

		expect(testWangEvaluationPoint(polynomial, [0, 1], [2n])).toBeNull();
	});

	it('rejects a specialization that introduces a repeated univariate factor', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = x
			.subtract(y)
			.multiply(x.subtract(constant(2, 2n)));

		expect(testWangEvaluationPoint(polynomial, [0, 1], [2n])).toBeNull();
	});

	it('extracts integer content from the specialized polynomial', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = x
			.add(constant(2, 1n))
			.multiply(y.add(constant(2, 2n)))
			.scale(3n);

		const evaluation = testWangEvaluationPoint(polynomial, [0, 1], [0n]);

		expect(evaluation).not.toBeNull();
		if (evaluation !== null) {
			expect(evaluation.content).toBe(6n);
			expect(evaluation.polynomial.equals(x.add(constant(2, 1n)))).toBe(true);
		}
	});

	it('searches outward deterministically when the origin is unusable', () => {
		const x = variable(2, 0);
		const y = variable(2, 1);
		const polynomial = y
			.multiply(x)
			.add(constant(2, 1n));

		const evaluation = findWangEvaluationPoint(polynomial, [0, 1]);

		expect(evaluation.values).toEqual([-1n]);
		expect(evaluation.polynomial.degree(0)).toBe(1n);
	});

	it('supports deterministic specialization of several tail variables', () => {
		const x = variable(3, 0);
		const y = variable(3, 1);
		const z = variable(3, 2);
		const polynomial = y
			.add(z)
			.multiply(x)
			.add(y.multiply(z))
			.add(constant(3, 1n));

		const evaluation = findWangEvaluationPoint(polynomial, [0, 1, 2]);

		expect(evaluation.values).toEqual([-1n, -1n]);
		expect(evaluation.polynomial.degree(0)).toBe(1n);
	});

	it('requires ordered selected variables covering every active coordinate', () => {
		const polynomial = variable(3, 0).add(variable(3, 2));

		expect(() => findWangEvaluationPoint(polynomial, [0, 1])).toThrow(RangeError);
		expect(() => findWangEvaluationPoint(polynomial, [2, 0])).toThrow(RangeError);
	});

	it('requires exactly one evaluation value for each tail variable', () => {
		const polynomial = variable(3, 0)
			.add(variable(3, 1))
			.add(variable(3, 2));

		expect(() =>
			testWangEvaluationPoint(polynomial, [0, 1, 2], [1n])
		).toThrow(RangeError);
	});
});
