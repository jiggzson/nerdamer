import nerdamer from '../../src/index';
import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';
import { message, UnsupportedOperationError } from '../../src/core/errors';
import { solveSystem } from '../../src/solve/solveSystem';
import { Expression } from '../../src/core/classes/expression/Expression';

beforeEach(() => {
	for (const key of Object.keys(Parser.KNOWN_VALUES)) {
		delete Parser.KNOWN_VALUES[key];
	}
});

describe('solveSystem', () => {
	// ─── Trivial / edge cases ───────────────────────────────────────
	it('returns a vector with an empty dictionary for an empty system', () => {
		const result = solveSystem([]);
		expect(result.text()).toEqual(new Vector([new Dictionary()]).text());
	});

	it('solves a unique linear system', () => {
		const result = solveSystem(['x+y-3', '2*x+3*y-8']);
		expect(result.text()).toEqual(new Vector([Parser.parse('{x => 1, y => 2}')]).text());
	});

	it('accepts vector input for a unique linear system', () => {
		const equations = new Vector(['x+y-3', '2*x+3*y-8']);
		const result = solveSystem(equations);
		expect(result.text()).toEqual(new Vector([Parser.parse('{x => 1, y => 2}')]).text());
	});

	it('returns an empty vector for an inconsistent linear system', () => {
		const result = solveSystem(['x+y-1', 'x+y-2']);
		expect(result.text()).toEqual(new Vector([]).text());
	});

	// ─── Nonlinear: rational solutions ──────────────────────────────
	it('solves a nonlinear system with rational solutions', () => {
		const result = solveSystem(['x^2-1', 'y-x']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0)?.text(), result.at(1)?.text()].sort();
		expect(texts).toEqual(['{x => -1, y => -1}', '{x => 1, y => 1}']);
	});

	it('rejects roots that make a cleared rational denominator zero', () => {
		const linear = solveSystem(['x-1', '(y-x)/(y-1)']);
		expect(linear.text()).toEqual('[]');

		const nonlinear = solveSystem(['(x^2-1)/(x-1)', 'y-2']);
		expect(nonlinear.text()).toEqual('[{x => -1, y => 2}]');
	});

	it('solves a symmetric system', () => {
		const result = solveSystem(['x+y-5', 'x*y-6']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0)?.text(), result.at(1)?.text()].sort();
		expect(texts).toEqual(['{x => 2, y => 3}', '{x => 3, y => 2}']);
	});

	it('solves a parabola-line intersection', () => {
		const result = solveSystem(['y-x^2', 'y-x-2']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0)?.text(), result.at(1)?.text()].sort();
		expect(texts).toEqual(['{x => -1, y => 1}', '{x => 2, y => 4}']);
	});

	it('solves an ellipse-line intersection', () => {
		const result = solveSystem(['x^2+4*y^2-4', 'x+2*y-2']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0)?.text(), result.at(1)?.text()].sort();
		expect(texts).toEqual(['{x => 0, y => 1}', '{x => 2, y => 0}']);
	});

	it('solves a tangent circle-line intersection', () => {
		const result = solveSystem(['x^2+y^2-1', 'y-1']);
		expect(result.count()).toEqual(1);
		expect(result.at(0)?.text()).toEqual('{x => 0, y => 1}');
	});

	// ─── Nonlinear: irrational solutions ────────────────────────────
	it('solves a nonlinear system with irrational solutions', () => {
		const result = solveSystem(['x^2-2', 'y-x']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0)?.text(), result.at(1)?.text()].sort();
		expect(texts).toEqual(['{x => -2^(1/2), y => -2^(1/2)}', '{x => 2^(1/2), y => 2^(1/2)}']);
	});

	it('solves a circle-line intersection with irrational solutions', () => {
		const result = solveSystem(['x^2+y^2-1', 'y-x']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0)?.text(), result.at(1)?.text()].sort();
		expect(texts).toEqual([
			'{x => (-1/2)*2^(1/2), y => (-1/2)*2^(1/2)}',
			'{x => (1/2)*2^(1/2), y => (1/2)*2^(1/2)}',
		]);
	});

	it('solves a circle-circle intersection', () => {
		const result = solveSystem(['x^2+y^2-1', '(x-1)^2+y^2-1']);
		expect(result.count()).toEqual(2);
		const texts = [result.at(0)?.text(), result.at(1)?.text()].sort();
		expect(texts).toEqual([
			'{x => 1/2, y => (-1/2)*3^(1/2)}',
			'{x => 1/2, y => (1/2)*3^(1/2)}',
		]);
	});

	// ─── Nonlinear: cubic ───────────────────────────────────────────
	it('solves a cubic-linear system', () => {
		const result = solveSystem(['x^3-y', 'y-x-1']);
		expect(result.count()).toEqual(3);
	});

	// ─── Nonlinear: parabola-parabola ───────────────────────────────
	it('solves a parabola-parabola intersection', () => {
		const result = solveSystem(['y-x^2', 'x-y^2']);
		expect(result.count()).toEqual(4);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toContain('{x => 0, y => 0}');
		expect(texts).toContain('{x => 1, y => 1}');
	});

	it('throws for nonlinear systems with infinitely many solutions in v1', () => {
		expect(() => solveSystem(['x*y'])).toThrow(UnsupportedOperationError);
		expect(() => solveSystem(['x*y'])).toThrow(message('solveSystemInfiniteSolutions'));
	});

	it('solves a nonlinear non-polynomial system numerically', () => {
		const result = solveSystem(['sin(x)', 'y-1']);
		expect(result.text()).toEqual(
			Parser.parse(
				'[{x => -9.4247779607686356079, y => 1}, {x => 0, y => 1}, {x => 9.4247779607693797154, y => 1}]'
			).text()
		);
	});

	it('solves a mixed trig-polynomial system numerically', () => {
		const result = solveSystem(['cos(x)^2-y-1', 'x^2+y-7']);
		expect(result.count()).toBeGreaterThanOrEqual(2);
	});

	it('solves a mixed trig-polynomial system numerically', () => {
		const result = solveSystem(['cos(x)^2-y-1', 'x^2+y-7']);
		expect(result.text()).toEqual(
			Parser.parse(
				'[{x => -2.6825912868253889607, y => -0.19629601215149626377}, {x => 2.6825912868253889607, y => -0.19629601215149626377}]'
			).text()
		);
	});

	it('solves a linear trivariate system', () => {
		const result = solveSystem(['x+y+z-6', 'x-y+z-2', '2*x+y-z-1']);
		expect(result.count()).toEqual(1);
		expect(result.at(0)?.text()).toEqual('{x => 1, y => 2, z => 3}');
	});

	it('solves a nonlinear trivariate system', () => {
		const result = solveSystem(['x*y*z-6', 'x+y+z-6', 'x^2+y^2+z^2-14']);
		expect(result.count()).toEqual(6);
	});

	it('solves a symmetric cubic trivariate system', () => {
		const result = solveSystem(['x+y+z-1', 'x^2+y^2+z^2-1', 'x^3+y^3+z^3-1']);
		expect(result.count()).toEqual(3);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toEqual([
			'{x => 0, y => 0, z => 1}',
			'{x => 0, y => 1, z => 0}',
			'{x => 1, y => 0, z => 0}',
		]);
	});

	// ─── Higher degree bivariate ────────────────────────────────────
	it('solves a quartic-quadratic system', () => {
		const result = solveSystem(['x^4-y', 'x^2+y-2']);
		expect(result.count()).toEqual(4);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toContain('{x => 1, y => 1}');
		expect(texts).toContain('{x => -1, y => 1}');
	});

	it('solves a biquadratic system', () => {
		const result = solveSystem(['x^2+y^2-2', 'x^2*y^2-1']);
		expect(result.count()).toEqual(4);
		const texts = result.elements.map(e => e.text()).sort();
		expect(texts).toEqual([
			'{x => -1, y => -1}',
			'{x => -1, y => 1}',
			'{x => 1, y => -1}',
			'{x => 1, y => 1}',
		]);
	});

	it('solves an underdetermined linear system with free variables', () => {
		const result = solveSystem(['x+y-1']);
		expect(result.count()).toEqual(1);
		expect(result.at(0)?.text()).toEqual('{x => 1-y, y => y}');
	});

	it('solves an underdetermined linear system with two free variables', () => {
		const result = solveSystem(['x+y+z-6']);
		expect(result.count()).toEqual(1);
		expect(result.at(0)?.text()).toEqual('{x => 6-y-z, y => y, z => z}');
	});

	it('solves an underdetermined trivariate linear system', () => {
		const result = solveSystem(['x+y+z-6', 'x-y-2']);
		expect(result.count()).toEqual(1);
		expect(result.at(0)?.text()).toEqual('{x => 4+(-1/2)*z, y => 2+(-1/2)*z, z => z}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/186
	it('exposes solveeqs through parser and root dispatch', () => {
		const equations = ['x+y=3', 'x-y=1'];
		const rootResult = nerdamer.solveeqs(equations);
		const parserResult = nerdamer('solveeqs([x+y=3,x-y=1])');

		expect(rootResult.text()).toEqual('[{x => 2, y => 1}]');
		expect(parserResult.text()).toEqual(rootResult.text());
	});
});

describe('System-solving regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/54
	it('solves the linear system with explicit multiplication', () => {
		const solutions = nerdamer.solveeqs(['x+y=1', '2*x=6', '4*z+y=6']);

		expect(solutions.text()).toEqual('[{x => 3, y => -2, z => 2}]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/213
	it('keeps parser-level system solutions as evaluable vectors', () => {
		const result = nerdamer('solveeqs([x+y=2,x^2=y])');

		expect(Vector.isVector(result)).toBe(true);
		if (!Vector.isVector(result)) {
			throw new Error('solveeqs did not return a Vector');
		}

		const evaluated = result.evaluate();
		const solutions = evaluated.elements.map(solution => {
			expect(Dictionary.isDictionary(solution)).toBe(true);
			return solution.text();
		});
		expect(solutions.sort()).toEqual(['{x => -2, y => 4}', '{x => 1, y => 1}'].sort());
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/313
	it('preserves unrelated known values while solving systems', () => {
		const retainedName = 'legacy313keep';
		nerdamer.setVar(retainedName, 7);

		try {
			nerdamer.solveeqs(
				['legacy313x+legacy313y=3', 'legacy313x-legacy313y=1'],
				['legacy313x', 'legacy313y']
			);
			expect(nerdamer(retainedName).text()).toEqual('7');
		} finally {
			nerdamer.setVar(retainedName, 'delete');
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/410
	it('preserves signs in a symbolic linear system', () => {
		const solutions = nerdamer.solveeqs(
			['x - y = a + b', '2*x - z = 2*a - c', '5*z - y = b + 5*c'],
			['x', 'y', 'z']
		);

		expect(solutions.text()).toEqual('[{x => a, y => -b, z => c}]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/475
	it('solves linear systems with complex coefficients', () => {
		const result = solveSystem([
			'2*X1-4*X2+2*i=3',
			'-5*X1+8*X2*i-4*i*X1=2',
		]);
		const expected = Parser.parse('{X1 => -6/5-(6/5)*i, X2 => -27/20-(1/10)*i}');

		expect(result.count()).toEqual(1);
		expect(result.at(0)?.expand().text()).toEqual(expected.expand().text());
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/478
	it('handles the singular linear system without throwing', () => {
		const result = solveSystem(['2+5*b=3*c', '7-2*a=3*c', '9-2*a=5*b']);

		expect(result.text()).toEqual('[]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/498
	it('solves the circle-line system without division-by-zero errors', () => {
		const result = solveSystem(['x^2+y^2=1', 'x+y=1']);
		const actual = result.elements.map(solution => solution.text()).sort();

		expect(actual).toEqual(['{x => 0, y => 1}', '{x => 1, y => 0}']);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/516
	it('solves the reported two-equation linear system', () => {
		const actual = solveSystem([
			'a*(1-0)+0=b*(9-10)+10',
			'a*(1-0)+0=b*(1-0)+0',
		]);

		expect(actual.text()).toEqual('[{a => 5, b => 5}]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/546
	it('solves the reported max-based nonlinear system without overflowing or stalling', () => {
		const actual = solveSystem([
			'y=x*2',
			'z=y+max(y*0.1,23)',
			'j=y+max(y*0.1,23)',
			'6694.895373=j+z+max(j*0.280587,z*0.280587,176)',
		]);
		const solution = actual.at(0);
		const expected: Record<string, number> = {
			x: 1334.3644686453729,
			y: 2668.7289372907458,
			z: 2935.601831019821,
			j: 2935.601831019821,
		};

		expect(actual.count()).toEqual(1);
		expect(Dictionary.isDictionary(solution)).toBe(true);
		if (Dictionary.isDictionary(solution)) {
			for (const [name, expectedValue] of Object.entries(expected)) {
				const value = solution.get(name);
				expect(Expression.isExpression(value)).toBe(true);
				if (Expression.isExpression(value)) {
					expect(Number(value.text({ decimal: true }))).toBeCloseTo(expectedValue, 8);
				}
			}
		}
	}, 30_000);

	// Regression: https://github.com/jiggzson/nerdamer/issues/562
	it('accepts a consistent overdetermined linear system', () => {
		const actual = nerdamer.solveeqs(['x+y=1', '2*x=6', '4*z+y=6', 'y=(-1)*z']);

		expect(actual.text()).toEqual('[{x => 3, y => -2, z => 2}]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/627
	it('solves a linear system when i appears alone on one side', () => {
		const solutions = nerdamer.solveeqs(['x=i', 'x+y=3']);
		expect(solutions.count()).toEqual(1);

		const solution = solutions.at(0);
		expect(Dictionary.isDictionary(solution)).toBe(true);
		if (Dictionary.isDictionary(solution)) {
			const x = solution.get('x');
			const y = solution.get('y');
			expect(Expression.isExpression(x) && x.eq('i')).toBe(true);
			expect(Expression.isExpression(y) && y.minus('3-i').simplify().isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/628
	it('solves a redundant decimal system without a determinant crash', () => {
		const solutions = nerdamer.solveeqs([
			'0=discount___plan/(45909438.9+discount___plan)',
			'45909438.9=45909438.9+discount___plan',
		]);
		expect(solutions.count()).toEqual(1);

		const solution = solutions.at(0);
		expect(Dictionary.isDictionary(solution)).toBe(true);
		if (Dictionary.isDictionary(solution)) {
			const discount = solution.get('discount___plan');
			expect(Expression.isExpression(discount) && discount.isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/52
	it('solves linear systems with symbolic coefficients', () => {
		const solutions = nerdamer.solveeqs(['x*(b+1)+y=1', 'x+y=6'], ['x', 'y']);
		expect(solutions.count()).toEqual(1);

		const solution = solutions.at(0);
		expect(Dictionary.isDictionary(solution)).toBe(true);
		if (!Dictionary.isDictionary(solution)) {
			throw new Error('Expected a dictionary solution');
		}

		const x = solution.get('x');
		const y = solution.get('y');
		expect(Expression.isExpression(x) && Expression.isExpression(y)).toBe(true);
		if (!Expression.isExpression(x) || !Expression.isExpression(y)) {
			throw new Error('Expected expression-valued solutions');
		}

		expect(x.variables()).toEqual(['b']);
		expect(y.variables()).toEqual(['b']);
		expect(x.evaluate({ b: 1 }).text()).toEqual('-5');
		expect(y.evaluate({ b: 1 }).text()).toEqual('11');
		expect(x.evaluate({ b: 2 }).text()).toEqual('-5/2');
		expect(y.evaluate({ b: 2 }).text()).toEqual('17/2');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/130
	it('keeps the solution when system equations are redundant', () => {
		expect(nerdamer.solveeqs(['x-2=0', 'x-2=0']).text()).toEqual('[{x => 2}]');
		expect(nerdamer.solveeqs(['x-2=0', '2*x-4=0']).text()).toEqual('[{x => 2}]');
	});
});
