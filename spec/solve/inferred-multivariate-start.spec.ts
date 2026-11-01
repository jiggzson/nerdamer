import '../helpers/registerNerdamerFunctions';
import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Expression } from '../../src/core/classes/expression/Expression';
import { message } from '../../src/core/errors';
import { clearWarnings, getWarnings } from '../../src/core/warnings';
import { MultivariateSolver } from '../../src/solve/classes/MultivariateSolver';
import { solveSystem } from '../../src/solve/solveSystem';

describe('certified multivariate starting point', () => {
	afterEach(() => clearWarnings());

	it('finds the strict-contraction root missed by every default grid start', () => {
		const equations = [
			'x-0.79577391968476127977*sin(1.2566370614359172*x)-200.5',
			'y-x',
		];
		const solutions = solveSystem(equations, ['x', 'y']);

		expect(solutions.count()).toBe(1);
		const solution = solutions.at(0);
		expect(Dictionary.isDictionary(solution)).toBe(true);
		if (!Dictionary.isDictionary(solution)) {
			throw new Error('Expected a dictionary solution');
		}
		const x = solution.get('x');
		const y = solution.get('y');
		expect(Expression.isExpression(x) && Expression.isExpression(y)).toBe(true);
		if (!Expression.isExpression(x) || !Expression.isExpression(y)) {
			throw new Error('Expected expression-valued coordinates');
		}
		expect(Number(x.text())).toBeCloseTo(201.2945284279788, 12);
		expect(x.minus(y).abs().isNearlyZero()).toBe(true);
		for (const equation of equations) {
			expect(Expression.create(equation).evaluate({ x, y }).isNearlyZero()).toBe(true);
		}
	});

	it.each<[string[], string[], number[]]>([
		[
			['x+0.2*sin(y)-200', 'y+0.2*cos(x)-300'],
			['x', 'y'],
			[200.1976957708697, 299.8701554240954],
		],
		[
			['-3*x+sin(x)+cos(y)+600', 'y-x'],
			['x', 'y'],
			[199.7722115189182, 199.7722115189182],
		],
	])('supports coupled terms and negative coefficient signs: %j', (
		equations,
		variables,
		expected
	) => {
		const solutions = solveSystem(equations, variables);

		expect(solutions.count()).toBe(1);
		const solution = solutions.at(0);
		expect(Dictionary.isDictionary(solution)).toBe(true);
		if (!Dictionary.isDictionary(solution)) {
			throw new Error('Expected a dictionary solution');
		}
		const values: Record<string, Expression> = {};
		for (let i = 0; i < variables.length; i++) {
			const variable = variables[i];
			const value = solution.get(variable);
			expect(Expression.isExpression(value)).toBe(true);
			if (!Expression.isExpression(value)) {
				throw new Error('Expected an expression-valued coordinate');
			}
			expect(Number(value.text())).toBeCloseTo(expected[i], 12);
			values[variable] = value;
		}
		for (const equation of equations) {
			expect(Expression.create(equation).evaluate(values).isNearlyZero()).toBe(true);
		}
	});

	it('supports a certified three-variable contraction', () => {
		const equations = ['2*x-400+cos(y)', 'y-x', 'z-y'];
		const solutions = solveSystem(equations, ['x', 'y', 'z']);

		expect(solutions.count()).toBe(1);
		const solution = solutions.at(0);
		expect(Dictionary.isDictionary(solution)).toBe(true);
		if (!Dictionary.isDictionary(solution)) {
			throw new Error('Expected a dictionary solution');
		}
		const x = solution.get('x');
		const y = solution.get('y');
		const z = solution.get('z');
		expect(
			Expression.isExpression(x) && Expression.isExpression(y) && Expression.isExpression(z)
		).toBe(true);
		if (!Expression.isExpression(x) || !Expression.isExpression(y) || !Expression.isExpression(z)) {
			throw new Error('Expected expression-valued coordinates');
		}
		expect(x.minus(y).abs().isNearlyZero()).toBe(true);
		expect(y.minus(z).abs().isNearlyZero()).toBe(true);
		expect(Number(x.text())).toBeCloseTo(199.83257645355016, 12);
		for (const equation of equations) {
			expect(Expression.create(equation).evaluate({ x, y, z }).isNearlyZero()).toBe(true);
		}
	});

	it('requires a strictly smaller than one contraction factor', () => {
		const solver = new MultivariateSolver([
			Expression.create('x-sin(x)-1'),
			Expression.create('y-x'),
		], ['x', 'y'], {
			lowerBound: 0,
			upperBound: 0,
			gridPoints: 2,
			maxIterations: 0,
		});

		expect(solver.roots()).toEqual([]);
		expect(getWarnings()).toEqual([{
			code: 'solve.iterationLimit',
			message: message('rootIterationWarning', { count: '4', iterations: '0' }),
		}]);
	});

	it('retains the grid for multiple roots and a misleading affine center', () => {
		const multipleEquations = ['0.1*x+sin(x)', 'y-x'];
		const misleadingEquations = [
			'x+2*sin(x)-2.0943951023931953',
			'y-x',
		];
		const multiple = solveSystem(multipleEquations, ['x', 'y']);
		const misleading = solveSystem(misleadingEquations, ['x', 'y']);

		expect(multiple.count()).toBe(3);
		const multipleRoots = multiple.elements.map(solution => {
			expect(Dictionary.isDictionary(solution)).toBe(true);
			if (!Dictionary.isDictionary(solution)) {
				throw new Error('Expected a dictionary solution');
			}
			const x = solution.get('x');
			const y = solution.get('y');
			expect(Expression.isExpression(x) && Expression.isExpression(y)).toBe(true);
			if (!Expression.isExpression(x) || !Expression.isExpression(y)) {
				throw new Error('Expected expression-valued coordinates');
			}
			expect(x.minus(y).abs().isNearlyZero()).toBe(true);
			for (const equation of multipleEquations) {
				expect(Expression.create(equation).evaluate({ x, y }).isNearlyZero()).toBe(true);
			}
			return Number(x.text());
		}).sort((a, b) => a - b);
		expect(multipleRoots[0]).toBeCloseTo(-5.67920779631443, 12);
		expect(multipleRoots[1]).toBeCloseTo(0, 12);
		expect(multipleRoots[2]).toBeCloseTo(5.6792077963144, 12);

		expect(misleading.count()).toBe(1);
		const misleadingSolution = misleading.at(0);
		expect(Dictionary.isDictionary(misleadingSolution)).toBe(true);
		if (!Dictionary.isDictionary(misleadingSolution)) {
			throw new Error('Expected a dictionary solution');
		}
		const misleadingX = misleadingSolution.get('x');
		const misleadingY = misleadingSolution.get('y');
		expect(
			Expression.isExpression(misleadingX) && Expression.isExpression(misleadingY)
		).toBe(true);
		if (!Expression.isExpression(misleadingX) || !Expression.isExpression(misleadingY)) {
			throw new Error('Expected expression-valued coordinates');
		}
		expect(Number(misleadingX.text())).toBeCloseTo(0.7423508908931371, 12);
		for (const equation of misleadingEquations) {
			expect(Expression.create(equation).evaluate({
				x: misleadingX,
				y: misleadingY,
			}).isNearlyZero()).toBe(true);
		}
	});

	it('supports an invertible near-singular affine matrix and rejects a singular one', () => {
		const nearSingularEquations = [
			'x+y-400+0.00000001*sin(x)',
			'x+1.000001*y-400.0002',
		];
		const nearSingular = solveSystem(nearSingularEquations, ['x', 'y']);
		expect(nearSingular.count()).toBe(1);
		const nearSingularSolution = nearSingular.at(0);
		expect(Dictionary.isDictionary(nearSingularSolution)).toBe(true);
		if (!Dictionary.isDictionary(nearSingularSolution)) {
			throw new Error('Expected a dictionary solution');
		}
		const nearSingularX = nearSingularSolution.get('x');
		const nearSingularY = nearSingularSolution.get('y');
		expect(
			Expression.isExpression(nearSingularX) && Expression.isExpression(nearSingularY)
		).toBe(true);
		if (!Expression.isExpression(nearSingularX) || !Expression.isExpression(nearSingularY)) {
			throw new Error('Expected expression-valued coordinates');
		}
		// The 1e-6 determinant amplifies coordinate error even when residuals remain small.
		const coordinateTolerance = 1e-6;
		expect(
			Math.abs(Number(nearSingularX.text()) - Number('200.0086903142933870764'))
		).toBeLessThan(coordinateTolerance);
		expect(
			Math.abs(Number(nearSingularY.text()) - Number('199.9913096943969185267'))
		).toBeLessThan(coordinateTolerance);
		for (const equation of nearSingularEquations) {
			expect(Expression.create(equation).evaluate({
				x: nearSingularX,
				y: nearSingularY,
			}).isNearlyZero()).toBe(true);
		}

		const singular = new MultivariateSolver([
			Expression.create('x+y-400+0.1*sin(x)'),
			Expression.create('2*x+2*y-800'),
		], ['x', 'y'], {
			lowerBound: 0,
			upperBound: 0,
			gridPoints: 2,
			maxIterations: 0,
		});
		expect(singular.roots()).toEqual([]);
		expect(getWarnings()).toEqual([{
			code: 'solve.iterationLimit',
			message: message('rootIterationWarning', { count: '4', iterations: '0' }),
		}]);
	});

	it.each([
		'x+tan(x-200)-200',
		'x+tanh(x-200)-200',
		'x+sin((x-200)^2)-200',
		'x+(x-200)*sin(x-200)-200',
		'x+(x-200)^(-1)-200',
	])('retains the grid for an unsupported expression: %s', equation => {
		const solver = new MultivariateSolver([
			Expression.create(equation),
			Expression.create('y-x'),
		], ['x', 'y'], {
			lowerBound: 0,
			upperBound: 0,
			gridPoints: 2,
			maxIterations: 0,
		});

		expect(solver.roots()).toEqual([]);
		expect(getWarnings()).toEqual([{
			code: 'solve.iterationLimit',
			message: message('rootIterationWarning', { count: '4', iterations: '0' }),
		}]);
		clearWarnings();
	});

	it('falls back to the unchanged grid when inferred-start Newton does not converge', () => {
		const solver = new MultivariateSolver([
			Expression.create('2*x-400+cos(x)'),
			Expression.create('y-x'),
		], ['x', 'y'], {
			lowerBound: 0,
			upperBound: 0,
			gridPoints: 2,
			maxIterations: 0,
		});

		expect(solver.roots()).toEqual([]);
		expect(getWarnings()).toEqual([{
			code: 'solve.iterationLimit',
			message: message('rootIterationWarning', { count: '4', iterations: '0' }),
		}]);
	});

	it('leaves exact linear and polynomial systems on their existing strategies', () => {
		const rootsSpy = jest.spyOn(MultivariateSolver.prototype, 'roots');

		try {
			expect(solveSystem(['x+y-3', '2*x-y'], ['x', 'y']).text()).toBe('[{x => 1, y => 2}]');
			const polynomial = solveSystem(['x^2-1', 'y-x'], ['x', 'y']);
			expect(polynomial.count()).toBe(2);
			const roots = polynomial.elements.map(solution => {
				expect(Dictionary.isDictionary(solution)).toBe(true);
				if (!Dictionary.isDictionary(solution)) {
					throw new Error('Expected a dictionary solution');
				}
				const x = solution.get('x');
				const y = solution.get('y');
				expect(Expression.isExpression(x) && Expression.isExpression(y)).toBe(true);
				if (!Expression.isExpression(x) || !Expression.isExpression(y)) {
					throw new Error('Expected expression-valued coordinates');
				}
				expect(x.eq(y)).toBe(true);
				expect(x.pow(2).minus(1).isZero()).toBe(true);
				return Number(x.text());
			}).sort((a, b) => a - b);
			expect(roots).toEqual([-1, 1]);
			expect(rootsSpy).not.toHaveBeenCalled();
		} finally {
			rootsSpy.mockRestore();
		}
	});
});
