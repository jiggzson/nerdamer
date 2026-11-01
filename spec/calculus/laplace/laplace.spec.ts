import '../../helpers/registerNerdamerFunctions';
import { assume, clearAssumptions } from '../../../src/core/classes/assumption/assume';
import { diff } from '../../../src/calculus/derivative/diff';
import { laplace } from '../../../src/calculus/laplace/laplace';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { DIFF } from '../../../src/core/classes/parser/constants';
import { UnexpectedInputError } from '../../../src/core/errors';

const text = (expr: string | number) => Expression.create(expr).text();

// Construct an explicitly unevaluated derivative; Parser.parse normally executes diff.
function deferredDerivative(source: string | Expression, variable: string, order?: Expression): Expression {
	return Expression.toFunction(DIFF, [Expression.create(source), Expression.Variable(variable), order]);
}

describe('laplace', () => {
	describe('strict transform variables', () => {
		it('accepts plain time and frequency variables', () => {
			expect(laplace('sin(t)', 't', 's').text()).toEqual(text('(1+s^2)^-1'));
		});

		it('rejects decorated time and frequency variables', () => {
			for (const variable of ['2*t', 't^2', 't^-1']) {
				expect(() => laplace('sin(t)', variable, 's')).toThrow(UnexpectedInputError);
			}
			for (const variable of ['3*s', 's^2', 's^-1']) {
				expect(() => laplace('sin(t)', 't', variable)).toThrow(UnexpectedInputError);
			}
		});
	});

	describe('base table cases', () => {
		it('transforms constants', () => {
			expect(laplace('1', 't', 's').text()).toEqual(text('1/s'));
			expect(laplace('5*a', 't', 's').text()).toEqual(text('5*a/s'));
		});

		it('transforms powers of t', () => {
			expect(laplace('t', 't', 's').text()).toEqual(text('s^-2'));
			expect(laplace('t^2', 't', 's').text()).toEqual(text('2*s^-3'));
		});

		it('transforms exponentials', () => {
			expect(laplace('e^t', 't', 's').text()).toEqual(text('(-1+s)^-1'));
			expect(laplace('a^t', 't', 's').text()).toEqual(text('(s-log(a))^-1'));
			expect(laplace('3*b^t', 't', 's').text()).toEqual(text('3/(s-log(b))'));
		});

		it('transforms sine and cosine', () => {
			expect(laplace('sin(t)', 't', 's').text()).toEqual(text('(1+s^2)^-1'));
			expect(laplace('cos(t)', 't', 's').text()).toEqual(text('s/(1+s^2)'));
			expect(laplace('sin(3*t)', 't', 's').text()).toEqual(text('3/(s^2+9)'));
			expect(laplace('cos(3*t)', 't', 's').text()).toEqual(text('s/(s^2+9)'));
		});
	});

	describe('product table cases', () => {
		it('transforms t^n times exponentials', () => {
			expect(laplace('t*e^t', 't', 's').text()).toEqual(text('(-1+s)^-2'));
			expect(laplace('t^2*e^t', 't', 's').text()).toEqual(text('2*(-1+s)^-3'));
		});

		it('transforms negative exponential factors by shifting the transform variable', () => {
			expect(laplace('e^(-t)', 't', 's').text()).toEqual(text('(s+1)^-1'));
			expect(laplace('e^(-3*t)', 't', 's').text()).toEqual(text('(s+3)^-1'));
			expect(laplace('2^(-t)', 't', 's').text()).toEqual(text('(s+log(2))^-1'));
			expect(laplace('t*e^(-t)', 't', 's').text()).toEqual(text('(s+1)^-2'));
			expect(laplace('e^(-t)*sin(t)', 't', 's').text()).toEqual(
				text('(1+(s+1)^2)^-1')
			);
			expect(laplace('e^(-3*t)*sin(4*t)', 't', 's').text()).toEqual(
				text('4/((s+3)^2+16)')
			);
			expect(laplace('e^(-t)', 't', 'j').text()).toEqual(text('(j+1)^-1'));
		});

		it('transforms t^n times sine and cosine', () => {
			expect(laplace('t*sin(t)', 't', 's').text()).toEqual(text('2*s*((1+s^2)^-2)'));
			expect(laplace('t*cos(t)', 't', 's').text()).toEqual(
				text('-(-2*s^2*((1+s^2)^-2)+(1+s^2)^-1)')
			);
		});

		it('transforms exponentials times sine and cosine', () => {
			expect(laplace('e^t*sin(t)', 't', 's').text()).toEqual(text('(1+(-1+s)^2)^-1'));
			expect(laplace('e^t*cos(t)', 't', 's').text()).toEqual(
				text('(-1+s)*((1+(-1+s)^2)^-1)')
			);
		});

		it('transforms sin(t)*cos(t)', () => {
			expect(laplace('sin(t)*cos(t)', 't', 's').text()).toEqual(text('(s^2+4)^-1'));
		});
	});

	describe('general exponential frequency shifts', () => {
		it('shifts a mixed trigonometric product by a positive exponential rate', () => {
			const expected = laplace('sin(t)*cos(t)', 't', 's').subst('s', 's-2');

			expect(laplace('e^(2*t)*sin(t)*cos(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('preserves the existing negative-rate frequency shift for mixed products', () => {
			const expected = laplace('sin(t)*cos(t)', 't', 's').subst('s', 's+2');

			expect(laplace('e^(-2*t)*sin(t)*cos(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('shifts by the logarithm for non-e exponential bases', () => {
			const expected = laplace('sin(t)*cos(t)', 't', 's').subst('s', 's-log(2)');

			expect(laplace('2^t*sin(t)*cos(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('handles a symbolic exponential rate without assuming its sign', () => {
			const expected = laplace('sin(t)*cos(t)', 't', 's').subst('s', 's-a');

			expect(laplace('e^(a*t)*sin(t)*cos(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('respects a nondefault transform variable in the frequency shift', () => {
			const expected = laplace('sin(t)*cos(t)', 't', 'u').subst('u', 'u-2');

			expect(laplace('e^(2*t)*sin(t)*cos(t)', 't', 'u').text()).toEqual(expected.text());
		});

		it('combines a frequency shift with time multiplication', () => {
			const expected = laplace('t*sin(t)*cos(t)', 't', 's').subst('s', 's-2');

			expect(laplace('t*e^(2*t)*sin(t)*cos(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('leaves nonlinear rates, unresolved bases and frequency-dependent inputs unevaluated', () => {
			expect(laplace('e^(t^2)*sin(t)*cos(t)', 't', 's').isFunction('laplace')).toBe(true);
			expect(laplace('e^(2*t)*log(t)', 't', 's').isFunction('laplace')).toBe(true);
			expect(laplace('e^(s*t)*sin(t)*cos(t)', 't', 's').isFunction('laplace')).toBe(true);
		});
	});

	describe('derivative initial values', () => {
		it('transforms a first derivative with a zero initial value', () => {
			const derivative = deferredDerivative('sin(t)', 't');
			const expected = Expression.create('s').times(laplace('sin(t)', 't', 's'));

			expect(derivative.isFunction(DIFF)).toBe(true);
			expect(laplace(derivative, 't', 's').text()).toEqual(expected.text());
		});

		it('subtracts nonzero initial values for first derivatives', () => {
			const derivative = deferredDerivative('cos(t)', 't');
			const expected = Expression.create('s')
				.times(laplace('cos(t)', 't', 's'))
				.minus(Expression.create(1));

			expect(laplace(derivative, 't', 's').text()).toEqual(expected.text());
		});

		it('uses successive right-hand values for second derivatives', () => {
			const derivative = deferredDerivative('sin(t)', 't', Expression.Number(2));
			const expected = Expression.create('s^2')
				.times(laplace('sin(t)', 't', 's'))
				.minus(Expression.create(1));

			expect(laplace(derivative, 't', 's').text()).toEqual(expected.text());
		});

		it('handles higher derivatives and alternating initial signs', () => {
			const derivative = deferredDerivative('e^(-t)', 't', Expression.Number(3));
			const expected = Expression.create('s^3')
				.times(laplace('e^(-t)', 't', 's'))
				.minus(Expression.create('s^2'))
				.plus(Expression.create('s'))
				// The regular right-hand limit of e^(-t) returns a decimal-form 1.0.
				.minus(Expression.create('1.0'));

			expect(laplace(derivative, 't', 's').text()).toEqual(expected.text());
		});

		it('respects a nondefault transform variable', () => {
			const derivative = deferredDerivative('cos(t)', 't');
			const expected = Expression.create('u')
				.times(laplace('cos(t)', 't', 'u'))
				.minus(Expression.create(1));

			expect(laplace(derivative, 't', 'u').text()).toEqual(expected.text());
		});

		it('preserves unresolved transforms with unknown initial values', () => {
			const unresolved = Expression.toFunction('f', [Expression.Variable('t')]);
			const derivative = deferredDerivative(unresolved, 't');

			expect(laplace(derivative, 't', 's').isFunction('laplace')).toBe(true);
		});

		it('preserves singular or unresolved right-hand initial values', () => {
			const derivative = deferredDerivative('t^(-1/2)', 't');

			expect(laplace(derivative, 't', 's').isFunction('laplace')).toBe(true);
		});

		it('rejects mismatched variables and unsupported derivative orders', () => {
			for (const derivative of [
				deferredDerivative('sin(t)', 'x'),
				deferredDerivative('sin(t)', 't', Expression.Number(0)),
				deferredDerivative('sin(t)', 't', Expression.Number(9)),
				deferredDerivative('sin(t)', 't', Expression.create('1/2')),
			]) {
				expect(laplace(derivative, 't', 's').isFunction('laplace')).toBe(true);
			}
		});
	});

	describe('Heaviside time delays', () => {
		afterEach(() => {
			clearAssumptions();
		});

		it('transforms a delayed unit step', () => {
			expect(laplace('heaviside(t-2)', 't', 's').text())
				.toEqual(text('e^(-2*s)/s'));
		});

		it('transforms a shifted trigonometric function', () => {
			expect(laplace('heaviside(t-3)*sin(t-3)', 't', 's').text())
				.toEqual(text('e^(-3*s)/(s^2+1)'));
		});

		it('handles a shifted polynomial with the unilateral step', () => {
			const actual = laplace('heaviside(t-2)*(t-2)', 't', 's');
			const expected = Expression.create('e^(-2*s)/s^2');

			expect(actual.hasFunction('laplace', true)).toBe(false);
			expect(actual.eq(expected)).toBe(true);
		});

		it('preserves powers of shifted polynomials before expansion', () => {
			const actual = laplace('heaviside(t-2)*(t-2)^2', 't', 's');
			const expected = Expression.create('2*e^(-2*s)/s^3');

			expect(actual.hasFunction('laplace', true)).toBe(false);
			expect(actual.eq(expected)).toBe(true);
		});

		it('preserves numeric coefficients stored on delayed factors', () => {
			const step = laplace('-2*heaviside(t-2)', 't', 's');
			const shifted = laplace('3*heaviside(t-2)*(t-2)', 't', 's');

			expect(step.hasFunction('laplace', true)).toBe(false);
			expect(step.eq('-2*e^(-2*s)/s')).toBe(true);
			expect(shifted.hasFunction('laplace', true)).toBe(false);
			expect(shifted.eq('3*e^(-2*s)/s^2')).toBe(true);
		});

		it('respects different time and frequency variables', () => {
			const actual = laplace('heaviside(x-2)*cos(x-2)', 'x', 'u');
			const expected = Expression.create('u*e^(-2*u)/(u^2+1)');

			expect(actual.hasFunction('laplace', true)).toBe(false);
			expect(actual.eq(expected)).toBe(true);
		});

		it('allows a symbolic delay when positive under assumptions', () => {
			assume('a>0');
			expect(laplace('heaviside(t-a)*sin(t-a)', 't', 's').text())
				.toEqual(text('e^(-a*s)/(s^2+1)'));
		});

		it('does not guess the sign of a delay', () => {
			expect(laplace('heaviside(t-a)*sin(t-a)', 't', 's').isFunction('laplace')).toBe(true);
			expect(laplace('heaviside(t+2)*sin(t+2)', 't', 's').isFunction('laplace')).toBe(true);
		});

		it('keeps mismatched, nonlinear, unknown and frequency-dependent cases unevaluated', () => {
			for (const source of [
				'heaviside(2*t-4)*sin(t-2)',
				'heaviside(t-2)*log(t-2)',
				'heaviside((t-2)^2)*sin(t-2)',
				'heaviside(t-s)*sin(t-s)',
			]) {
				expect(laplace(source, 't', 's').isFunction('laplace')).toBe(true);
			}
		});
	});

	describe('general time multiplication', () => {
		it('differentiates transforms of mixed trigonometric products', () => {
			const base = laplace('sin(t)*cos(t)', 't', 's');
			const expected = diff(diff(base, 's'), 's');

			expect(laplace('t^2*sin(t)*cos(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('applies the alternating sign for odd powers', () => {
			const base = laplace('sin(t)*cos(t)', 't', 's');
			const expected = diff(base, 's').neg();

			expect(laplace('t*sin(t)*cos(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('works with a nondefault transform variable', () => {
			const base = laplace('sin(t)*cos(t)', 't', 'u');
			const expected = diff(diff(base, 'u'), 'u');

			expect(laplace('t^2*sin(t)*cos(t)', 't', 'u').text()).toEqual(expected.text());
		});

		it('applies the rule to exponential-hyperbolic products without a matching table entry', () => {
			const base = laplace('e^t*cosh(t)', 't', 's');
			const expected = diff(diff(base, 's'), 's');

			expect(laplace('t^2*e^t*cosh(t)', 't', 's').text()).toEqual(expected.text());
		});

		it('keeps unresolved base transforms and oversized orders unevaluated', () => {
			expect(laplace('t^2*log(t)', 't', 's').isFunction('laplace')).toBe(true);
			expect(laplace('t^9*sin(t)*cos(t)', 't', 's').isFunction('laplace')).toBe(true);
		});
	});

	describe('dispatcher behavior', () => {
		it('supports linear sums', () => {
			expect(laplace('t+e^t', 't', 's').text()).toEqual(text('s^-2+(-1+s)^-1'));
			expect(laplace('t^2+e^t+sin(t)', 't', 's').text()).toEqual(
				text('2*s^-3+(-1+s)^-1+(1+s^2)^-1')
			);
		});

		it('extracts symbolic constants from products and recurses', () => {
			expect(laplace('3*a*(t+e^t)', 't', 's').text()).toEqual(
				text('3*a*((-1+s)^-1)+3*a*s^-2')
			);
			expect(laplace('2*b*e^t*cos(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((1+(-1+s)^2)^-1)*b')
			);
		});

		it('substitutes the transform variable when it is not s', () => {
			expect(laplace('e^t', 't', 'j').text()).toEqual(text('(-1+j)^-1'));
			expect(laplace('t+e^t', 't', 'j').text()).toEqual(text('j^-2+(-1+j)^-1'));
		});

		it('handles t*e^t*sin(t)', () => {
			expect(laplace('t*e^t*sin(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((1+(-1+s)^2)^-2)')
			);
		});

		it('handles t*e^t*cos(t)', () => {
			expect(laplace('t*e^t*cos(t)', 't', 's').text()).toEqual(
				text('(-1+(-1+s)^2)*((1+(-1+s)^2)^-2)')
			);
		});

		it('expands products before lookup', () => {
			expect(laplace('e^t*(sin(t)-t*cos(t))', 't', 's').text()).toEqual(
				laplace('(sin(t)-t*cos(t))*e^t', 't', 's').text()
			);
		});
		it('handles e^t*sinh(t)', () => {
			expect(laplace('e^t*sinh(t)', 't', 's').text()).toEqual(text('(-1+(-1+s)^2)^-1'));
		});

		it('handles e^t*cosh(t)', () => {
			expect(laplace('e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(-1+s)*((-1+(-1+s)^2)^-1)')
			);
		});

		it('handles t*e^t*sinh(t)', () => {
			expect(laplace('t*e^t*sinh(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((-1+(-1+s)^2)^-2)')
			);
		});

		it('handles t*e^t*cosh(t)', () => {
			expect(laplace('t*e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(1+(-1+s)^2)*((-1+(-1+s)^2)^-2)')
			);
		});

		it('handles e^t*sinh(t)', () => {
			expect(laplace('e^t*sinh(t)', 't', 's').text()).toEqual(text('(-1+(-1+s)^2)^-1'));
		});

		it('handles e^t*cosh(t)', () => {
			expect(laplace('e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(-1+s)*((-1+(-1+s)^2)^-1)')
			);
		});

		it('handles t*e^t*sinh(t)', () => {
			expect(laplace('t*e^t*sinh(t)', 't', 's').text()).toEqual(
				text('2*(-1+s)*((-1+(-1+s)^2)^-2)')
			);
		});

		it('handles t*e^t*cosh(t)', () => {
			expect(laplace('t*e^t*cosh(t)', 't', 's').text()).toEqual(
				text('(1+(-1+s)^2)*((-1+(-1+s)^2)^-2)')
			);
		});
	});
});
