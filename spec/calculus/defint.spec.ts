import nerdamer from '../../src/index';

describe('Definite integration', () => {
	it('evaluates constant symbolic bounds numerically', () => {
		const result = Number(nerdamer('defint(sin(x),x,0,pi)').text({ decimal: true }));

		expect(result).toBeCloseTo(2, 12);
	});

	it('keeps nonconstant bounds symbolic', () => {
		const result = nerdamer.defint('sin(x)', 'x', 0, 'a');

		expect(result.isFunction('defint')).toBe(true);
	});

	it('preserves exact bounds when the integrand is independent of the integration variable', () => {
		const result = nerdamer.defint('z', 'x', 0, 'pi');

		expect(result.eq(nerdamer('pi*z'))).toBe(true);
	});
});
