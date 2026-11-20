import Decimal from 'decimal.js';

import * as factorModule from '../../src/algebra/factor/factor';
import nerdamer from '../../src/index';

describe('solve skips factoring for sums linear in one function', () => {
	it('solves cos(x^2)+sin(x)*sinh(x) without the factoring attempt', () => {
		const spy = jest.spyOn(factorModule, 'factorExpressionParts');
		try {
			const found = nerdamer('solve(cos(x^2)+sin(x)*sinh(x),x)')
				.text()
				.slice(1, -1)
				.split(',');
			expect(spy).not.toHaveBeenCalled();
			// Reference values from mpmath at 30 digits; the roots come in ± pairs.
			const positive = [
				'3.047176772496776586467',
				'6.283994919576355701712',
				'9.424882784401678438664',
			];
			const expected = [...positive.map(r => `-${r}`).reverse(), ...positive];
			expect(found).toHaveLength(expected.length);
			found.forEach((root, k) => {
				const exact = new Decimal(expected[k]);
				expect(
					new Decimal(root.trim()).minus(exact).abs().div(exact.abs()).lt('1e-18')
				).toBe(true);
			});
		} finally {
			spy.mockRestore();
		}
	});

	it('gives the same results as before for sums the rule skips', () => {
		const cases: [string, string][] = [
			['tan(x)-1', '{(1/4)*pi+_n*pi}'],
			['sin(x)+cos(x)', '{(-1/4)*pi+_n*pi}'],
			['2*sin(x)+3', '{asin(-3/2)+2*_n*pi, pi-asin(-3/2)+2*_n*pi}'],
			['cos(x)-x', '{0.73908513321516064165}'],
		];
		for (const [source, expected] of cases) {
			expect(nerdamer(`solve(${source},x)`).text()).toEqual(expected);
		}
	});

	it('still factors when a function occurs more than once', () => {
		const spy = jest.spyOn(factorModule, 'factorExpressionParts');
		try {
			expect(nerdamer('solve(sin(x)*cos(x)+sin(x),x)').text()).toEqual('{pi+2*_n*pi, _n*pi}');
			expect(spy).toHaveBeenCalled();
		} finally {
			spy.mockRestore();
		}
	});
});
