import '../../helpers/registerNerdamerFunctions';
import { diff } from '../../../src/calculus/derivative/diff';
import { integrate } from '../../../src/calculus/integrate/integrate';
import { assume, clearAssumptions } from '../../../src/core/classes/assumption/assume';
import { Expression } from '../../../src/core/classes/expression/Expression';
import nerdamer from '../../../src/index';

/** The value of an expression at x. */
function valueAt(x: Expression, at: number): number {
	return Number(x.evaluate({ x: at }).text({ decimal: true }));
}

/** The size of a possibly complex expression at the given values. */
function sizeAt(x: Expression, values: Record<string, string>): number {
	const value = x.evaluate(values);
	const re = nerdamer('realpart(v)', { v: value }).evaluate().text({ decimal: true });
	const im = nerdamer('imagpart(v)', { v: value }).evaluate().text({ decimal: true });
	return Math.hypot(Number(re), Number(im));
}

/** Expects the derivative of result to equal source at each set of values. */
function expectAntiderivative(
	result: Expression,
	source: Expression,
	samples: Record<string, string>[]
) {
	expect(result.hasFunction('integrate', true)).toBe(false);
	const residual = diff(result, 'x').minus(source);
	for (const values of samples) {
		expect(sizeAt(residual, values)).toBeLessThan(1e-9);
	}
}

// Values of a, b and x of every sign, including a complex x.
const SIGNED = [
	{ a: '1', b: '1', x: '2' },
	{ a: '1', b: '-1', x: '2' },
	{ a: '1', b: '-1', x: '0.5' },
	{ a: '-1', b: '-1', x: '2' },
	{ a: '2', b: '-3', x: '1.5' },
	{ a: '-2', b: '5', x: '0.3' },
	{ a: '3', b: '2', x: '0.4+0.9*i' },
	{ a: '-1', b: '2', x: '1.7' },
];

// The points have Q > 0. Where Q has two real roots they cover both outer intervals, and
// the first two share an interval, since the constant may differ from one to the other.
describe('Integrals of 1/sqrt(Q) for a quadratic Q', () => {
	it.each([
		['x^2-1', [1.6, 2.9, -2.9], 'log(x+sqrt(x^2-1))'],
		['4*x^2-9', [1.6, 2.9, -2.9], 'log(2*x+sqrt(4*x^2-9))/2'],
		['x^2+2*x+5', [-3.7, 0.3, 2.9], 'asinh(x/2+1/2)'],
		['x^2+2*x-3', [1.6, 2.9, -3.7], 'log(2*x+2*sqrt(x^2+2*x-3)+2)'],
		['3+2*x-x^2', [0.3, 2.9], 'asin(x/2-1/2)'],
		['2*x-x^2', [0.3, 1.6], 'asin(x-1)'],
		['x^2-2*x', [2.9, 3.7, -1.3], 'log(2*x+2*sqrt(x*(x-2))-2)'],
		['x^2+x', [0.3, 1.6, -1.3], 'log(2*x+2*sqrt(x*(x+1))+1)'],
		['2*x^2+3*x+1', [0.3, 1.6, -1.3], 'sqrt(2)*log(4*x+2*sqrt(2)*sqrt(2*x^2+3*x+1)+3)/2'],
	] as [string, number[], string][])('integrates 1/sqrt(%s)', (quadratic, points, sympy) => {
		const source = Expression.create(`(${quadratic})^(-1/2)`);
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const derivative = diff(result, 'x');
		for (const x of points) {
			expect(valueAt(derivative, x)).toBeCloseTo(valueAt(source, x), 9);
		}
		// The antiderivative from SymPy 1.14, which may differ by a constant.
		const difference = result.minus(Expression.create(sympy));
		expect(valueAt(difference, points[0])).toBeCloseTo(valueAt(difference, points[1]), 9);
	});
});

// asinh and asin need sqrt(k)*sqrt(1+a*u^2/k) = sqrt(Q), which holds for k > 0 only.
// Without that sign the log form holds for every a and b.
describe('Integrals of sqrt(Q)^±1 with coefficients of unknown sign', () => {
	afterEach(() => clearAssumptions());

	it.each(['1/sqrt(a*x^2+b)', '1/sqrt(b-a*x^2)', 'sqrt(a*x^2+b)', '1/sqrt(a*x^2+x+b)'])(
		'integrates %s for every sign of a and b',
		source => {
			const result = integrate(source, 'x');
			expect(result.hasFunction('asinh', true) || result.hasFunction('asin', true)).toBe(
				false
			);
			expectAntiderivative(result, Expression.create(source), SIGNED);
		}
	);

	it.each([
		['1/sqrt(a*x^2+b)', 'asinh'],
		['1/sqrt(b-a*x^2)', 'asin'],
	])('keeps the inverse function in %s once b > 0 is assumed', (source, name) => {
		assume('b>0');
		const result = integrate(source, 'x');
		expect(result.hasFunction(name, true)).toBe(true);
		const positive = SIGNED.filter(values => Number(values.b) > 0);
		expectAntiderivative(result, Expression.create(source), positive);
	});

	it.each(['(-x^2-1)^(-1/2)', '(-x^2-1)^(1/2)', '(-x^2-2*x-5)^(-1/2)', '(1-x^2)^(-1/2)'])(
		'integrates %s at real and complex points',
		source => {
			// x = 2*i is left out: there i*x+sqrt(-1-x^2) is a negative real, on the cut of log.
			const points = ['2', '0.5', '0.3+0.7*i', '-1.2+0.4*i', '1-2*i'];
			const samples = points.map(x => ({ x }));
			expectAntiderivative(integrate(source, 'x'), Expression.create(source), samples);
		}
	);
});

// These were integration table entries; tryIntegrateSqrtQuadratic now covers them, with the
// same residual check at the same points.
describe('Square roots of a quadratic formerly in the integration table', () => {
	it.each([
		['sqrt(2-2*x^2)', [0.1, 0.2, 0.4]],
		['-1/sqrt(2-2*x^2)', [0.1, 0.2, 0.4]],
		['1/sqrt(2-2*x^2)', [0.1, 0.2, 0.4]],
		['1/sqrt(2+2*x^2)', [0.1, 0.2, 0.35]],
	] as [string, number[]][])('integrates %s', (input, samples) => {
		const source = Expression.create(input);
		const result = integrate(source, 'x');
		expect(result.hasFunction('integrate', true)).toBe(false);
		const residual = diff(result, 'x').minus(source);
		for (const x of samples) {
			const value = Number(residual.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(value)).toBe(true);
			expect(value).toBeCloseTo(0, 8);
		}
	});
});
