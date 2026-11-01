import Decimal from 'decimal.js';

import '../../src/index';
import { message } from '../../src/core/errors';
import { Expression } from '../../src/core/classes/expression/Expression';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';

describe('FunctionSolver brackets and scan coverage', () => {
	it.each([[2, 5], [5, 2]])('accepts an endpoint root for either bracket orientation: %s, %s', (a, b) => {
		const solver = new FunctionSolver('x-2', 'x');
		const result = solver.Brent(new Decimal(a), new Decimal(b));
		expect(result.converged).toBe(true);
		expect(result.iterations).toBe(0);
		expect(result.root.equals(2)).toBe(true);
		expect(result.error.isZero()).toBe(true);
	});

	it.each([[0, 1], [1, 0]])('reports the residual of an endpoint accepted within tolerance: %s, %s', (a, b) => {
		const solver = new FunctionSolver('x-1e-16', 'x');
		const result = solver.Brent(new Decimal(a), new Decimal(b));
		expect(result.converged).toBe(true);
		expect(result.iterations).toBe(0);
		expect(result.root.isZero()).toBe(true);
		expect(result.error.equals('1e-16')).toBe(true);
	});

	it('reports same-sign endpoints as failure with a candidate coordinate', () => {
		const solver = new FunctionSolver('x^2+1', 'x');
		const result = solver.Brent(new Decimal(10), new Decimal(11));
		expect(result.converged).toBe(false);
		expect(result.iterations).toBe(0);
		expect(result.root.equals(11)).toBe(true);
		expect(result.error.isFinite()).toBe(false);
		expect(result.errorMsg).toBe(message('differentSignsAtEndPointsRequired'));
	});

	it('retains an actual endpoint candidate when the refinement budget is exhausted', () => {
		const solver = new FunctionSolver('cos(x)-x', 'x', { maxIterations: 0 });
		const result = solver.Brent(new Decimal(0), new Decimal(1));
		expect(result.converged).toBe(false);
		expect(result.root.equals(1)).toBe(true);
		expect(result.error.isFinite()).toBe(false);
	});

	it.each(['Brent', 'NewtonRaphson'] as const)('finds a root inside the last partial cell using %s', method => {
		const solver = new FunctionSolver('x-0.2375', 'x', {
			lowerBound: 0, upperBound: 0.25, stepSize: 0.1, method,
		});
		const roots = solver.roots();
		expect(roots).toHaveLength(1);
		for (const root of roots) {
			expect(root.minus('0.2375').abs().getMultiplier().toDecimal().lessThan('1e-14')).toBe(true);
			expect(solver.evaluate(root.getMultiplier().toDecimal()).abs().lessThan(solver.tolerance)).toBe(true);
		}
	});

	it.each(['Brent', 'NewtonRaphson'] as const)('covers both partial cells in a shifted fractional interval using %s', method => {
		const solver = new FunctionSolver('(x-1.015)*(x-1.2475)', 'x', {
			lowerBound: 1.005, upperBound: 1.255, stepSize: 0.1, method,
		});
		const roots = solver.roots();
		expect(roots).toHaveLength(2);
		for (const expected of ['1.015', '1.2475']) {
			expect(roots.some(root => root.minus(expected).abs().getMultiplier().toDecimal().lessThan('1e-14'))).toBe(true);
		}
	});

	it('includes both terminal roots when a step is wider than the search interval', () => {
		const solver = new FunctionSolver('x*(x-0.25)', 'x', {
			lowerBound: 0, upperBound: 0.25, stepSize: 1,
		});
		const roots = solver.roots();
		expect(roots).toHaveLength(2);
		expect(roots.some(root => root.isZero())).toBe(true);
		expect(roots.some(root => root.eq('0.25'))).toBe(true);
	});

	it('reuses a cached scan value when accepting an endpoint root', () => {
		const solver = new FunctionSolver('x', 'x', {
			lowerBound: -1, upperBound: 1, stepSize: 1, maxRoots: 1,
		});
		const evaluate = jest.spyOn(solver, 'evaluate');
		const roots = solver.roots();
		expect(roots).toHaveLength(1);
		expect(roots[0].isZero()).toBe(true);
		expect(evaluate.mock.calls.filter(([value]) => new Decimal(value).isZero())).toHaveLength(1);
	});

	it('matches Expression.evaluate across repeated numerical inputs and a changed expression', () => {
		const solver = new FunctionSolver('sin(x)+x^2', 'x');
		for (const at of ['0.125', '1.5', '-2.25']) {
			const expected = solver.func.evaluate({ x: new Decimal(at) }).getMultiplier().toDecimal();
			expect(solver.evaluate(at).eq(expected)).toBe(true);
		}
		solver.func = Expression.create('cos(x)+x');
		const expected = solver.func.evaluate({ x: new Decimal('0.25') }).getMultiplier().toDecimal();
		expect(solver.evaluate('0.25').eq(expected)).toBe(true);
	});

	it('preserves scientific-metadata evaluation and invalid real domains', () => {
		const scientific = Expression.create('1250*x');
		scientific.scientific = 3;
		const solver = new FunctionSolver(scientific, 'x');
		const expected = scientific.evaluate({ x: new Decimal('0.25') });
		expect(solver.evaluate('0.25').eq(expected.getMultiplier().toDecimal())).toBe(true);
		const invalid = new FunctionSolver('sqrt(x)', 'x');
		expect(() => invalid.evaluate(-1)).toThrow();
	});

	it('uses the true midpoint first and respects maxRoots across shared endpoints', () => {
		const solver = new FunctionSolver('(x-0.125)*(x-0.25)', 'x', {
			lowerBound: 0, upperBound: 0.25, stepSize: 1, maxRoots: 1,
		});
		const roots = solver.roots();
		expect(roots).toHaveLength(1);
		expect(roots.some(root => root.eq('0.125'))).toBe(true);
	});
});
