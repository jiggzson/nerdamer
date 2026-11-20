import Decimal from 'decimal.js';

import * as factorModule from '../../src/algebra/factor/factor';
import nerdamer from '../../src/index';

/** Solves a cubic and returns its roots evaluated as sorted Decimals. */
function realRoots(source: string): Decimal[] {
	const solutions = nerdamer(`solve(${source},x)`).text().slice(1, -1).split(', ');
	return solutions
		.map(root => new Decimal(nerdamer(root).evaluate().text({ decimal: true })))
		.sort((a, b) => a.cmp(b));
}

describe('Cubics with three real roots', () => {
	// Reference values from mpmath at 30 digits.
	const cases: [string, string[]][] = [
		[
			'x^3-3*x+1',
			[
				'-1.879385241571816768108219',
				'0.3472963553338606977034333',
				'1.532088886237956070404785',
			],
		],
		[
			'x^3-100*x-1',
			[
				'-9.994996244991781845613701',
				'-0.01000001000003000012000055',
				'10.0049962549918118457337',
			],
		],
		[
			'x^3-2*x^2-5*x+1',
			[
				'-1.575773472651936072015953',
				'0.1872837251102239188569922',
				'3.388489747541712153158961',
			],
		],
		[
			'x^3-1000000*x-1',
			['-999.999999499999999625', '-0.000001000000000000000001', '1000.000000499999999625'],
		],
		['x^3-10^10*x-1', ['-99999.99999999995', '-1.0e-10', '100000.00000000005']],
	];

	it('finds all three roots', () => {
		for (const [source, expected] of cases) {
			const roots = realRoots(source);
			expect(roots).toHaveLength(3);
			roots.forEach((root, k) => {
				const exact = new Decimal(expected[k]);
				expect(root.minus(exact).abs().div(exact.abs()).lt('1e-15')).toBe(true);
			});
		}
	});

	it('returns the exact trigonometric form', () => {
		expect(nerdamer('solve(x^3-3*x+1,x)').text()).toEqual(
			'{2*cos((2/9)*pi), 2*cos((4/9)*pi), 2*cos((10/9)*pi)}'
		);
	});

	it('evaluates the cube root of a complex number', () => {
		const value = nerdamer('cbrt(1/2+3*i)').evaluate();
		expect(nerdamer('realpart(v)', { v: value }).evaluate().text()).toEqual(
			'1.2926998933380584029'
		);
		expect(nerdamer('imagpart(v)', { v: value }).evaluate().text()).toEqual(
			'0.65428985371009406275'
		);
	});

	it('keeps rational and single-real-root cubics unchanged', () => {
		expect(nerdamer('solve(x^3-6*x^2+11*x-6,x)').text()).toEqual('{3, 2, 1}');
		expect(nerdamer('solve(x^3-3*x+2,x)').text()).toEqual('{-2, 1}');
	});
});

describe('Irreducible cubics without factoring', () => {
	it('skips the factoring attempt and keeps the exact form', () => {
		const spy = jest.spyOn(factorModule, 'factorExpressionParts');
		try {
			expect(nerdamer('solve(x^3-3*x+1,x)').text()).toEqual(
				'{2*cos((2/9)*pi), 2*cos((4/9)*pi), 2*cos((10/9)*pi)}'
			);
			expect(nerdamer('solve(x^3-2,x)').text()).toEqual(
				'{cbrt(2), (-1/2)*cbrt(2)+(1/2)*3^(1/2)*cbrt(2)*i, (-1/2)*cbrt(2)+(-1/2)*3^(1/2)*cbrt(2)*i}'
			);
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	it('still factors cubics with a rational root', () => {
		const spy = jest.spyOn(factorModule, 'factorExpressionParts');
		try {
			expect(nerdamer('solve(x^3-7*x+6,x)').text()).toEqual('{-3, 2, 1}');
			expect(nerdamer('solve(6*x^3-5*x^2-2*x+1,x)').text()).toEqual('{1/3, -1/2, 1}');
			expect(spy).toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	it('falls back to the general path for a large leading coefficient', () => {
		// The rational root check needs denominators up to the leading coefficient.
		const spy = jest.spyOn(factorModule, 'factorExpressionParts');
		try {
			const roots = nerdamer('solve(3000000007*x^3-x-1,x)').text().slice(1, -1).split(', ');
			expect(roots).toHaveLength(3);
			expect(spy).toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});
});
