import { Expression } from '../../src/core/classes/expression/Expression';
import { UnsupportedOperationError } from '../../src/core/errors';
import nerdamer from '../../src/index';

describe('LaTeX subscripts', () => {
	it.each([
		['v0+v_1', 'v0+v_{1}'],
		['x_12', 'x_{12}'],
		['x_ab', 'x_{ab}'],
		['x_1^2', 'x_{1}^{2}'],
		['x_1*y_2', 'x_{1} \\cdot y_{2}'],
		['a_b_c', 'a_{b_{c}}'],
		['alpha_1', '\\alpha_{1}'],
		['x_alpha', 'x_{\\alpha}'],
		['alpha_beta', '\\alpha_{\\beta}'],
	])('braces the subscripts of %s once', (source, expected) => {
		expect(nerdamer.convertToLaTeX(source)).toBe(expected);
		expect(Expression.create(source).toTeX()).toBe(expected);
	});

	it('keeps plain text unchanged', () => {
		expect(nerdamer('a_b_c').text()).toBe('a_b_c');
	});

	it.each([
		['v_{1}', 'v_1'],
		['x_{12}+y_{2}', 'x_12+y_2'],
		['x_{1}^{2}', 'x_1^2'],
		['a_{b_{c}}', 'a_b_c'],
		['\\alpha_{1}', 'alpha_1'],
		['x_{\\alpha}', 'x_alpha'],
		['x_{1} \\cdot y_{2}', 'x_1*y_2'],
	])('reads the subscripts of %s back', (tex, expected) => {
		expect(nerdamer.convertFromLaTeX(tex).text()).toBe(expected);
	});

	it.each([
		['v_1'],
		['x_12+y_2'],
		['a_b_c'],
		['alpha_1'],
		['x_alpha'],
		['x_1^2'],
		['alpha_beta'],
	])('round-trips %s through LaTeX', source => {
		const tex = nerdamer.convertToLaTeX(source);
		expect(nerdamer.convertFromLaTeX(tex).text()).toBe(nerdamer(source).text());
	});
});

describe('LaTeX subscripts with text and formulas', () => {
	it.each([
		['x_{min}', 'x_min'],
		['x_{\\mathrm{min}}', 'x_min'],
		['x_{\\text{max}}', 'x_max'],
		['T_{\\max}', 'T_max'],
		['x_{i j}', 'x_ij'],
		['x_{2x}', 'x_2x'],
	])('reads %s as the single variable %s', (tex, expected) => {
		expect(nerdamer.convertFromLaTeX(tex).text()).toBe(expected);
	});

	// How a formula subscript should map is open.
	it.each([['x_{n-1}'], ['x_{x+1}'], ['x_{min,1}']])('rejects the formula subscript %s', tex => {
		expect(() => nerdamer.convertFromLaTeX(tex)).toThrow(UnsupportedOperationError);
	});
});

describe('LaTeX definite integrals', () => {
	it.each([
		['defint(x,x,0,1)', '\\int_{0}^{1} x\\, dx'],
		['defint(sin(t),t,0,pi)', '\\int_{0}^{\\pi} \\sin\\left(t\\right)\\, dt'],
	])('writes %s with its limits and variable in place', (source, expected) => {
		expect(nerdamer.convertToLaTeX(source)).toBe(expected);
	});

	it.each([
		['\\int_{0}^{1} x\\, dx', '0.5'],
		['\\int_{1}^{3} x^2\\, dx', '8.6666666666666666667'],
	])('reads %s', (tex, expected) => {
		expect(nerdamer.convertFromLaTeX(tex).text()).toBe(expected);
	});
});
