import '../helpers/registerNerdamerFunctions';
import { simplify } from '../../src/algebra/simplify/simplify';
import { diff } from '../../src/calculus/derivative/diff';
import { integrate } from '../../src/calculus/integrate/integrate';
import { Expression } from '../../src/core/classes/expression/Expression';
import { getU } from '../../src/core/functions/subst';

/** The value of an expression at the variable v. */
function valueAt(x: Expression, v: string, at: number): number {
	return Number(x.evaluate({ [v]: at }).text({ decimal: true }));
}

// Generated substitution names are uN, so a variable with such a name must survive them.
describe('Variables named like generated substitution symbols', () => {
	it('picks a name that no value in the map uses', () => {
		expect(getU('u1', { u1: Expression.create('u0^(1/2)') })).toBe('u2');
	});

	it.each(['u0', 'u1', 'u2', 'x'])('simplifies a radical of %s without renaming it', v => {
		const source = Expression.create(`2*e^(-1+${v})*${v}^(1/2)`);
		const result = simplify(source);
		expect(result.hasVariable(v)).toBe(true);
		for (const at of [0.4, 1.7]) {
			expect(valueAt(result, v, at)).toBeCloseTo(valueAt(source, v, at), 12);
		}
	});

	it.each(['u0', 'u1'])('gives no wrong integral of %s^(1/2)*e^(%s-1)', v => {
		// The integral needs erf, so it stays unevaluated; any result must be an antiderivative.
		const source = Expression.create(`${v}^(1/2)*e^(-1+${v})`);
		const result = integrate(source, v);
		if (!result.hasFunction('integrate', true)) {
			const derivative = diff(result, v);
			expect(valueAt(derivative, v, 0.9)).toBeCloseTo(valueAt(source, v, 0.9), 9);
		}
	});
});
