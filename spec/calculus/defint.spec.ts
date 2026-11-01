import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

describe('Definite integration', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/650
	it('integrates real and complex functions without compiling JavaScript', () => {
		const compiler = jest.spyOn(Expression.prototype, 'buildFunction').mockImplementation(() => {
			throw new Error('Dynamic function construction is blocked');
		});
		try {
			const real = nerdamer.defint('sin(x)', 'x', 0, 'pi');
			const complex = nerdamer.defint('exp(i*x)', 'x', 0, 'pi');
			expect(Number(real.text({ decimal: true }))).toBeCloseTo(2, 10);
			expect(complex.realPart().evaluate().isNearlyZero()).toBe(true);
			expect(complex.imagPart().evaluate().minus(2).isNearlyZero()).toBe(true);
			expect(compiler).not.toHaveBeenCalled();
		} finally {
			compiler.mockRestore();
		}
	});

	// The native evaluator consumes the same tokenization and operator precedence as Parser.
	it('uses shared syntax for negative powers, grouping, and nested functions', () => {
		const power = nerdamer.defint('x^-2', 'x', 1, 2);
		const grouped = nerdamer.defint('(x+1)^2', 'x', 0, 1);
		const nested = nerdamer.defint('sin(cos(x))', 'x', 0, 1);

		expect(Number(power.text({ decimal: true }))).toBeCloseTo(0.5, 9);
		expect(Number(grouped.text({ decimal: true }))).toBeCloseTo(7 / 3, 9);
		expect(Number(nested.text({ decimal: true }))).toBeCloseTo(0.7386429980368902, 5);
	});

	it('evaluates constant symbolic bounds numerically', () => {
		const result = Number(nerdamer('defint(sin(x),x,0,pi)').text({ decimal: true }));

		expect(result).toBeCloseTo(2, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/642
	it('integrates log10(x) with an integrable singularity at zero', () => {
		const result = nerdamer('defint(log10(x),x,0,1)');
		const value = Number(result.text({ decimal: true }));
		expect(Number.isFinite(value)).toBe(true);
		expect(value).toBeCloseTo(-1 / Math.log(10), 6);
	});

	it('keeps nonconstant bounds symbolic', () => {
		const result = nerdamer.defint('sin(x)', 'x', 0, 'a');

		expect(result.isFunction('defint')).toBe(true);
	});

	it('preserves exact bounds when the integrand is independent of the integration variable', () => {
		const result = nerdamer.defint('z', 'x', 0, 'pi');

		expect(result.eq(nerdamer('pi*z'))).toBe(true);
	});

	it('integrates complex-valued functions over real numeric bounds component-wise', () => {
		const linear = nerdamer('defint(i*x,x,0,1)') as Expression;
		const gaussian = nerdamer('defint((1+i)*x,x,0,1)') as Expression;
		const euler = nerdamer('defint(exp(i*x),x,0,pi)') as Expression;

		expect(linear.realPart().evaluate().isNearlyZero()).toBe(true);
		expect(linear.imagPart().evaluate().minus('1/2').isNearlyZero()).toBe(true);
		expect(gaussian.realPart().evaluate().minus('1/2').isNearlyZero()).toBe(true);
		expect(gaussian.imagPart().evaluate().minus('1/2').isNearlyZero()).toBe(true);
		expect(euler.realPart().evaluate().isNearlyZero()).toBe(true);
		expect(euler.imagPart().evaluate().minus(2).isNearlyZero()).toBe(true);
	});
});
