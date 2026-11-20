import Decimal from 'decimal.js';

import '../../src/index';
import { message } from '../../src/core/errors';
import { Expression } from '../../src/core/classes/expression/Expression';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { solve } from '../../src/solve/solve';

describe('FunctionSolver brackets and scan coverage', () => {
	it.each([[2, 5], [5, 2]])('accepts an endpoint root for either bracket orientation: %s, %s', (a, b) => {
		const solver = new FunctionSolver('x-2', 'x');
		const result = solver.Brent(new Decimal(a), new Decimal(b));
		expect(result.converged).toBe(true);
		expect(result.iterations).toBe(0);
		expect(result.root.eq(2)).toBe(true);
		expect(result.error.isZero()).toBe(true);
	});

	it.each([[0, 1], [1, 0]])('does not accept an endpoint by residual alone: %s, %s', (a, b) => {
		const solver = new FunctionSolver('x-1e-16', 'x');
		const result = solver.Brent(new Decimal(a), new Decimal(b));
		expect(result.converged).toBe(true);
		expect(result.root.eq('1e-16')).toBe(true);
	});

	it('reports same-sign endpoints as failure with a candidate coordinate', () => {
		const solver = new FunctionSolver('x^2+1', 'x');
		const result = solver.Brent(new Decimal(10), new Decimal(11));
		expect(result.converged).toBe(false);
		expect(result.iterations).toBe(0);
		expect(result.root.eq(11)).toBe(true);
		expect(result.error.isFinite()).toBe(false);
		expect(result.errorMsg).toBe(message('differentSignsAtEndPointsRequired'));
	});

	it('retains an actual endpoint candidate when the refinement budget is exhausted', () => {
		const solver = new FunctionSolver('cos(x)-x', 'x', { maxIterations: 0 });
		const result = solver.Brent(new Decimal(0), new Decimal(1));
		expect(result.converged).toBe(false);
		expect(result.root.eq(1)).toBe(true);
		expect(result.error.isFinite()).toBe(false);
	});

	it.each(['Brent', 'NewtonRaphson'] as const)('finds a root inside the last partial cell using %s', method => {
		const solver = new FunctionSolver('x-0.2375', 'x', {
			lowerBound: 0, upperBound: 0.25, stepSize: 0.1, method,
		});
		const roots = solver.roots();
		expect(roots).toHaveLength(1);
		for (const root of roots) {
			expect(root.minus('0.2375').abs().getMultiplier().toDecimal().lt('1e-14')).toBe(true);
			expect(solver.evaluate(root.getMultiplier().toDecimal()).abs().lt(solver.tolerance)).toBe(true);
		}
	});

	it.each(['Brent', 'NewtonRaphson'] as const)('covers both partial cells in a shifted fractional interval using %s', method => {
		const solver = new FunctionSolver('(x-1.015)*(x-1.2475)', 'x', {
			lowerBound: 1.005, upperBound: 1.255, stepSize: 0.1, method,
		});
		const roots = solver.roots();
		expect(roots).toHaveLength(2);
		for (const expected of ['1.015', '1.2475']) {
			expect(roots.some(root => root.minus(expected).abs().getMultiplier().toDecimal().lt('1e-14'))).toBe(true);
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

	it('accepts steep bracketed roots using their function scale without losing position accuracy', () => {
		const solver = new FunctionSolver('cos(x^2)+sin(x)*sinh(x)', 'x', {
			lowerBound: new Decimal('-20'), upperBound: new Decimal('20'),
		});
		const roots = solver.roots();
		const expected = [
			'3.0471767724967765865',
			'6.2839949195763557018',
			'9.4248827844016784386',
			'12.566365927502993643',
			'15.707963230345988889',
			'18.849555933959358158',
		];
		expect(roots).toHaveLength(expected.length * 2);
		for (const value of expected) {
			for (const sign of ['1', '-1']) {
				const target = new Decimal(value).times(sign);
				expect(roots.some(root =>
					root.getMultiplier().toDecimal().minus(target).abs().lt('1e-12')
				)).toBe(true);
			}
		}
	});

	it('retains validated roots in public solve for an unfactored steep function', () => {
		const result = solve('cos(x^2)+sin(x)*sinh(x)', 'x', {
			lowerBound: -20, upperBound: 20,
		});
		const roots = result.elements.map(root => root.getMultiplier().toDecimal());
		for (const value of ['15.707963230345988889', '-15.707963230345988889']) {
			const expected = new Decimal(value);
			expect(roots.some(root => root.minus(expected).abs().lt('1e-12'))).toBe(true);
		}
	});

	it('does not accept a sign-changing pole as a Brent root', () => {
		const solver = new FunctionSolver('1/(x-1/3)', 'x', {
			lowerBound: new Decimal('0'), upperBound: new Decimal('1'),
		});
		expect(solver.roots()).toHaveLength(0);
	});

	it('retains steep Brent crossings at 50-digit working precision', () => {
		const previousPrecision = Decimal.precision;
		try {
			Decimal.set({ precision: 50 });
			const solver = new FunctionSolver('cos(x^2)+sin(x)*sinh(x)', 'x', {
				lowerBound: -100, upperBound: 100, maxRoots: 100,
			});
			const roots = solver.roots().map(root => root.getMultiplier().toDecimal());
			const expected = [
				'40.840704496667310209',
				'59.690260418206073533',
				'78.539816339744829045',
				'87.964594300514213059',
			];
			for (const value of expected) {
				const target = new Decimal(value);
				expect(roots.some(root => root.minus(target).abs().lt('1e-12'))).toBe(true);
			}
			expect(roots).toHaveLength(62);
		} finally {
			Decimal.set({ precision: previousPrecision });
		}
	});

	it('does not accept an odd-order pole as a steep Brent root', () => {
		const solver = new FunctionSolver('1/(x-1/3)^3', 'x', {
			lowerBound: 0, upperBound: 1,
		});
		expect(solver.roots()).toHaveLength(0);
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
