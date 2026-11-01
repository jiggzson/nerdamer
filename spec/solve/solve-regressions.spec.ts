import Decimal from 'decimal.js';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { solve } from '../../src/solve/solve';
import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { SolutionSet } from '../../src/solve/classes/SolutionSet';
import { SymbolicSolver } from '../../src/solve/classes/SymbolicSolver';
import { ZeroToZeroPowerError } from '../../src/core/errors';
import { toCommonDenominator } from '../../src/algebra/simplify/ratsimp';

describe('Equation-solving regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/25
	it('solves a circle equation after coordinate substitution', () => {
		const equation = Expression.create('(x-1)^2+(y-1)^2-4', { x: 4 });
		const solutions = nerdamer.solve(equation, 'y');

		expect(solutions.count()).toBe(2);
		for (const solution of solutions.elements) {
			const residual = equation.evaluate({ y: solution }).expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/634
	it('allows simplifying individual solutions from a solution set', () => {
		const solutions = nerdamer.solve('x^2-1', 'x');
		const simplified = solutions.elements.map(root => root.simplify());

		expect(simplified).toHaveLength(2);
		expect(simplified.every(root => root.eq(1) || root.eq(-1))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/55
	it('does not let equation parsing corrupt later solver calls', () => {
		const before = nerdamer.solve('x+1=2', 'x');
		nerdamer('x=1');
		const after = nerdamer.solve('x+1=2', 'x');

		expect(before.text()).toEqual('{1}');
		expect(after.text()).toEqual('{1}');
	});

	it('solves nested reciprocal square roots in relativistic kinetic energy', () => {
		const equation = 'E_k = m c^2 ((1 - v^2 / c^2)^-0.5 - 1)';
		const solutions = nerdamer.solve(equation, 'v');

		expect(solutions.count()).toBe(2);

		const values = { E_k: 1, m: 2, c: 3 };
		const expected =
			values.c *
			Math.sqrt(1 - Math.pow(1 + values.E_k / (values.m * values.c ** 2), -2));
		const evaluated = solutions.elements
			.map(solution => Number(solution.evaluate(values).text({ decimal: true })))
			.sort((a, b) => a - b);

		expect(evaluated[0]).toBeCloseTo(-expected, 12);
		expect(evaluated[1]).toBeCloseTo(expected, 12);
	});

	it('inverts exponential equations with bases independent of the solved variable', () => {
		const baseTen = nerdamer.solve('10^x=y', 'x');
		const natural = nerdamer.solve('e^x=y', 'x');
		const symbolic = nerdamer.solve('n^x=y', 'x');
		const compound = nerdamer.solve('(a+b)^x=y', 'x');

		expect(baseTen.count()).toBe(1);
		expect(natural.count()).toBe(1);
		expect(symbolic.count()).toBe(1);
		expect(compound.count()).toBe(1);
		expect(baseTen.elements[0].minus('log(y)/log(10)').simplify().isZero()).toBe(true);
		expect(natural.elements[0].minus('log(y)').simplify().isZero()).toBe(true);
		expect(symbolic.elements[0].minus('log(y)/log(n)').simplify().isZero()).toBe(true);
		expect(compound.elements[0].minus('log(y)/log(a+b)').simplify().isZero()).toBe(true);
	});

	it('rejects zero-to-zero candidates in variable-base exponent solving', () => {
		expect(() => Expression.create('x^x').evaluate({ x: 0 })).toThrow(
			ZeroToZeroPowerError
		);

		const purePower = nerdamer.solve('x^x', 'x');
		expect(purePower.count()).toBe(0);

		const equalsOne = nerdamer.solve('x^x-1', 'x');
		expect(equalsOne.count()).toBe(1);
		expect(equalsOne.has(Expression.create(1))).toBe(true);

		const equalsSelf = nerdamer.solve('x^x-x', 'x');
		expect(equalsSelf.count()).toBe(1);
		expect(equalsSelf.has(Expression.create(0))).toBe(false);
		expect(equalsSelf.has(Expression.create(1))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/220
	it('solves symbolic rational equations for the denominator variable', () => {
		const solutions = solve(Expression.create('a/(b-1)-c'), 'b');

		expect(solutions.count()).toBe(1);
		const solution = solutions.elements[0];
		expect(solution.evaluate({ a: 6, c: 2 }).text()).toEqual('4');
		expect(solution.evaluate({ a: 5, c: 5 }).text()).toEqual('2');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/233
	it('solves rational equations used as given relations', () => {
		const input = Expression.create('x+x^-1-3');
		const solutions = solve(input, 'x');

		expect(solutions.count()).toBe(2);
		for (const solution of solutions.elements) {
			const residual = input.evaluate({ x: solution.evaluate() }).expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/300
	it('solves a linear equation containing an exact radical without looping', () => {
		const solutions = nerdamer.solve('-5*sqrt(14)-14*x-10', 'x');
		expect(solutions.count()).toBe(1);
		expect(solutions.elements[0].eq(nerdamer('-(5*sqrt(14)+10)/14'))).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/463
	it('solves linear equations with large integer coefficients exactly', () => {
		expect(solve('999999999*K+7', 'K').text()).toEqual('{-7/999999999}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/474
	it('solves an unsimplified rational expression without overflowing the call stack', () => {
		const original =
			'(-K^2/(-K+24)-448/(-K+24)+24*K/(-K+24))^(-1)*' +
			'(-24-3136*(-K+24)^(-1)-7*(-K+24)^(-1)*K^2+168*(-K+24)^(-1)*K+K)';
		const simplified = '8*(K^2-27*K+464)/(K^2-24*K+448)';
		const originalRoots = solve(original, 'K').elements.map(root => root.expand().text()).sort();
		const simplifiedRoots = solve(simplified, 'K').elements.map(root => root.expand().text()).sort();

		expect(originalRoots).toEqual(simplifiedRoots);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/489
	it('solves powers with very large exact denominators', () => {
		const denominator = '1208925819614629174706176';

		expect(solve('a-2^(-80)', 'a').text()).toEqual(`{1/${denominator}}`);
		expect(solve('a-1/2^80', 'a').text()).toEqual(`{1/${denominator}}`);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/491
	it('solves a very large exact rational value without looping', () => {
		const value = '327516697200495501989961250327/3518252998218182862078279';

		expect(solve(`a-${value}`, 'a').text()).toEqual(`{${value}}`);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/495
	it('solves the large-coefficient boundary case exactly', () => {
		const expression = '(93222358/131836323)*(-2*y+549964829/38888386)-10';

		expect(solve(expression, 'y').text()).toEqual('{1/3625267041734188}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/526
	it('does not introduce the excluded denominator zero as a rational-equation root', () => {
		const actual = solve('0=(x^2-2)/(e^x-1)', 'x');
		const positive = Expression.create('sqrt(2)');
		const negative = Expression.create('-sqrt(2)');

		expect(actual.count()).toEqual(2);
		expect(actual.has(positive)).toBe(true);
		expect(actual.has(negative)).toBe(true);
		expect(actual.has(Expression.create(0))).toBe(false);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/527
	it('solves a fixed-base exponential equation symbolically', () => {
		const actual = solve('2^(x+2)=7', 'x');

		expect(actual.count()).toEqual(1);
		expect(actual.elements[0].minus('log(7)/log(2)-2').simplify().isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/541
	it('solves the reported equation containing long registered constant names', () => {
		const constants: Record<string, number> = {
			gross_margin_percentage_fcst_ly_var: 0.03,
			sales_dollars_fcst: 105224064.88000001,
			sales_dollars_ly: 95658240.80000001,
			sales_cost_ly: 23361379.300000004,
		};
		const equation =
			'gross_margin_percentage_fcst_ly_var=((sales_dollars_fcst-sales_cost_fcst)/sales_dollars_fcst)-((sales_dollars_ly-sales_cost_ly)/sales_dollars_ly)';

		try {
			for (const [name, value] of Object.entries(constants)) {
				nerdamer.setConstant(name, value);
			}

			const solutions = solve(equation, 'sales_cost_fcst');
			expect(solutions.count()).toEqual(1);

			const residual = Expression.create(
				'gross_margin_percentage_fcst_ly_var-((sales_dollars_fcst-sales_cost_fcst)/sales_dollars_fcst)+((sales_dollars_ly-sales_cost_ly)/sales_dollars_ly)',
				{ sales_cost_fcst: solutions.elements[0] }
			).evaluate();
			expect(Number(residual.text({ decimal: true }))).toBeCloseTo(0, 12);
		} finally {
			for (const name of Object.keys(constants)) {
				nerdamer.setConstant(name, 'delete');
			}
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/555
	it('does not return a denominator singularity as the solution of 1/x=0', () => {
		expect(nerdamer.solve('1/x', 'x').text()).toEqual('{}');
		expect(nerdamer.solve('1/x=0', 'x').text()).toEqual('{}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/556
	it('solves a linear equation containing pi for either variable', () => {
		const xSolutions = nerdamer.solve('4*x+2*y*pi=2', 'x');
		const ySolutions = nerdamer.solve('4*x+2*y*pi=2', 'y');

		expect(xSolutions.count()).toEqual(1);
		expect(ySolutions.count()).toEqual(1);
		expect(xSolutions.elements[0].minus('(2-2*y*pi)/4').simplify().isZero()).toBe(true);
		expect(ySolutions.elements[0].minus('(2-4*x)/(2*pi)').simplify().isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/585
	it('preserves digits and underscores in variable names while solving', () => {
		const solutions = nerdamer.solve('foo__16_bar=foo__16-bar__16', 'foo__16');

		expect(solutions.count()).toEqual(1);
		expect(solutions.elements[0].minus('foo__16_bar+bar__16').simplify().isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/589
	it('solves through a long decimal constant without hanging', () => {
		const solutions = nerdamer.solve(
			'bop_auc___plan=eop_cost___plan/3416.3333333333344',
			'eop_cost___plan'
		);

		expect(solutions.count()).toEqual(1);
		expect(
			solutions.elements[0]
				.minus('3416.3333333333344*bop_auc___plan')
				.simplify()
				.isZero()
		).toBe(true);
	}, 15_000);

	// Regression: https://github.com/jiggzson/nerdamer/issues/600
	it('solves an equivalent tangent quotient consistently', () => {
		const direct = nerdamer.solve('tan(b)=c', 'b');
		const quotient = nerdamer.solve('sin(b)/cos(b)=c', 'b');

		expect(direct.count()).toEqual(1);
		expect(quotient.count()).toEqual(1);
		expect(direct.solutionForm).toBe('parametric');
		expect(quotient.solutionForm).toBe('parametric');
		expect(quotient.elements[0].eq(direct.elements[0])).toBe(true);

		for (const index of [-2, -1, 0, 1, 2]) {
			const b = quotient.elements[0].subst('_n', index).evaluate({ c: '1/2' });
			const residual = Expression.create('sin(b)/cos(b)-1/2', { b }).evaluate();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/633
	it('solves log(y)=-t and verifies the real principal-log branch', () => {
		const solutions = nerdamer.solve('log(y)=-t', 'y');

		expect(solutions.count()).toEqual(1);
		expect(solutions.elements[0].eq('e^(-t)')).toBe(true);
		for (const t of [-2, 0, 2]) {
			const y = solutions.elements[0].evaluate({ t });
			const residual = Expression.create('log(y)+t', { y, t }).evaluate();
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/4
	it('finds both real roots when the solve variable also appears in an exponent', () => {
		const solutions = nerdamer.solve('x=2^x/4', 'x');
		const roots = solutions.elements
			.map(solution => Number(solution.evaluate().text({ decimal: true })))
			.sort((a, b) => a - b);

		expect(roots).toHaveLength(2);
		expect(roots[0]).toBeCloseTo(0.309906932380691, 12);
		expect(roots[1]).toBeCloseTo(4, 12);
		const source = Expression.create('x-2^x/4');
		for (const x of roots) {
			const residual = source.evaluate({ x });
			expect(residual.isNearlyZero()).toBe(true);
		}
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/133
	it('does not accept a false Newton convergence cycle', () => {
		const solver = new FunctionSolver('x^3-x', 'x', {
			method: 'NewtonRaphson',
			maxIterations: 1,
		});
		const initialGuess = new Decimal(1).div(new Decimal(5).sqrt());
		const result = solver.NewtonRaphson(initialGuess);

		expect(result.converged).toBe(false);
		expect(result.error.greaterThan(solver.tolerance)).toBe(true);
		expect(solver.evaluate(result.root).abs().greaterThan(new Decimal('1e-12'))).toBe(true);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/129
	it('rejects candidates that do not satisfy the source equation', () => {
		const rejected = new SolutionSet();
		rejected.addSolution(Expression.create('2'), Expression.create('x^2-1'), 'x');
		rejected.addSolution(Expression.create('0'), Expression.create('x^2-1'), 'x');
		rejected.addSolution(Expression.create('0'), Expression.create('x+sin(i)'), 'x');
		expect(rejected.text()).toEqual('{}');

		const accepted = new SolutionSet();
		accepted.addSolution(Expression.create('1'), Expression.create('x^2-1'), 'x');
		accepted.addSolution(Expression.create('a'), Expression.create('x^2-a^2'), 'x');
		expect(accepted.text()).toEqual('{1, a}');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/128
	it('returns no solution when cancellation leaves a contradiction', () => {
		expect(nerdamer.solve('x+2=x+3', 'x').text()).toEqual('{}');
		expect(nerdamer.solveeqs(['x+2=x+3']).text()).toEqual('[]');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/595
	it('keeps numerical roots when the terminal scan endpoint is outside the real domain', () => {
		const solutions = nerdamer.solve(
			'0=((2*0.87*x-2*sqrt(x^2(0.87^2-1)+4*4^2))/2)^2+((2*0.86*x-2*sqrt(x^2(0.86^2-1)+4*5^2))/2)^2-0.87*((2*0.87*x-2*sqrt(x^2(0.87^2-1)+4*4^2))/2)*((2*0.86*x-2*sqrt(x^2(0.86^2-1)+4*5^2))/2)-6^2',
			'x'
		);
		const roots = solutions.elements
			.map(solution => Number(solution.evaluate().text({ decimal: true })))
			.sort((a, b) => a - b);

		expect(roots).toHaveLength(2);
		expect(roots[0]).toBeCloseTo(3.9, 1);
		expect(roots[1]).toBeCloseTo(13.0, 1);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/588
	it('normalizes nested rational denominators before solving', () => {
		const derivative = nerdamer.diff('10-110/(20-100/(10+x))-x', 'x');
		const normalized = toCommonDenominator(derivative);
		const numerator = normalized.getNumerator().expand();
		const denominator = normalized.getDenominator().expand();

		expect(numerator.isPolynomialLike()).toBe(true);
		expect(denominator.isPolynomialLike()).toBe(true);
		expect(
			numerator
				.times('2*(x+5)^2')
				.minus(denominator.times('5-20*x-2*x^2'))
				.expand()
				.isZero()
		).toBe(true);

		const symbolic = new SymbolicSolver(numerator, 'x').solve();
		expect(symbolic.unsolved).toBeUndefined();
		expect(symbolic.solutions).toHaveLength(2);

		const solutions = nerdamer.solve(derivative, 'x');
		expect(solutions.count()).toEqual(2);
		for (const root of symbolic.solutions) {
			expect(solutions.elements.some(solution => solution.eq(root))).toBe(true);
		}

		const roots = solutions.elements
			.map(solution => Number(solution.evaluate().text({ decimal: true })))
			.sort((a, b) => a - b);
		expect(roots[0]).toBeCloseTo(-5 - Math.sqrt(55 / 2), 10);
		expect(roots[1]).toBeCloseTo(-5 + Math.sqrt(55 / 2), 10);

		for (const solution of solutions.elements) {
			expect(derivative.evaluate({ x: solution }).isNearlyZero()).toBe(true);
			expect(solution.eq('-10')).toBe(false);
			expect(solution.eq('-5')).toBe(false);
		}

		// Normalization may cancel a source denominator, but the solver must still
		// reject a root at a point where the original equation is undefined.
		expect(nerdamer.solve('(x-1)/(1-1/x)=1', 'x').text()).toEqual('{}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/679
	it('solves a symbolic equation even when a trailing subtraction is present', () => {
		const solutions = nerdamer.solve(
			'T=v*F*((((1+tr)^n-1)/tr)-1)',
			'T'
		);
		expect(solutions.count()).toEqual(1);
		const expected = Expression.create('v*F*((((1+tr)^n-1)/tr)-1)');
		expect(solutions.elements[0].minus(expected).simplify().text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/670
	it('does not introduce x=0 when solving y(x+1)=0 for x', () => {
		expect(nerdamer.solve('x*y+y=0', 'x').text()).toEqual('{-1}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/671
	it('handles whitespace consistently while isolating a variable', () => {
		const solutions = nerdamer.solve('A = B + C * D / 100', 'A');
		const parenthesized = nerdamer.solve('A = B + C * (D / 100)', 'A');
		expect(solutions.count()).toEqual(1);
		expect(parenthesized.count()).toEqual(1);
		expect(parenthesized.elements[0].eq(solutions.elements[0])).toBe(true);
		expect(
			solutions.elements[0].eq('(-1/100)*(-100*B-C*D)')
		).toBe(true);
		expect(nerdamer.solve('A * B = C + D', 'A').text()).toEqual('{-B^-1*(-C-D)}');
		expect(nerdamer.solve('A = B + C - D', 'A').text()).toEqual('{-(-B-C+D)}');
	});

	// Regressions:
	// https://github.com/together-science/nerdamer-prime/issues/131
	// https://github.com/jiggzson/nerdamer/issues/636
	it('clears rational denominators without aborting at a trial singularity', () => {
		const decimalSystem = nerdamer.solveeqs([
			'x=5',
			'0.6=1-(x/(10+y))',
		]);
		expect(decimalSystem.text()).toEqual('[{x => 5, y => 2.5}]');

		const exactSystem = nerdamer.solveeqs(['x=5', '3/5=1-x/(10+y)']);
		expect(exactSystem.text()).toEqual('[{x => 5, y => 5/2}]');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/77
	it('solves radical equations and verifies all branches', () => {
		const solutions = nerdamer.solve('sqrt(x)-2*x+x^2', 'x');
		expect(solutions.count()).toEqual(3);
		const expected = ['(1/2)*(3-5^(1/2))', '0', '1'].map(root =>
			Expression.create(root)
		);
		for (const root of expected) {
			expect(
				solutions.elements.some(solution => solution.minus(root).simplify().isZero())
			).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/677
	it('solves mixed linear and absolute-value equations', () => {
		const solutions = nerdamer.solve(
			'x+0.0025*(abs(0-x)+abs(0-x))=105.8241145033',
			'x'
		);
		expect(solutions.count()).toEqual(1);
		const x = Number(solutions.elements[0].evaluate().text({ decimal: true }));
		expect(Math.abs(x - 105.29762637144279)).toBeLessThan(1e-10);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/655
	it('isolates and verifies radicals when solving for another variable', () => {
		// Unrestricted x makes the principal-root branch parameter-dependent, so use a
		// closed positive value and require the squared equation's extra root to be rejected.
		const solutions = nerdamer.solve('4+y+sqrt(4*y)=19', 'y');
		expect(solutions.text()).toEqual('{9}');
		for (const solution of solutions.elements) {
			const residual = Expression.create('4+y+sqrt(4*y)-19', {
				y: solution,
			}).simplify();
			expect(residual.isZero()).toBe(true);
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/405
	it('solves x-sqrt(x+1)=5 and verifies the radical branch', () => {
		expect(nerdamer.solve('x-sqrt(x+1)=5', 'x').text()).toEqual('{8}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/405
	it('rejects extraneous logarithmic roots introduced by transformations', () => {
		expect(
			nerdamer.solve('log(x-1)+log(x+3)+log(3)=log(15)', 'x').text()
		).toEqual('{2}');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/405
	it('solves simple linear equations over complex values and verifies candidates', () => {
		const first = nerdamer.solve('(z+5)/(3-i)=2-5*i', 'z');
		expect(first.text()).toEqual('{-4-17*i}');
		expect(
			Expression.create('(z+5)/(3-i)-(2-5*i)', { z: first.elements[0] }).isNearlyZero()
		).toBe(true);

		const second = nerdamer.solve('5-7*i+(3-11*i)*z=7-6*i', 'z');
		expect(second.text()).toEqual('{-1/26+(5/26)*i}');
		expect(
			Expression.create('5-7*i+(3-11*i)*z-(7-6*i)', {
				z: second.elements[0],
			}).isNearlyZero()
		).toBe(true);
	});

	// Regressions:
	// https://github.com/together-science/nerdamer-prime/issues/16
	// https://github.com/jiggzson/nerdamer/issues/395
	it('inverts arbitrary-base exponentials', () => {
		const solution = nerdamer.solve('10^x=40', 'x');
		expect(solution.count()).toEqual(1);
		const expected = Expression.create('log(40)/log(10)');
		expect(solution.elements[0].minus(expected).simplify().text()).toEqual('0');
	});
});
