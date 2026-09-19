import { Expression } from '../../src/core/classes/expression/Expression';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import { UnexpectedInputError } from '../../src/core/errors';
import nerdamer from '../../src/index';
import { Parser } from '../../src/core/classes/parser/Parser';
import { PolynomialSolver } from '../../src/solve/classes/PolynomialSolver';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import { solve } from '../../src/solve/solve';

const sortedSolutionTexts = (solutions: SolutionSet) =>
	solutions.elements.map(solution => solution.text()).sort();

describe('PolynomialSolver input validation', () => {
	it('rejects invalid direct Polynomial inputs the same way as strings', () => {
		const multivariate = 'x^2+y';
		const mismatchedVariable = 'x^2+1';

		expect(() => new PolynomialSolver(multivariate, 'x')).toThrow(UnexpectedInputError);
		expect(() => new PolynomialSolver(new Polynomial(multivariate), 'x')).toThrow(
			UnexpectedInputError
		);
		expect(() => new PolynomialSolver(mismatchedVariable, 'y')).toThrow(UnexpectedInputError);
		expect(() => new PolynomialSolver(new Polynomial(mismatchedVariable), 'y')).toThrow(
			UnexpectedInputError
		);
	});

	it('accepts a matching direct univariate Polynomial', () => {
		const roots = new PolynomialSolver(new Polynomial('x^2-1'), 'x').roots();

		expect(roots.map(root => root.text()).sort()).toEqual(['-1', '1']);
	});
});

describe('Parameterized polynomial roots', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/216
	it('solves factorable and parameterized polynomials', () => {
		const factorable = nerdamer.solve('(x^4+x^3)*(x^4*x^2)', 'x');
		expect(factorable.count()).toBe(2);
		expect(factorable.has(Expression.create(-1))).toBe(true);
		expect(factorable.has(Expression.create(0))).toBe(true);

		const input = 'm*x^9+n';
		const polynomial = Expression.create(input);
		const parameterized = nerdamer.solve(input, 'x');
		expect(parameterized.count()).toBe(9);

		const coefficientCases = [
			{ m: 1, n: -1 },
			{ m: 1, n: 1 },
		];

		for (const values of coefficientCases) {
			for (const solution of parameterized.elements) {
				const root = solution.evaluate(values);
				const residual = polynomial.evaluate({ ...values, x: root }).expand();
				expect(residual.isNearlyZero()).toBe(true);
			}
		}
	});
});

describe('Polynomial-root regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/85
	it('preserves the parameter in symbolic quadratic roots', () => {
		const solutions = nerdamer.solve('x^2+a', 'x');

		expect(solutions.count()).toBe(2);
		expect(solutions.has(Expression.create('sqrt(-a)'))).toBe(true);
		expect(solutions.has(Expression.create('-sqrt(-a)'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/86
	it('returns exact algebraic roots before numerical approximations', () => {
		const solutions = nerdamer.solve('x^2+2*x+7', 'x');

		expect(solutions.count()).toBe(2);
		expect(solutions.has(Expression.create('-1+sqrt(6)*i'))).toBe(true);
		expect(solutions.has(Expression.create('-1-sqrt(6)*i'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/125
	it('solves the complex linear roots case through the current solver', () => {
		const solutions = nerdamer.solve('2*x+i', 'x');

		expect(solutions.count()).toBe(1);
		expect(solutions.elements[0].eq(Expression.create('-i/2'))).toBe(true);
		expect(Expression.create('2*x+i', { x: solutions.elements[0] }).isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/126
	it('solves the polynomial roots case', () => {
		const solutions = nerdamer.solve('2*x*7/2-x^2', 'x');

		expect(solutions.count()).toBe(2);
		expect(solutions.has(Expression.create(0))).toBe(true);
		expect(solutions.has(Expression.create(7))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/201
	it('solves an unexpanded quadratic relation without division by zero', () => {
		const solutions = nerdamer.solve('8^2+(6+x)^2=(8+x)^2', 'x');

		expect(solutions.text()).toEqual('{9}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/265
	it('solves a fifth-degree expression with an obvious zero factor', () => {
		const solutions = nerdamer.solve('x^5+x', 'x');

		expect(solutions.count()).toBe(5);
		expect(solutions.elements.some(solution => solution.isZero())).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/345
	it('preserves the denominator when solving a symbolic quadratic', () => {
		const solutions = nerdamer.solve('(x+1)*(x+2)/2=n', 'x');
		expect(solutions.count()).toBe(2);

		// The historical defect effectively changed 8*n to 4*n under the radical.
		// Checking two exact parameter values protects the symbolic coefficient without
		// depending on a particular equivalent serialization of the quadratic formula.
		expect(
			solutions.elements.map(solution => solution.evaluate({ n: 1 }).text()).sort()
		).toEqual(['-3', '0']);
		expect(
			solutions.elements.map(solution => solution.evaluate({ n: 6 }).text()).sort()
		).toEqual(['-5', '2']);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/486
	it('returns the exact nontrivial radical root alongside zero and one', () => {
		const result = solve('sqrt(x)-2*x+x^2', 'x');
		const actual = result.elements.map(root => root.expand().text()).sort();
		const expected = ['0', '1', '(3-sqrt(5))/2']
			.map(root => Parser.parse(root).expand().text())
			.sort();

		expect(actual).toEqual(expected);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/519
	it('returns all roots for the two reported cubics without throwing', () => {
		const first = solve('x^3+x^2+2*x=6', 'x');
		const second = solve('x^3+x^2+5=4', 'x');

		expect(first.count()).toEqual(3);
		expect(second.count()).toEqual(3);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/525
	it('solves a quadratic for a non-x variable', () => {
		const actual = solve('2*a^2+4*a*6=128', 'a');

		expect(actual.elements.map(solution => solution.text()).sort()).toEqual(['-16', '4']);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/563
	it('solves a circle for both y branches instead of returning plus-or-minus x', () => {
		const solutions = nerdamer.solve('x^2+y^2=4', 'y');

		expect(solutions.count()).toBe(2);
		for (const y of solutions.elements) {
			expect(Expression.create('x^2+y^2-4', { y }).simplify().isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/594
	it('keeps a valid real cubic branch across the reported sign-change region', () => {
		const solutions = nerdamer.solve('x^3+y^3=3', 'y');

		expect(solutions.count()).toBe(3);
		for (const x of [1, 2]) {
			let matched = false;
			for (const solution of solutions.elements) {
				const y = solution.evaluate({ x });
				const residual = Expression.create('x^3+y^3-3', { x, y }).evaluate();
				if (residual.isNearlyZero()) {
					matched = true;
					break;
				}
			}
			expect(matched).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/26
	it('keeps both valid roots when symbolic unit-like factors are present', () => {
		const source = 'h-(981/200)*m*s^(-2)*t^2';
		const solutions = nerdamer.solve(`${source}=0`, 't');

		expect(solutions.count()).toEqual(2);
		for (const solution of solutions.elements) {
			const t = solution.evaluate({ h: 5, m: 2, s: 3 });
			const residual = Expression.create(source, { h: 5, m: 2, s: 3, t }).evaluate();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/136
	it('falls back from a degenerate quadratic to the linear solution', () => {
		expect(nerdamer.solve('0*x^2+2*x+4', 'x').text()).toEqual('{-2}');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/132
	it('handles zero as a polynomial root', () => {
		expect(sortedSolutionTexts(nerdamer.solve('x^3-x', 'x'))).toEqual(['-1', '0', '1']);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/127
	it('keeps irrational quadratic solutions exact', () => {
		const solutions = nerdamer.solve('x^2-2*x-1', 'x');
		expect(solutions.count()).toBe(2);

		for (const solution of solutions.elements) {
			const residual = Expression.create('x^2-2*x-1', { x: solution }).simplify().text();
			expect(residual).toEqual('0');
			expect(solution.text()).toContain('2^(1/2)');
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/682
	it('solves the decimal quartic mathematically correctly', () => {
		const solutions = nerdamer.solve(
			'z^4+1.4*z^3+0.71*z^2+0.154*z+0.012',
			'z'
		);
		expect(sortedSolutionTexts(solutions)).toEqual(['-0.2', '-0.3', '-0.4', '-0.5']);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/644
	it('keeps method and expression solve APIs consistent for complex roots', () => {
		expect(nerdamer.solve('x^2=-1', 'x').text()).toEqual('{i, -i}');
		expect(nerdamer('solve(x^2=-1,x)').text()).toEqual('{i, -i}');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/43
	it('does not numerically scan zero-free exponential factors', () => {
		expect(nerdamer.solve('e^(x^2)=0', 'x').text()).toEqual('{}');
		expect(
			sortedSolutionTexts(nerdamer.solve('(x^2-x-6)*e^(x^2)=0', 'x'))
		).toEqual(['-2', '3']);
		expect(sortedSolutionTexts(nerdamer.solve('(x-4)*e^x=0', 'x'))).toEqual(['4']);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/58
	it('[slow] solves the large-coefficient quadratic without pathological delay', () => {
		const solutions = nerdamer.solve(
			'0=(365152319648560825/8)*s*t+(981/200)*t^2',
			't'
		);
		expect(solutions.count()).toBeGreaterThan(0);
	});
});

describe('Solution provenance', () => {
	it('classifies direct and exact solver results as symbolic', () => {
		expect(solve('0', 'x').solutionsType).toBe('symbolic');
		expect(solve('x', 'x').solutionsType).toBe('symbolic');
		expect(solve('x^2-2', 'x').solutionsType).toBe('symbolic');
		expect(solve('sqrt(x)-2*x+x^2', 'x').solutionsType).toBe('symbolic');
	});

	it('classifies high-degree polynomial fallback as numeric', () => {
		const solutions = solve('x^5-x+1', 'x');

		expect(solutions.count()).toBe(5);
		expect(solutions.solutionsType).toBe('numeric');
	});

	it('preserves mixed provenance when a later numerical fallback adds roots', () => {
		const solutions = solve('(x-1)*(x^5-x+1)*(x+cos(x))', 'x');

		expect(solutions.count()).toBe(7);
		expect(solutions.solutionsType).toBe('mixed');
	});
});
