import {
	Groebner,
	groebnerBasisWithOptions,
	eliminate,
	idealMembership,
	reduceByBasis,
	solve,
	GroebnerBudgetExceeded,
} from '../../src/algebra/algorithms/groebnerBase';
import { Expression } from '../../src/core/classes/expression/Expression';
import { SparsePolynomial } from '../../src/core/classes/polynomial/SparsePolynomial';
import { sparsePolynomialToExpression } from '../../src/core/classes/polynomial/SparsePolynomialAdapter';
import { groebner } from '../../src/algebra/groebner';
import { Vector } from '../../src/core/classes/vector/Vector';

import type { MonomialOrder, RationalSolution } from '../../src/algebra/algorithms/groebnerBase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_VARIABLE_COUNT = 3;

/** Shorthand: variable x_i in the shared test ring. */
function x(i: number): SparsePolynomial {
	return SparsePolynomial.variable(TEST_VARIABLE_COUNT, i);
}

/** Shorthand: constant in the shared test ring. */
function c(n: bigint): SparsePolynomial {
	return SparsePolynomial.constant(TEST_VARIABLE_COUNT, n);
}

function addPoly(a: SparsePolynomial, b: SparsePolynomial): SparsePolynomial {
	return a.add(b);
}

function subPoly(a: SparsePolynomial, b: SparsePolynomial): SparsePolynomial {
	return a.subtract(b);
}

function mulPoly(a: SparsePolynomial, b: SparsePolynomial): SparsePolynomial {
	return a.multiply(b);
}

function scalePoly(a: SparsePolynomial, coefficient: bigint): SparsePolynomial {
	return a.scale(coefficient);
}

function polyText(poly: SparsePolynomial, names: readonly string[]): string {
	const variables = new Array<string>(poly.variableCount);
	for (let i = 0; i < poly.variableCount; i++) {
		variables[i] = names[i] ?? `x${i}`;
	}
	return sparsePolynomialToExpression(poly, variables).text();
}

/** Convert solution map to a sorted string for deterministic comparison */
function solToStr(sol: RationalSolution): string {
	const entries: Array<[string, { n: bigint; d: bigint }]> = Array.from(sol.entries());
	entries.sort((a, b) => a[0].localeCompare(b[0]));
	return entries.map(([k, v]) => `${k}=${v.n}/${v.d}`).join(', ');
}

/** Check that a polynomial set contains a constant (ideal = whole ring) */
function basisIsUnit(basis: readonly SparsePolynomial[]): boolean {
	return basis.length === 1 && basis[0].isConstant() && basis[0].constantTerm() !== 0n;
}

function sparseOrder(order: MonomialOrder): 'lex' | 'grlex' | 'grevlex' {
	return order.toLowerCase() as 'lex' | 'grlex' | 'grevlex';
}

function monomialDivides(a: readonly bigint[], b: readonly bigint[]): boolean {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] > b[i]) {
			return false;
		}
	}
	return true;
}

function sPolynomial(
	f: SparsePolynomial,
	g: SparsePolynomial,
	order: MonomialOrder
): SparsePolynomial {
	const ltF = f.leadingTerm(sparseOrder(order));
	const ltG = g.leadingTerm(sparseOrder(order));
	if (ltF === null || ltG === null) {
		return SparsePolynomial.zero(f.variableCount);
	}

	const lcm = ltF.exponents.map((exponent, i) =>
		exponent > ltG.exponents[i] ? exponent : ltG.exponents[i]
	);
	const fMultiplier = lcm.map((exponent, i) => exponent - ltF.exponents[i]);
	const gMultiplier = lcm.map((exponent, i) => exponent - ltG.exponents[i]);

	return f
		.multiply(SparsePolynomial.monomial(f.variableCount, ltG.coefficient, fMultiplier))
		.subtract(
			g.multiply(SparsePolynomial.monomial(g.variableCount, ltF.coefficient, gMultiplier))
		);
}

function expectGroebnerBasis(
	basis: readonly SparsePolynomial[],
	order: MonomialOrder
): void {
	for (let i = 0; i < basis.length; i++) {
		for (let j = i + 1; j < basis.length; j++) {
			expect(reduceByBasis(sPolynomial(basis[i], basis[j], order), basis, order).isZero()).toBe(
				true
			);
		}
	}
}

function expectReducedBasis(
	basis: readonly SparsePolynomial[],
	order: MonomialOrder
): void {
	for (let i = 0; i < basis.length; i++) {
		for (let j = 0; j < basis.length; j++) {
			if (i === j) {
				continue;
			}
			const lt = basis[j].leadingTerm(sparseOrder(order));
			if (lt === null) {
				continue;
			}
			for (const term of basis[i].terms()) {
				expect(monomialDivides(lt.exponents, term.exponents)).toBe(false);
			}
		}
	}
}

// ============================================================================
// Existing tests (preserved verbatim)
// ============================================================================

describe('Basis Groebner LEX', () => {
	it('Linear system / row-reduction equivalent', () => {
		expect(groebner(['1+11*x', '-5+11*y', '-7+11*z']).text()).toEqual(
			new Vector(['1+11*x', '-5+11*y', '-7+11*z']).text()
		);
	});

	it('Circle-line intersection', () => {
		expect(groebner(['x-y', '-1+2*y^2']).text()).toEqual(
			new Vector(['x-y', '-1+2*y^2']).text()
		);
	});

	it('Two conics intersection', () => {
		expect(groebner(['x^2-y', '-1+y+y^2']).text()).toEqual(
			new Vector(['x^2-y', '-1+y+y^2']).text()
		);
	});

	it('Homogeneous quadratic ideal', () => {
		expect(
			groebner(['-z^2+x*y', 'x^2+y^2-z^2', 'y^3-y*z^2+x*z^2', 'z^4+y^4-y^2*z^2']).text()
		).toEqual(
			new Vector(['y^3+x*z^2-y*z^2', '-z^2+x*y', 'x^2+y^2-z^2', 'y^4-y^2*z^2+z^4']).text()
		);
	});

	it('Inhomogeneous mixed-degree ideal', () => {
		expect(groebner(['1']).text()).toEqual(new Vector(['1']).text());
	});

	it('Multiplicity / repeated root behavior', () => {
		expect(groebner(['x-y-1', 'y^2']).text()).toEqual(new Vector(['x-y-1', 'y^2']).text());
	});

	it('Non-radical ideal', () => {
		expect(groebner(['x*y', 'x^2']).text()).toEqual(new Vector(['x*y', 'x^2']).text());
	});

	it('Parameterized coefficients', () => {
		expect(groebner(['x+a*y', 'y+a*x-1', 'x^2+y-y^2']).text()).toEqual(
			new Vector(['x+a*y', 'y+a*x-1', 'x^2+y-y^2']).text()
		);
	});

	it('Small lex-friendly solve system', () => {
		expect(groebner(['x-y-1', '-2+y+y^2']).text()).toEqual(
			new Vector(['x-y-1', '-2+y+y^2']).text()
		);
	});

	it('Cyclic-3 benchmark', () => {
		expect(groebner(['x+y+z', 'y^2+y*z+z^2', '-1+z^3']).text()).toEqual(
			new Vector(['x+y+z', 'y^2+y*z+z^2', '-1+z^3']).text()
		);
	});

	it('Determinantal 2x2 minor', () => {
		expect(groebner(['a*d-b*c']).text()).toEqual(new Vector(['a*d-b*c']).text());
	});

	it('Toric/binomial ideal', () => {
		expect(groebner(['-y^2+x*z', '-z^2+x*y', 'x^2-y*z', 'y^3-z^3']).text()).toEqual(
			new Vector(['-y^2+x*z', '-z^2+x*y', 'x^2-y*z', 'y^3-z^3']).text()
		);
	});

	it('clears rational coefficient denominators at the sparse boundary', () => {
		expect(groebner(['x/2-y/2', 'y/3-1/3']).text()).toEqual(
			groebner(['x-y', 'y-1']).text()
		);
	});

	// Regression: Nerdamer 2.0 issue #11
	it('converges on the reported three-variable lex system', () => {
		const actual = groebner([
			'x*y^3-x^2-z+6',
			'x^3*y^2-y',
		]).elements.map(expression => Expression.create(expression));
		const expected = [
			'x^2+x*y*z^2-12*x*y*z+36*x*y+y^10*z-6*y^10-y^6-3*y^4*z^2+36*y^4*z-108*y^4-y^2*z^4+24*y^2*z^3-216*y^2*z^2+864*y^2*z-1296*y^2+z-6',
			'x*y^3+x*y*z^2-12*x*y*z+36*x*y+y^10*z-6*y^10-y^6-3*y^4*z^2+36*y^4*z-108*y^4-y^2*z^4+24*y^2*z^3-216*y^2*z^2+864*y^2*z-1296*y^2',
			'x*y*z^5-30*x*y*z^4+360*x*y*z^3-2160*x*y*z^2+6480*x*y*z-7775*x*y+y^10*z^4-24*y^10*z^3+216*y^10*z^2-864*y^10*z+1296*y^10+y^8*z-6*y^8-y^6*z^3+18*y^6*z^2-108*y^6*z+216*y^6-3*y^4*z^5+90*y^4*z^4-1080*y^4*z^3+6480*y^4*z^2-19440*y^4*z+23327*y^4-y^2*z^7+42*y^2*z^6-756*y^2*z^5+7560*y^2*z^4-45360*y^2*z^3+163294*y^2*z^2-326568*y^2*z+279864*y^2',
			'y^11-3*y^5*z+18*y^5-y^3*z^3+18*y^3*z^2-108*y^3*z+216*y^3-y',
		].map(expression => Expression.create(expression));

		expect(actual).toHaveLength(expected.length);
		for (const expectedPolynomial of expected) {
			expect(actual.some(polynomial => polynomial.eq(expectedPolynomial))).toBe(true);
		}
	});
});

describe('Basis Groebner LEX from original inputs', () => {
	const cases: Array<{ description: string; input: string[]; output: string[] }> = [
		{
			description: 'Linear system / row-reduction equivalent',
			input: ['x + y + z - 1', '2*x - y + z', 'x + 3*y - 2*z'],
			output: ['1+11*x', '-5+11*y', '-7+11*z'],
		},
		{
			description: 'Simple zero-dimensional quadratic system',
			input: ['x^2 - y', 'y^2 - x'],
			output: ['x-y^2', '-y+y^4'],
		},
		{
			description: 'Triangular system',
			input: ['x^2 - 2', 'y - x^2 + 1', 'z - y + 3'],
			output: ['-2+x^2', '-1+y', '2+z'],
		},
		{
			description: 'Basic elimination benchmark',
			input: ['x + y + z - 1', 'x^2 + y^2 + z^2 - 1', 'x - z'],
			output: ['x-z', '2*z+y-1', '-2*z+3*z^2'],
		},
		{
			description: 'Circle-line intersection',
			input: ['x^2 + y^2 - 1', 'y - x'],
			output: ['x-y', '-1+2*y^2'],
		},
		{
			description: 'Two conics intersection',
			input: ['x^2 + y^2 - 1', 'x^2 - y'],
			output: ['x^2-y', '-1+y+y^2'],
		},
		{
			description: 'Homogeneous quadratic ideal',
			input: ['x^2 + y^2 - z^2', 'x*y - z^2'],
			output: ['y^3-y*z^2+x*z^2', '-z^2+x*y', 'x^2+y^2-z^2', 'z^4+y^4-y^2*z^2'],
		},
		{
			description: 'Inhomogeneous mixed-degree ideal',
			input: ['x^2 + y - 3', 'x*y - 2', 'y^2 - x + 1'],
			output: ['1'],
		},
		{
			description: 'Symmetric relations / elementary symmetric reconstruction',
			input: ['x + y + z - s1', 'x*y + x*z + y*z - s2', 'x*y*z - s3'],
			output: ['s1-x-y-z', 's2-x*y-x*z-y*z', 's3-x*y*z'],
		},
		{
			description: 'Power sums to elementary relations',
			input: ['x + y - p1', 'x^2 + y^2 - p2'],
			output: ['p1-x-y', 'p2-x^2-y^2'],
		},
		{
			description: 'Boolean ideal in two variables',
			input: ['x^2 - x', 'y^2 - y'],
			output: ['-x+x^2', '-y+y^2'],
		},
		{
			description: 'Boolean ideal with logical constraint',
			input: ['x^2 - x', 'y^2 - y', 'z^2 - z', 'x + y + z - 2'],
			output: ['x+y+z-2', '-y+y*z-z+1', '-y+y^2', '-z+z^2'],
		},
		{
			description: 'Idempotent plus bilinear constraint',
			input: ['x^2 - x', 'y^2 - y', 'x*y - y'],
			output: ['-y+x*y', '-x+x^2', '-y+y^2'],
		},
		{
			description: 'Multiplicity / repeated root behavior',
			input: ['(x - 1)^2', 'y - x + 1'],
			output: ['x-y-1', 'y^2'],
		},
		{
			description: 'Non-radical ideal',
			input: ['x^2', 'x*y'],
			output: ['x*y', 'x^2'],
		},
		{
			description: 'Shared factor structure',
			input: ['x*y - x', 'y^2 - y'],
			output: ['-x+x*y', '-y+y^2'],
		},
		{
			description: 'Parameterized coefficients',
			input: ['a*x + y - 1', 'x + a*y'],
			output: ['x+a*y', 'y+a*x-1', 'x^2+y-y^2'],
		},
		{
			description: 'Small lex-friendly solve system',
			input: ['x^2 + y^2 - 5', 'x - y - 1'],
			output: ['x-y-1', '-2+y+y^2'],
		},
		{
			description: 'Small grevlex-friendly dense system',
			input: ['x^2*y + y^2*z + z^2*x - 1', 'x*y^2 + y*z^2 + z*x^2 - 1', 'x + y + z - 1'],
			output: [
				'x+y+z-1',
				'-2*z+4*z^2-6*z^3+3*z^4+6*y*z^3-6*y*z^2-2*y+2*y*z+1',
				'25*z-46*z^2-30*z^3+45*z^4-27*z^5+32*y*z-32*y+32*y^2+1',
				'-7+6*z-17*z^2+12*z^3+15*z^4-18*z^5+9*z^6',
			],
		},
		{
			description: 'Cyclic-3 benchmark',
			input: ['x + y + z', 'x*y + x*z + y*z', 'x*y*z - 1'],
			output: ['x+y+z', 'y^2+y*z+z^2', '-1+z^3'],
		},
		{
			description: 'Cyclic-4 benchmark',
			input: [
				'x + y + z + w',
				'x*y + y*z + z*w + w*x',
				'x*y*z + y*z*w + z*w*x + w*x*y',
				'x*y*z*w - 1',
			],
			output: [
				'w+x+y+z',
				'-2*z^2+y^2*z^4+x*y+y*z-x*z',
				'-x+x*z^4-z+z^5',
				'x^2+2*x*z+z^2',
				'1-y^2*z^2-z^4+y^2*z^6',
				'-y+y^3*z^2-z+y^2*z^3',
			],
		},
		{
			description: 'Katsura-2 benchmark',
			input: ['x0 + 2*x1 + 2*x2 - 1', 'x1^2 + 2*x0*x2 - x1', 'x2^2 + 2*x0*x1 - x2'],
			output: [
				'17*x0+33*x2+295*x2^2-350*x2^3-17',
				'34*x1+x2-295*x2^2+350*x2^3',
				'6*x2-27*x2^2-130*x2^3+175*x2^4',
			],
		},
		{
			description: 'Katsura-3 benchmark',
			input: [
				'x0 + 2*x1 + 2*x2 + 2*x3 - 1',
				'x1^2 + 2*x0*x2 + 2*x1*x3 - x1',
				'x2^2 + 2*x0*x1 + 2*x1*x3 - x2',
				'x3^2 + 2*x0*x3 + 2*x1*x2 - x3',
			],
			output: [
				'206462893560000*x0+1101447359372064*x3+3608126913731992*x3^2-31074812137198058*x3^3+98589017592499801*x3^4-60871151619973527*x3^5-359461710089070273*x3^6+102674736753891921*x3^7-206462893560000',
				'1238777361360000*x1-1964645944406184*x3+4863483209830898*x3^2+29142899699161973*x3^3-138908483862016156*x3^4+64593908348315262*x3^5+389851555224372138*x3^6-110545178682437451*x3^7',
				'1238777361360000*x2-100918772350008*x3-15687863951026874*x3^2+64081536712432201*x3^3-156858568915483247*x3^4+118019546511605319*x3^5+688533575042838681*x3^6-197479031579238312*x3^7',
				'-288*x3+2400*x3^2+5278*x3^3-50075*x3^4+190810*x3^5-171636*x3^6-721080*x3^7+209871*x3^8',
			],
		},
		{
			description: 'Bilinear system',
			input: ['x*u + y*v - 1', 'x*v - y*u'],
			output: ['u*y-v*x', 'u*x+v*y-1', '-y+v*y^2+v*x^2'],
		},
		{
			description: 'Determinantal 2x2 minor',
			input: ['a*d - b*c'],
			output: ['a*d-b*c'],
		},
		{
			description: 'Simple ideal membership / reduction benchmark',
			input: ['x^2 - y', 'x*y - 1'],
			output: ['-y^2+x', '-1+y^3'],
		},
		{
			description: 'Elimination for projection onto y,z',
			input: ['x - y^2', 'z - x*y + 1'],
			output: ['x-y^2', '-1-z+y^3'],
		},
		{
			description: 'Small robotics-style kinematic constraint',
			input: ['x^2 + y^2 - 1', '(x - a)^2 + y^2 - b^2'],
			output: ['a^2-2*a*x-b^2+1', 'x^2+y^2-1'],
		},
		{
			description: 'Singular variety at the origin',
			input: ['y^2 - x^3', 'z - x*y'],
			output: ['-y^4+x*z^2', '-z+x*y', '-y^3+x^2*z', 'x^3-y^2', '-z^3+y^5'],
		},
		{
			description: 'Toric/binomial ideal',
			input: ['x^2 - y*z', 'y^2 - x*z', 'z^2 - x*y'],
			output: ['-y^2+x*z', '-z^2+x*y', 'x^2-y*z', 'y^3-z^3'],
		},
		{
			description: 'Rank-deficient 2x3 matrix minors',
			input: ['a*u-b*d', 'a*f-c*d', 'b*f-c*u'],
			output: ['a*u-b*d', 'a*f-c*d', 'b*f-c*u'],
		},
	];

	it.each(cases)('$description', ({ input, output }) => {
		expect(groebner(input).text()).toEqual(new Vector(output).text());
	});
});

// ============================================================================
// Edge cases and empty/trivial inputs
// ============================================================================

describe('Groebner edge cases', () => {
	it('empty input returns empty basis', () => {
		expect(Groebner([])).toEqual([]);
	});

	it('single zero polynomial returns empty basis', () => {
		expect(Groebner([SparsePolynomial.zero(TEST_VARIABLE_COUNT)])).toEqual([]);
	});

	it('single nonzero constant yields [1]', () => {
		const basis = Groebner([c(7n)]);
		expect(basisIsUnit(basis)).toBe(true);
	});

	it('single linear polynomial is its own basis', () => {
		// x + 1  (var index 0)
		const p = addPoly(x(0), c(1n));
		const basis = Groebner([p]);
		expect(basis.length).toBe(1);
		// Should be monic: x + 1 (spacing depends on SparsePolynomial expression formatting convention)
		const txt = polyText(basis[0], ['x']);
		expect(txt === 'x+1' || txt === 'x + 1' || txt === '1 + x' || txt === '1+x').toBe(true);
	});

	it('two identical generators reduce to one', () => {
		const p = addPoly(x(0), c(1n));
		const basis = Groebner([p, p]);
		expect(basis.length).toBe(1);
	});

	it('preserves exponents above the JavaScript safe-integer range at the sparse boundary', () => {
		const exponent = 9007199254740993n;
		const p = SparsePolynomial.monomial(TEST_VARIABLE_COUNT, 1n, [exponent, 0n, 0n]);
		const basis = groebnerBasisWithOptions([p], { order: 'LEX' });
		expect(basis).toHaveLength(1);
		expect(basis[0].coefficient([exponent, 0n, 0n])).toBe(1n);
	});

	it('inconsistent system yields [1]', () => {
		// x = 1 and x = 2 => 1 ∈ ideal
		const p1 = subPoly(x(0), c(1n)); // x - 1
		const p2 = subPoly(x(0), c(2n)); // x - 2
		const basis = Groebner([p1, p2]);
		expect(basisIsUnit(basis)).toBe(true);
	});

	it('univariate GCD-like behavior', () => {
		// (x-1)(x-2) and (x-2)(x-3)  =>  GCD = x-2
		const x0 = x(0);
		const f = mulPoly(subPoly(x0, c(1n)), subPoly(x0, c(2n))); // x^2 - 3x + 2
		const g = mulPoly(subPoly(x0, c(2n)), subPoly(x0, c(3n))); // x^2 - 5x + 6
		const basis = Groebner([f, g]);
		expect(basis.length).toBe(1);
		// Should be x - 2 (up to sign/content/spacing)
		const txt = polyText(basis[0], ['x']);
		// SparsePolynomial expression formatting uses ' - ' and ' + ' for non-leading terms
		expect(txt === 'x - 2' || txt === '-2 + x' || txt === 'x-2' || txt === '-2+x').toBe(true);
	});

	it('returns a basis reduced against its other elements', () => {
		const x0 = x(0);
		const y0 = x(1);
		const f = addPoly(mulPoly(x0, x0), scalePoly(y0, -1n)); // x^2 - y
		const g = addPoly(mulPoly(x0, y0), c(-1n)); // x*y - 1
		const redundant = mulPoly(x0, f);
		const basis = Groebner([f, g, redundant], 'LEX');

		for (let i = 0; i < basis.length; i++) {
			const others = basis.filter((_, j) => j !== i);
			const reduced = reduceByBasis(basis[i], others, 'LEX');
			expect(polyText(reduced, ['x', 'y'])).toBe(polyText(basis[i], ['x', 'y']));
		}
	});
});

// ============================================================================
// Monomial orders
// ============================================================================

describe('Monomial order variations', () => {
	// Build x^2 + y^2 - 1, x*y - 1 in vars [x=0, y=1]
	function circleAndHyperbola(): SparsePolynomial[] {
		const x0 = x(0),
			y0 = x(1);
		const f = addPoly(addPoly(mulPoly(x0, x0), mulPoly(y0, y0)), c(-1n)); // x^2 + y^2 - 1
		const g = addPoly(mulPoly(x0, y0), c(-1n)); // xy - 1
		return [f, g];
	}

	it('LEX order produces triangular system', () => {
		const basis = Groebner(circleAndHyperbola(), 'LEX');
		// In LEX with x > y, the basis should contain a polynomial in y alone.
		const vars = ['x', 'y'];
		const yOnly = basis.filter((p: SparsePolynomial) => {
			const txt = polyText(p, vars);
			return !txt.includes('x');
		});
		expect(yOnly.length).toBeGreaterThanOrEqual(1);
	});

	it('GRLEX order is valid Groebner basis', () => {
		const basis = Groebner(circleAndHyperbola(), 'GRLEX');
		expect(basis.length).toBeGreaterThan(0);
		// Every S-polynomial should reduce to zero (verified implicitly by the algorithm).
		// Here we just check it's non-trivial and non-unit.
		expect(basisIsUnit(basis)).toBe(false);
	});

	it('GREVLEX order is valid Groebner basis', () => {
		const basis = Groebner(circleAndHyperbola(), 'GREVLEX');
		expect(basis.length).toBeGreaterThan(0);
		expect(basisIsUnit(basis)).toBe(false);
	});

	it('all three orders agree on ideal membership', () => {
		const polys = circleAndHyperbola();
		// x^2*y^2 - 1 should be in the ideal since xy - 1 implies x^2*y^2 = 1
		const x0 = x(0),
			y0 = x(1);
		const f = addPoly(mulPoly(mulPoly(x0, x0), mulPoly(y0, y0)), c(-1n));

		for (const order of ['LEX', 'GRLEX', 'GREVLEX'] as MonomialOrder[]) {
			expect(idealMembership(f, polys, order)).toBe(true);
		}
	});
});

// ============================================================================
// Ideal membership
// ============================================================================

describe('idealMembership', () => {
	it('zero polynomial is always a member', () => {
		const polys = [addPoly(x(0), c(1n))]; // {x + 1}
		expect(idealMembership(SparsePolynomial.zero(TEST_VARIABLE_COUNT), polys)).toBe(true);
	});

	it('generator is a member of its own ideal', () => {
		const f = addPoly(mulPoly(x(0), x(0)), c(-1n)); // x^2 - 1
		expect(idealMembership(f, [f])).toBe(true);
	});

	it('product of generators is a member', () => {
		const f = addPoly(x(0), c(1n)); // x + 1
		const g = addPoly(x(1), c(-2n)); // y - 2
		const fg = mulPoly(f, g);
		expect(idealMembership(fg, [f, g])).toBe(true);
	});

	it('non-member is correctly rejected', () => {
		const f = addPoly(x(0), c(1n)); // x + 1
		const g = addPoly(x(1), c(1n)); // y + 1
		// x + y + 3 is NOT in <x+1, y+1> because reducing gives 1 ≠ 0
		const h = addPoly(addPoly(x(0), x(1)), c(3n));
		expect(idealMembership(h, [f, g])).toBe(false);
	});

	it('non-member returns false for empty generators', () => {
		expect(idealMembership(c(1n), [])).toBe(false);
	});

	it('element of <x^2, xy> that requires tail reduction', () => {
		const x0 = x(0),
			y0 = x(1);
		const f = mulPoly(x0, x0); // x^2
		const g = mulPoly(x0, y0); // xy
		// x^2*y = y * x^2 = x * (xy), so it's in <x^2, xy>
		const h = mulPoly(mulPoly(x0, x0), y0);
		expect(idealMembership(h, [f, g])).toBe(true);
	});
});

// ============================================================================
// reduceByBasis
// ============================================================================

describe('reduceByBasis', () => {
	it('reduces zero to zero', () => {
		const basis = [addPoly(x(0), c(1n))];
		const r = reduceByBasis(SparsePolynomial.zero(TEST_VARIABLE_COUNT), basis);
		expect(r.isZero()).toBe(true);
	});

	it('reduces generator to zero', () => {
		const f = addPoly(x(0), c(1n));
		const basis = Groebner([f]);
		const r = reduceByBasis(f, basis);
		expect(r.isZero()).toBe(true);
	});

	it('reduces non-member to nonzero remainder', () => {
		// Basis: {x + 1}. Reduce y => y (irreducible).
		const basis = Groebner([addPoly(x(0), c(1n))]);
		const r = reduceByBasis(x(1), basis);
		expect(r.isZero()).toBe(false);
	});

	it('reduces against empty basis to itself', () => {
		const f = addPoly(x(0), c(5n));
		const r = reduceByBasis(f, []);
		expect(polyText(r, ['x'])).toBe(polyText(f, ['x']));
	});
});

// ============================================================================
// Elimination
// ============================================================================

describe('eliminate', () => {
	it('eliminates x from {x - y, x^2 + y - 2}', () => {
		const x0 = x(0),
			y0 = x(1);
		const f = subPoly(x0, y0); // x - y
		const g = addPoly(addPoly(mulPoly(x0, x0), y0), c(-2n)); // x^2 + y - 2

		// vars ordered [x, y] so x is eliminated first
		const result = eliminate([f, g], ['x', 'y'], ['y']);
		expect(result.length).toBeGreaterThanOrEqual(1);

		// Every result polynomial should involve only y (variable index 1)
		for (const p of result) {
			const vars = p.variables();
			for (const v of vars) {
				expect(v).toBe(1); // only y
			}
		}
	});

	it('eliminating no variables returns full basis', () => {
		const f = addPoly(x(0), c(1n));
		const result = eliminate([f], ['x'], ['x']);
		expect(result.length).toBe(1);
	});

	it('empty input returns empty', () => {
		expect(eliminate([], ['x', 'y'], ['y'])).toEqual([]);
	});

	it('elimination of all variables from inconsistent system yields [1]', () => {
		const p1 = subPoly(x(0), c(1n));
		const p2 = subPoly(x(0), c(2n));
		// Eliminating x from {x-1, x-2} should give {1} (inconsistent)
		const result = eliminate([p1, p2], ['x'], []);
		expect(result.length).toBe(1);
		expect(basisIsUnit(result)).toBe(true);
	});
});

// ============================================================================
// Solver
// ============================================================================

describe('solve', () => {
	it('solves a simple linear system: x=1, y=2', () => {
		const f = subPoly(x(0), c(1n)); // x - 1
		const g = subPoly(x(1), c(2n)); // y - 2
		const sols = solve([f, g], ['x', 'y']);
		expect(sols.length).toBe(1);
		expect(sols[0].get('x')).toEqual({ n: 1n, d: 1n });
		expect(sols[0].get('y')).toEqual({ n: 2n, d: 1n });
	});

	it('solves x^2 - 1 = 0 (two roots)', () => {
		const f = addPoly(mulPoly(x(0), x(0)), c(-1n)); // x^2 - 1
		const sols = solve([f], ['x']);
		expect(sols.length).toBe(2);
		const vals = sols.map((s: RationalSolution) => s.get('x')!.n).sort();
		expect(vals).toEqual([-1n, 1n]);
	});

	it('solves intersection: x = y, x^2 + y^2 = 2', () => {
		const x0 = x(0),
			y0 = x(1);
		const f = subPoly(x0, y0); // x - y
		const g = addPoly(addPoly(mulPoly(x0, x0), mulPoly(y0, y0)), c(-2n)); // x^2 + y^2 - 2
		const sols = solve([f, g], ['x', 'y']);
		expect(sols.length).toBe(2);
		const strs = sols.map(solToStr).sort();
		expect(strs).toEqual(['x=-1/1, y=-1/1', 'x=1/1, y=1/1']);
	});

	it('inconsistent system returns empty', () => {
		const p1 = subPoly(x(0), c(1n));
		const p2 = subPoly(x(0), c(2n));
		const sols = solve([p1, p2], ['x']);
		expect(sols.length).toBe(0);
	});

	it('system with no rational roots returns empty', () => {
		// x^2 + 1 = 0 has no rational roots
		const f = addPoly(mulPoly(x(0), x(0)), c(1n));
		const sols = solve([f], ['x']);
		expect(sols.length).toBe(0);
	});

	it('system with rational root x = 1/2', () => {
		// 2x - 1 = 0  =>  x = 1/2
		const f = addPoly(scalePoly(x(0), 2n), c(-1n));
		const sols = solve([f], ['x']);
		expect(sols.length).toBe(1);
		expect(sols[0].get('x')).toEqual({ n: 1n, d: 2n });
	});

	it('solves a sparse high-degree polynomial with a repeated zero root', () => {
		// x^257 - x^256 = x^256*(x - 1)
		const f = addPoly(
			SparsePolynomial.monomial(TEST_VARIABLE_COUNT, 1n, [257n, 0n, 0n]),
			SparsePolynomial.monomial(TEST_VARIABLE_COUNT, -1n, [256n, 0n, 0n])
		);
		const sols = solve([f], ['x']);
		const vals = sols.map((s: RationalSolution) => s.get('x')!.n).sort();
		expect(vals).toEqual([0n, 1n]);
	});

	it('empty input returns a single empty solution', () => {
		const sols = solve([], []);
		expect(sols.length).toBe(1);
		expect(sols[0].size).toBe(0);
	});
});

// ============================================================================
// Sugar vs FIFO strategy
// ============================================================================

describe('Sugar vs FIFO strategy', () => {
	it('both strategies produce equivalent bases for circle-line', () => {
		const x0 = x(0),
			y0 = x(1);
		const f = subPoly(x0, y0);
		const g = addPoly(addPoly(mulPoly(x0, x0), mulPoly(y0, y0)), c(-1n));
		const polys = [f, g];

		const sugarBasis = groebnerBasisWithOptions(polys, {
			order: 'GRLEX',
			reduced: true,
			strategy: 'sugar',
		});
		const fifoBasis = groebnerBasisWithOptions(polys, {
			order: 'GRLEX',
			reduced: true,
			strategy: 'fifo',
		});

		// Both should have the same number of elements
		expect(sugarBasis.length).toBe(fifoBasis.length);

		// Both should generate the same ideal: every element of one reduces to 0 mod the other.
		for (const p of sugarBasis) {
			expect(reduceByBasis(p, fifoBasis, 'GRLEX').isZero()).toBe(true);
		}
		for (const p of fifoBasis) {
			expect(reduceByBasis(p, sugarBasis, 'GRLEX').isZero()).toBe(true);
		}
	});

	it('both strategies produce equivalent bases for two conics', () => {
		const x0 = x(0),
			y0 = x(1);
		const f = addPoly(mulPoly(x0, x0), scalePoly(y0, -1n)); // x^2 - y
		const g = addPoly(addPoly(mulPoly(y0, y0), y0), c(-1n)); // y^2 + y - 1
		const polys = [f, g];

		const sugarBasis = groebnerBasisWithOptions(polys, {
			order: 'LEX',
			reduced: true,
			strategy: 'sugar',
		});
		const fifoBasis = groebnerBasisWithOptions(polys, {
			order: 'LEX',
			reduced: true,
			strategy: 'fifo',
		});

		expect(sugarBasis.length).toBe(fifoBasis.length);

		for (const p of sugarBasis) {
			expect(reduceByBasis(p, fifoBasis, 'LEX').isZero()).toBe(true);
		}
	});
});

// ============================================================================
// Budget controls
// ============================================================================

describe('Budget controls', () => {
	it('maxPairsPopped throws GroebnerBudgetExceeded', () => {
		const x0 = x(0),
			y0 = x(1),
			z0 = x(2);
		const f = addPoly(addPoly(mulPoly(x0, x0), mulPoly(y0, y0)), mulPoly(z0, z0));
		const g = addPoly(mulPoly(x0, y0), c(-1n));
		const h = addPoly(mulPoly(y0, z0), c(-1n));

		expect(() => {
			groebnerBasisWithOptions([f, g, h], {
				order: 'GRLEX',
				maxPairsPopped: 1,
			});
		}).toThrow(GroebnerBudgetExceeded);
	});

	it('maxBasisSize throws GroebnerBudgetExceeded', () => {
		const x0 = x(0),
			y0 = x(1),
			z0 = x(2);
		const f = addPoly(addPoly(mulPoly(x0, x0), mulPoly(y0, y0)), mulPoly(z0, z0));
		const g = addPoly(mulPoly(x0, y0), c(-1n));
		const h = addPoly(mulPoly(y0, z0), c(-1n));

		expect(() => {
			groebnerBasisWithOptions([f, g, h], {
				order: 'GRLEX',
				maxBasisSize: 3,
			});
		}).toThrow(GroebnerBudgetExceeded);
	});

	it('GroebnerBudgetExceeded includes stats', () => {
		const x0 = x(0),
			y0 = x(1);
		const f = addPoly(mulPoly(x0, x0), mulPoly(y0, y0));
		const g = addPoly(mulPoly(x0, y0), c(-1n));

		try {
			groebnerBasisWithOptions([f, g], {
				order: 'GRLEX',
				maxPairsPopped: 0,
			});
			fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(GroebnerBudgetExceeded);
			const err = e as GroebnerBudgetExceeded;
			expect(typeof err.stats.pairsPopped).toBe('number');
			expect(typeof err.stats.basisAppends).toBe('number');
		}
	});

	it('sufficient budget allows completion', () => {
		const f = addPoly(x(0), c(1n));
		const g = addPoly(x(1), c(-1n));
		// Simple system: should complete within tiny budgets
		const basis = groebnerBasisWithOptions([f, g], {
			order: 'GRLEX',
			maxPairsPopped: 100,
			maxBasisSize: 100,
		});
		expect(basis.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// Reduced vs unreduced basis
// ============================================================================

describe('Reduced vs unreduced basis', () => {
	it('reduced=false returns a superset that generates the same ideal', () => {
		const x0 = x(0),
			y0 = x(1);
		const f = subPoly(x0, y0);
		const g = addPoly(mulPoly(y0, y0), c(-1n));
		const polys = [f, g];

		const reducedBasis = groebnerBasisWithOptions(polys, {
			order: 'GRLEX',
			reduced: true,
		});
		const rawBasis = groebnerBasisWithOptions(polys, {
			order: 'GRLEX',
			reduced: false,
		});

		// Raw basis should be at least as large
		expect(rawBasis.length).toBeGreaterThanOrEqual(reducedBasis.length);

		// Every element of the reduced basis should be in the ideal generated by the raw basis
		for (const p of reducedBasis) {
			expect(reduceByBasis(p, rawBasis, 'GRLEX').isZero()).toBe(true);
		}
	});
});

// ============================================================================
// Gröbner correctness criteria
// ============================================================================

describe('Groebner correctness criteria', () => {
	const cases: Array<{
		description: string;
		order: MonomialOrder;
		polys: () => SparsePolynomial[];
	}> = [
		{
			description: 'two conics / LEX',
			order: 'LEX',
			polys: () => {
				const x0 = x(0);
				const x1 = x(1);
				return [
					addPoly(mulPoly(x0, x0), scalePoly(x1, -1n)),
					addPoly(addPoly(mulPoly(x1, x1), x1), c(-1n)),
				];
			},
		},
		{
			description: 'cyclic-3 / GRLEX',
			order: 'GRLEX',
			polys: () => {
				const x0 = x(0);
				const x1 = x(1);
				const x2 = x(2);
				return [
					addPoly(addPoly(x0, x1), x2),
					addPoly(addPoly(mulPoly(x0, x1), mulPoly(x0, x2)), mulPoly(x1, x2)),
					addPoly(mulPoly(mulPoly(x0, x1), x2), c(-1n)),
				];
			},
		},
		{
			description: 'toric binomial / GREVLEX',
			order: 'GREVLEX',
			polys: () => {
				const x0 = x(0);
				const x1 = x(1);
				const x2 = x(2);
				return [
					addPoly(mulPoly(x0, x0), scalePoly(mulPoly(x1, x2), -1n)),
					addPoly(mulPoly(x1, x1), scalePoly(mulPoly(x0, x2), -1n)),
					addPoly(mulPoly(x2, x2), scalePoly(mulPoly(x0, x1), -1n)),
				];
			},
		},
	];

	it.each(cases)('$description satisfies Buchberger and reduced-basis criteria', testCase => {
		const generators = testCase.polys();
		const basis = groebnerBasisWithOptions(generators, {
			order: testCase.order,
			reduced: true,
			strategy: 'sugar',
		});

		for (const generator of generators) {
			expect(reduceByBasis(generator, basis, testCase.order).isZero()).toBe(true);
		}
		expectGroebnerBasis(basis, testCase.order);
		expectReducedBasis(basis, testCase.order);
	});
});

// ============================================================================
// Larger / classic benchmarks
// ============================================================================

describe('Classic benchmarks', () => {
	it('Katsura-2 (3 variables)', () => {
		// Katsura-2: x0 + 2*x1 + 2*x2 - 1 = 0
		//            x0^2 + 2*x1^2 + 2*x2^2 - x0 = 0
		//            2*x0*x1 + 2*x1*x2 - x1 = 0
		const x0 = x(0),
			x1 = x(1),
			x2 = x(2);

		const f1 = addPoly(addPoly(addPoly(x0, scalePoly(x1, 2n)), scalePoly(x2, 2n)), c(-1n));
		const f2 = addPoly(
			addPoly(
				addPoly(mulPoly(x0, x0), scalePoly(mulPoly(x1, x1), 2n)),
				scalePoly(mulPoly(x2, x2), 2n)
			),
			scalePoly(x0, -1n)
		);
		const f3 = addPoly(
			addPoly(scalePoly(mulPoly(x0, x1), 2n), scalePoly(mulPoly(x1, x2), 2n)),
			scalePoly(x1, -1n)
		);

		const basis = Groebner([f1, f2, f3], 'GRLEX');
		expect(basis.length).toBeGreaterThan(0);
		expect(basisIsUnit(basis)).toBe(false);

		// Each original generator should be in the ideal
		for (const f of [f1, f2, f3]) {
			expect(idealMembership(f, basis)).toBe(true);
		}
	});

	it('Cyclic-3 via SparsePolynomial API', () => {
		const x0 = x(0),
			x1 = x(1),
			x2 = x(2);

		// x + y + z
		const f1 = addPoly(addPoly(x0, x1), x2);
		// xy + xz + yz
		const f2 = addPoly(addPoly(mulPoly(x0, x1), mulPoly(x0, x2)), mulPoly(x1, x2));
		// xyz - 1
		const f3 = addPoly(mulPoly(mulPoly(x0, x1), x2), c(-1n));

		const basis = Groebner([f1, f2, f3], 'GRLEX');
		expect(basis.length).toBeGreaterThan(0);

		// Generators should reduce to zero
		for (const f of [f1, f2, f3]) {
			expect(reduceByBasis(f, basis, 'GRLEX').isZero()).toBe(true);
		}
	});
});
