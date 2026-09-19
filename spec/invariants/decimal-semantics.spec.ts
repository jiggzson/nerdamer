import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Decimal semantics', () => {
	it('preserves decimal intent through expansion', () => {
		expect(Parser.parse('(9+x)*(x+1)*2.0-1').expand().text()).toEqual(
			'17.0+20.0*x+2.0*x^2'
		);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/640
	it('retains exact decimal arithmetic before simplification', () => {
		expect(nerdamer('0.0000001885*1000000000').text()).toEqual('188.5');
	});

	describe('decimal propagation', () => {
		it('preserves decimal coefficients through simplify()', () => {
			expect(Expression.create('2.0*x').simplify().text()).toEqual('2.0*x');
			expect(Expression.create('0.0000001885*1000000000').simplify().text()).toEqual('188.5');
		});

		it('preserves decimal intent through powers and radicals', () => {
			expect(nerdamer('sqrt(2.0)').text()).toContain('2.0');
			expect(nerdamer('2.0^(1/2)').text()).toContain('2.0');
			expect(nerdamer('sqrt(2.0)^3').text()).toContain('2.0');
		});

		it('raises decimal-origin numeric values to integer powers without factoring them', () => {
			const startedAt = Date.now();
			const value = Expression.create('1.2599210498948731648');
			const cube = value.pow(3);
			const reciprocalSquare = Expression.create('1.25').pow(-2);
			const elapsed = Date.now() - startedAt;

			expect(cube.text()).toEqual('2.0000000000000000002');
			expect(reciprocalSquare.text()).toEqual('0.64');
			expect(elapsed).toBeLessThan(5_000);
		});

		it('preserves decimal numeric content through GCD', () => {
			expect(nerdamer('gcd(6.0*x^2,4*x)').text()).toContain('2.0');
		});

		it('preserves decimal intent in solved roots', () => {
			expect(nerdamer.solve('2.0*x-4', 'x').text()).toEqual('{2.0}');
			expect(nerdamer.solve('x-1.4', 'x').text()).toEqual('{1.4}');
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/682
		it('preserves decimal intent for polynomial roots', () => {
			const text = nerdamer
				.solve('z^4+1.4*z^3+0.71*z^2+0.154*z+0.012', 'z')
				.text();
			expect(text).toEqual('{-0.3, -0.2, -0.4, -0.5}');
		});

		it('preserves decimal intent through limits', () => {
			expect(
				nerdamer.limit('(2.0*x^2-2*x-2)/(x^2+4*x+3)', 'x', 'Infinity').text()
			).toEqual('2.0');
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/404
		it('does not hide exact low-order decimal terms in text output', () => {
			expect(nerdamer('0.0000000000000000001+0.2').text()).toEqual(
				'0.2000000000000000001'
			);
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/404
		it('honors configured arbitrary precision during numerical evaluation', () => {
			const previousPrecision = Parser.getPrecision();
			Parser.setPrecision(50);
			try {
				const value = Parser.evaluate('sqrt(2)').text({ decimal: true, precision: 50 });
				expect(value.length).toBeGreaterThan(40);
			} finally {
				Parser.setPrecision(previousPrecision);
			}
		});

		// Regression: https://github.com/jiggzson/nerdamer/issues/394
		it('routes the public PRECISION setting to arbitrary-precision constants', () => {
			const previousPrecision = Parser.getPrecision();
			nerdamer.set('PRECISION', 40);
			try {
				expect(Parser.getPrecision()).toBe(40);
				expect(nerdamer('pi').evaluate().text({ decimal: true, precision: 40 })).toEqual(
					'3.141592653589793238462643383279502884197'
				);
				expect(nerdamer('e').evaluate().text({ decimal: true, precision: 40 })).toEqual(
					'2.718281828459045235360287471352662497757'
				);

				nerdamer.set({ PRECISION: 35 });
				expect(Parser.getPrecision()).toBe(35);
			} finally {
				nerdamer.set('PRECISION', previousPrecision);
			}
		});

		// Regression: https://github.com/together-science/nerdamer-prime/issues/142
		it('honors requested significant-digit precision for decimal text', () => {
			expect(nerdamer('20/21').text({ decimal: true, precision: 1 })).toEqual('1.0');
		});
	});
});
