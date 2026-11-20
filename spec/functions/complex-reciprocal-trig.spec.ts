import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { solve } from '../../src/solve/solve';

describe('Trig quotients of complex constants', () => {
	// Reference values from mpmath at 20 digits.
	it.each([
		['tan(1+i)', '0.27175258531951171653+1.0839233273386945435*i'],
		['cot(1+i)', '0.21762156185440268137-0.86801414289592494864*i'],
		['sec(2^(1/3)+i)', '0.32008302824838635271+0.75872635356772965577*i'],
		['csc(1+i)', '0.62151801717042842123-0.30393100162842645033*i'],
		['coth(1+i)', '0.86801414289592494864-0.21762156185440268137*i'],
		['sech(1+i)', '0.49833703055518678521-0.59108384172104504805*i'],
		['csch(1+i)', '0.30393100162842645033-0.62151801717042842123*i'],
	])('keeps %s unexpanded and evaluates it', (source, value) => {
		const result = Expression.create(source);
		expect(result.text()).toBe(source);
		const residual = result.minus(Expression.create(value)).evaluate().expand();
		expect(residual.isNearlyZero()).toBe(true);
	});

	// The named function is kept only when the inner value didn't simplify, not
	// whenever the result happens to contain the inner function somewhere.
	it.each([
		['csc(acos(sin(1)))', '(1-sin(1)^2)^(-1/2)', '1.8508157176809256179'],
		['sec(asin(cos(1)))', '(1-cos(1)^2)^(-1/2)', '1.1883951057781212163'],
	])('simplifies %s when the inner value simplified', (source, form, value) => {
		const result = Expression.create(source);
		expect(result.text()).toBe(form);
		const residual = result.minus(Expression.create(value)).evaluate().expand();
		expect(residual.isNearlyZero()).toBe(true);
	});

	it('still rewrites pure imaginary arguments', () => {
		expect(Expression.create('tan(2*i)').text()).toBe('i*tanh(2)');
	});

	it('keeps the complex roots of atan(2*x+1)^3 = 1/2 compact', () => {
		const source = 'atan(2*x+1)^3-1/2';
		const roots = solve(source, 'x');
		expect(roots.count()).toBe(3);
		for (const root of roots.elements) {
			expect(root.hasFunction('cos', true)).toBe(false);
			const residual = Expression.create(source).subst('x', root).evaluate().expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});
});
