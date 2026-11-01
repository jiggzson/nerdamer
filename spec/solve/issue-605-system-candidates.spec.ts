import '../helpers/registerNerdamerFunctions';
import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Expression } from '../../src/core/classes/expression/Expression';
import { solveSystem } from '../../src/solve/solveSystem';

function expectSingleFamily(equations: string[], first: string, period: string): void {
	const results = solveSystem(equations);
	expect(results.count()).toBe(1);

	const solution = results.at(0);
	expect(Dictionary.isDictionary(solution)).toBe(true);
	if (!Dictionary.isDictionary(solution)) {
		throw new Error('Expected a dictionary solution');
	}

	const x = solution.get('x');
	expect(Expression.isExpression(x)).toBe(true);
	if (!Expression.isExpression(x)) {
		throw new Error('Expected an expression-valued root');
	}

	const atZero = x.subst('_n', 0);
	const atOne = x.subst('_n', 1);
	expect(atZero.minus(Expression.create(first)).expand().isZero()).toBe(true);
	expect(atOne.minus(atZero).minus(Expression.create(period)).expand().isZero()).toBe(true);

	for (const index of [-2, -1, 0, 1, 2]) {
		const value = x.subst('_n', index);
		for (const source of equations) {
			const residual = Expression.create(source).evaluate({ x: value }).expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	}
}

describe('issue #605 verified univariate system candidates', () => {
	it.each([
		[['sin(x/2)-1', 'x-pi']],
		[['x-pi', 'sin(x/2)-1']],
	])('finds the exact common root regardless of equation order: %j', equations => {
		expect(solveSystem(equations).text()).toBe('[{x => pi}]');
	});

	it.each([
		[['sin(x/2)-1', 'cos(x)+1']],
		[['cos(x)+1', 'sin(x/2)-1']],
	])('returns the complete common family regardless of equation order: %j', equations => {
		expectSingleFamily(equations, 'pi', '4*pi');
	});

	it.each([
		[['sin(x)', 'cos(x/2)'], 'pi', '2*pi'],
		[['sin(x)', 'sin(x/2)'], '0', '2*pi'],
		[['sin(x)', 'sin(x)'], '0', 'pi'],
		[['sin(x)', 'sin(2*x)'], '0', 'pi'],
		[['sin(x)', 'sin(x+2*pi)'], '0', 'pi'],
		[['sin((x-pi)/3)', 'sin((x-2*pi)/5)'], '7*pi', '15*pi'],
		[['sin((2*x-pi)/3)', 'sin((x-pi)/2)'], '5*pi', '6*pi'],
	])('intersects exact periodic families: %j', (equations, first, period) => {
		expectSingleFamily(equations, first, period);
	});

	it('proves that incompatible periodic families have an empty intersection', () => {
		expect(solveSystem(['sin(x)', 'cos(x)']).text()).toBe('[]');
		expect(solveSystem(['cos(x)', 'sin(x)']).text()).toBe('[]');
	});

	it('retains multiple independent branches in an equivalent family intersection', () => {
		const equations = ['sin(x)-1/2', '2*sin(x)-1'];
		const results = solveSystem(equations);
		expect(results.count()).toBe(2);

		const roots = results.elements.map(solution => {
			expect(Dictionary.isDictionary(solution)).toBe(true);
			if (!Dictionary.isDictionary(solution)) {
				throw new Error('Expected a dictionary solution');
			}
			const x = solution.get('x');
			expect(Expression.isExpression(x)).toBe(true);
			if (!Expression.isExpression(x)) {
				throw new Error('Expected an expression-valued root');
			}
			return x;
		});

		for (const expected of ['pi/6', '5*pi/6']) {
			expect(roots.some(root =>
				root.subst('_n', 0).minus(Expression.create(expected)).expand().isZero()
			)).toBe(true);
		}
		for (const root of roots) {
			const atZero = root.subst('_n', 0);
			const atOne = root.subst('_n', 1);
			expect(atOne.minus(atZero).minus(Expression.create('2*pi')).expand().isZero()).toBe(true);
			for (const index of [-2, -1, 0, 1, 2]) {
				const value = root.subst('_n', index);
				for (const source of equations) {
					expect(Expression.create(source).evaluate({ x: value }).expand().isNearlyZero()).toBe(true);
				}
			}
		}
	});

	it('finds the exact root despite symbolic coefficients unsupported by the sparse adapter', () => {
		expect(solveSystem(['x-pi', 'x^2-pi^2']).text()).toBe('[{x => pi}]');
	});

	it('rejects a finite candidate that does not satisfy every equation', () => {
		expect(solveSystem(['sin(x/2)-1', 'x^2-pi^2+1']).text()).toBe('[]');
		expect(solveSystem(['sin(x)', 'x-pi/2']).text()).toBe('[]');
	});

	it('does not claim completeness for unsupported symbolic family coefficients', () => {
		expect(solveSystem(['sin(x)', 'sin(x+a)'], ['x']).text()).toBe('[]');
	});

	it.each([
		[['sin(x/(x-1))', 'cos(x)']],
		[['cos(x)', 'sin(x/(x-1))']],
		[['sin(x+1/x)', 'cos(x)']],
		[['cos(x)', 'sin(x+1/x)']],
	])('falls back without certifying an unsupported trigonometric argument: %j', equations => {
		expect(solveSystem(equations).text()).toBe('[]');
	});

	it('does not restore a candidate excluded by a denominator restriction', () => {
		expect(solveSystem([
			'sin(x)',
			'x/(x*(x-1))',
		]).text()).toBe('[]');
	});
});
