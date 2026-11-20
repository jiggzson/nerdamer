import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

/** The real and imaginary parts of an expression at the given values. */
function partsAt(source: string, values: Record<string, string>): [number, number] {
	const value = Expression.create(source).evaluate(values);
	const re = nerdamer('realpart(v)', { v: value }).evaluate().text({ decimal: true });
	const im = nerdamer('imagpart(v)', { v: value }).evaluate().text({ decimal: true });
	return [Number(re), Number(im)];
}

/** Expects source at the given values to equal a principal value from mpmath. */
function expectValue(source: string, values: Record<string, string>, [re, im]: [string, string]) {
	const [actualRe, actualIm] = partsAt(source, values);
	expect(actualRe).toBeCloseTo(Number(re), 12);
	expect(actualIm).toBeCloseTo(Number(im), 12);
}

// Principal values from mpmath 1.3 at 25 digits.
describe('Noninteger powers of a negative symbolic base', () => {
	it.each([
		['(-a)^(1/2)', ['0', '1.14017542509913798']],
		['(-a)^(-1/2)', ['0', '-0.877058019307029215']],
		['(-a)^(3/2)', ['0', '-1.48222805262887937']],
		['(-a)^(-3/2)', ['0', '0.674660014851560934']],
		['(-a)^(1/3)', ['0.545696441530552975', '0.945173962240456783']],
		['(-a)^(-1/3)', ['0.458130163537089532', '-0.79350471972607764']],
		['(-a*b)^(1/2)', ['0', '0.953939201416945649']],
		['(-a*b)^(-1/2)', ['0', '-1.0482848367219183']],
		['(-a*b)^(3/2)', ['0', '-0.868084673289420541']],
		['(-a*b)^(-3/2)', ['0', '1.15196135903507505']],
		['(-a*b)^(1/3)', ['0.484526054171675117', '0.839223743416211361']],
		['(-a*b)^(-1/3)', ['0.515968125650929726', '-0.893683008713492664']],
		['(-2*a)^(1/2)', ['0', '1.61245154965970993']],
		['(-2*a)^(-1/2)', ['0', '-0.620173672946042281']],
		['(-2*a)^(-3/2)', ['0', '0.2385283357484778']],
		['(-2*a)^(-1/3)', ['0.363618151768569597', '-0.629805113417453473']],
	] as [string, [string, string]][])('evaluates %s at a = 1.3, b = 0.7', (source, value) => {
		expectValue(source, { a: '1.3', b: '0.7' }, value);
	});

	// (-a)^p and a share no base, so their product keeps both factors.
	it.each([
		['(-a)^(1/2)*a', ['0', '8']],
		['(-a)^(1/2)*a^(1/2)', ['0', '4']],
		['(-a)^(1/2)*a^(-1)', ['0', '0.5']],
		['(-a)^(1/3)*a', ['3.17480210393639895', '5.49891854799441051']],
	] as [string, [string, string]][])('multiplies %s at a = 4', (source, value) => {
		expectValue(source, { a: '4' }, value);
	});

	it('cancels a power against its reciprocal', () => {
		expect(Expression.create('(-a)^(1/2)*(-a)^(-1/2)').text()).toBe('1');
		expect(Expression.create('(-a*b)^(1/2)*(-a*b)^(-1/2)').text()).toBe('1');
	});
});

// evaluate() once nested the power as (x^(1/2)*i)^(1/2), squaring the radical's index.
describe('Evaluating a noninteger power of a negated variable', () => {
	it('keeps sqrt(-x) whole', () => {
		expect(nerdamer('sqrt(-x)').evaluate().text()).toBe('(-x)^(1/2)');
	});

	it.each([
		['sqrt(-x)', ['2', '0'], ['0', '1.58113883008418967']],
		['sqrt(-x^2)', ['0', '4'], ['0', '2.5']],
		['sqrt(-2*x)', ['2.8284271247461901', '0'], ['0', '2.2360679774997897']],
		['(-x)^(3/2)', ['8', '0'], ['0', '-3.95284707521047416']],
		[
			'(-x)^(1/3)',
			['1.58740105196819947', '0'],
			['0.678604404148726643', '1.17537730622559877'],
		],
	] as [string, [string, string], [string, string]][])(
		'evaluates %s at x = -4 and x = 2.5',
		(source, negative, positive) => {
			const evaluated = Expression.create(source).evaluate().text();
			expectValue(evaluated, { x: '-4' }, negative);
			expectValue(evaluated, { x: '2.5' }, positive);
		}
	);
});

describe('Logarithms of complex sums with radical parts', () => {
	// log|z| + i*atan2(im, re) needs real parts; sqrt(1-x^2) is imaginary for x > 1.
	it('keeps log(i*x+sqrt(1-x^2)) whole', () => {
		const source = 'log(i*x+sqrt(1-x^2))';
		expect(Expression.create(source).hasFunction('atan2', true)).toBe(false);
		expectValue(source, { x: '2' }, ['1.31695789692481671', '1.57079632679489662']);
		expectValue(source, { x: '0.3+0.7*i' }, ['-0.67033674298778974', '0.24573200610107972']);
	});
});
