import Decimal from 'decimal.js';

import * as factorModule from '../../src/algebra/factor/factor';
import nerdamer from '../../src/index';

/** Solves a polynomial and returns its roots as [real, imaginary] Decimal pairs. */
function roots(source: string): [Decimal, Decimal][] {
	const solutions = nerdamer(`solve(${source},x)`).text().slice(1, -1).split(', ');
	return solutions.map(root => {
		const value = nerdamer(root).evaluate();
		const re = nerdamer('realpart(v)', { v: value }).evaluate().text({ decimal: true });
		const im = nerdamer('imagpart(v)', { v: value }).evaluate().text({ decimal: true });
		return [new Decimal(re), new Decimal(im)];
	});
}

/** True when every expected root is matched by a distinct computed root. */
function matchesAll(found: [Decimal, Decimal][], expected: [string, string][]): boolean {
	const left = [...found];
	return expected.every(([re, im]) => {
		const index = left.findIndex(([r, i]) => {
			const size = Decimal.max(new Decimal(re).abs(), new Decimal(im).abs(), 1);
			return r.minus(re).abs().plus(i.minus(im).abs()).div(size).lt('1e-15');
		});
		if (index >= 0) left.splice(index, 1);
		return index >= 0;
	});
}

describe('Quartics', () => {
	// Reference values from mpmath at 30 digits.
	const cases: [string, [string, string][]][] = [
		[
			'x^4+x+1',
			[
				['-0.7271360844911968399766757', '-0.4300142883297157764165199'],
				['-0.7271360844911968399766757', '0.4300142883297157764165199'],
				['0.7271360844911968399766757', '-0.9340992894605294396390303'],
				['0.7271360844911968399766757', '0.9340992894605294396390303'],
			],
		],
		[
			'x^4-x-1',
			[
				['-0.7244919590005156115883723', '0'],
				['-0.2481260628026219318866565', '-1.033982060975967756716863'],
				['-0.2481260628026219318866565', '1.033982060975967756716863'],
				['1.220744084605759475361685', '0'],
			],
		],
		[
			'2*x^4-3*x^3+x-5',
			[
				['-1.05795617403643969186051', '0'],
				['0.3872320170367600636772313', '-1.083977109889330414886373'],
				['0.3872320170367600636772313', '1.083977109889330414886373'],
				['1.783492139962919564506047', '0'],
			],
		],
	];

	it('finds all four roots of irreducible quartics without the factoring attempt', () => {
		const spy = jest.spyOn(factorModule, 'factorExpressionParts');
		try {
			for (const [source, expected] of cases) {
				const found = roots(source);
				expect(found).toHaveLength(4);
				expect(matchesAll(found, expected)).toBe(true);
			}
			expect(spy).not.toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	it('still factors quartics with a rational root or rational quadratic factors', () => {
		const spy = jest.spyOn(factorModule, 'factorExpressionParts');
		try {
			expect(nerdamer('solve((x^2+1)*(x^2-2),x)').text()).toEqual(
				'{i, -i, 2^(1/2), -2^(1/2)}'
			);
			expect(nerdamer('solve(x^4-5*x^2+4,x)').text()).toEqual('{-1, -2, 2, 1}');
			expect(nerdamer('solve(x^4-14*x^2+x+38,x)').text().startsWith('{2, ')).toBe(true);
			expect(spy).toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});

	it('solves the Himmelblau system', () => {
		const solutions = String(nerdamer.solveSystem(['x^2+y=7', 'x+y^2=11']));
		expect(solutions.startsWith('[{x => 2, y => 3}')).toBe(true);
	});
});
