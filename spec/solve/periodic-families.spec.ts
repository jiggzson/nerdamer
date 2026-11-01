import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { solve } from '../../src/solve/solve';

describe('Periodic solution families', () => {
	it('should satisfy the source expression for sampled integer indices', () => {
		const sources = ['sin(x)', 'cos(x)', 'tan(x)', 'cot(x)', 'sin(2*x+1)'];
		const indices = [-2, -1, 0, 1, 2];

		for (const source of sources) {
			const solutions = solve(source, 'x');
			expect(solutions.solutionForm).toBe('parametric');
			expect(solutions.count()).toBeGreaterThan(0);

			for (const solution of solutions.elements) {
				for (const index of indices) {
					const value = solution.subst('_n', index);
					const residual = Expression.create(source).subst('x', value).evaluate().expand();
					expect(residual.isNearlyZero()).toBe(true);
				}
			}
		}
	});

	it.each([
		['sin(x/2)-1', 'pi', '4*pi'],
		['cos(x)+1', 'pi', '2*pi'],
		['sin(x)+1', '-pi/2', '2*pi'],
		['cos(x)-1', '0', '2*pi'],
	])('represents the complete endpoint family for %s', (source, first, period) => {
		const result = solve(source, 'x');
		expect(result.solutionForm).toBe('parametric');
		expect(result.count()).toBe(1);
		const root = result.at(0);
		expect(root).toBeDefined();
		if (!root) {
			throw new Error('Expected an indexed solution');
		}

		const atZero = root.subst('_n', 0);
		const atOne = root.subst('_n', 1);
		expect(atZero.minus(Expression.create(first)).expand().isZero()).toBe(true);
		expect(atOne.minus(atZero).minus(Expression.create(period)).expand().isZero()).toBe(true);
		for (const n of [-2, -1, 0, 1, 2]) {
			const residual = Expression.create(source)
				.subst('x', root.subst('_n', n)).evaluate().expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	it.each([
		['sin(x)-1/2', ['pi/6', '5*pi/6']],
		['cos(x)-1/2', ['pi/3', '-pi/3']],
	])('retains both independent inverse branches for %s', (source, expected) => {
		const result = solve(source, 'x');
		expect(result.solutionForm).toBe('parametric');
		expect(result.count()).toBe(2);

		const atZero = result.elements.map(root => root.subst('_n', 0));
		for (const expectedRoot of expected) {
			expect(atZero.some(root =>
				root.minus(Expression.create(expectedRoot)).expand().isZero()
			)).toBe(true);
		}
	});

	it.each([
		['sin(x)-cos(x)', 'pi/4', 'pi'],
		['cos(x)-sin(x)', 'pi/4', 'pi'],
		['sin(x)+cos(x)', '-pi/4', 'pi'],
		['2*sin(x)-cos(x)', 'atan(1/2)', 'pi'],
		['sin(2*x)-cos(2*x)', 'pi/8', 'pi/2'],
	])('keeps the integer-period family for %s', (source, first, period) => {
		const solutions = solve(source, 'x');
		expect(solutions.solutionForm).toBe('parametric');
		expect(solutions.count()).toBe(1);

		const root = solutions.at(0);
		expect(root).toBeDefined();
		if (!root) {
			throw new Error('Expected an indexed trigonometric solution');
		}

		const atZero = root.subst('_n', 0);
		const atOne = root.subst('_n', 1);
		expect(atZero.minus(Expression.create(first)).expand().isZero()).toBe(true);
		expect(atOne.minus(atZero).minus(Expression.create(period)).expand().isZero()).toBe(true);

		for (const index of [-2, -1, 0, 1, 2]) {
			const value = root.subst('_n', index);
			const residual = Expression.create(source).subst('x', value).evaluate().expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

});
