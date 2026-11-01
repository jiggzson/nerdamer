import Decimal from 'decimal.js';

import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Rational } from '../../src/core/classes/rational/Rational';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { solve } from '../../src/solve/solve';

function expectSmallResiduals(input: string, roots: Expression[]) {
	const expression = Expression.create(input);
	for (const root of roots) {
		expect(expression.evaluate({ x: root }).isNearlyZero()).toBe(true);
	}
}

describe('inferred numerical function bounds', () => {
	it('finds a numerical root outside the default interval', () => {
		const input = 'x+sin(x)-200';
		const solutions = solve(input, 'x');

		expect(solutions.count()).toBe(1);
		expect(solutions.solutionsType).toBe('numeric');
		expect(Number(solutions.elements[0].text())).toBeCloseTo(200.5177319817345, 12);
		expectSmallResiduals(input, solutions.elements);
	});

	it.each<[string, string, number, number]>([
		['2*x-100+cos(x)', '49.605116192381885', 49.5, 50.5],
		['-2*x+100+cos(x+1)', '50.26876754484467', 49.5, 50.5],
		['2*x-100+3*cos(x)', '49.232111276926914', 48.5, 51.5],
		['3*x-300+2*sin(2*x+1)-cos(x-4)', '99.99289625477482', 99, 101],
	])('supports slopes, phases, and multiple bounded trig terms: %s', (
		input,
		expectedRoot,
		lower,
		upper
	) => {
		const solutions = solve(input, 'x');

		expect(solutions.count()).toBeGreaterThan(0);
		expect(solutions.solutionsType).toBe('numeric');
		for (const root of solutions.elements) {
			const value = Number(root.text());
			expect(value).toBeGreaterThanOrEqual(lower);
			expect(value).toBeLessThanOrEqual(upper);
		}
		expect(
			solutions.elements.some(root =>
				Math.abs(Number(root.text()) - Number(expectedRoot)) < 1e-12
			)
		).toBe(true);
		expectSmallResiduals(input, solutions.elements);
	});

	it('preserves multiple roots found inside a certified enclosure', () => {
		const input = '0.1*x+sin(x)';
		const rootExpressions = solve(input, 'x').elements;
		const roots = rootExpressions
			.map(root => Number(root.text()))
			.sort((a, b) => a - b);

		expect(roots).toHaveLength(5);
		expect(roots[0]).toBeCloseTo(-5.6792077963144, 12);
		expect(roots[1]).toBeCloseTo(-3.49906381990776, 12);
		expect(roots[2]).toBeCloseTo(0, 12);
		expect(roots[3]).toBeCloseTo(3.49906381990776, 12);
		expect(roots[4]).toBeCloseTo(5.6792077963144, 12);
		expectSmallResiduals(input, rootExpressions);
	});

	it.each([
		['x-sin(x)+0.035-0.035*cos(x)', 0],
		['x-1-sin(x-1)+0.035-0.035*cos(x-1)', 1],
	])('preserves a tangential root on the default scan lattice: %s', (input, tangent) => {
		const solutions = solve(input, 'x');

		expect(solutions.elements.some(root => root.minus(tangent).abs().isNearlyZero())).toBe(true);
		expectSmallResiduals(input, solutions.elements);
	});

	it('keeps roots on exact and repeating-rational enclosure boundaries', () => {
		const rootsImplementation = FunctionSolver.prototype.roots;
		const observedBounds: { lower: Rational; upper: Rational }[] = [];
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots')
			.mockImplementation(function (this: FunctionSolver) {
				observedBounds.push({
					lower: Rational.create(this.lowerBound.toString()),
					upper: Rational.create(this.upperBound.toString()),
				});
				return rootsImplementation.call(this);
			});

		try {
			const lowerBoundary = solve('x-1+cos(x)', 'x');
			const upperBoundary = solve('x+2/3-cos(x-1/3)', 'x');

			expect(lowerBoundary.elements.some(root => root.isZero())).toBe(true);
			expect(
				upperBoundary.elements.some(root => root.minus('1/3').abs().isNearlyZero())
			).toBe(true);
			expect(observedBounds).toHaveLength(2);
			expect(observedBounds[0].lower.lte(Rational.create(0n))).toBe(true);
			expect(observedBounds[0].upper.gte(Rational.create(0n))).toBe(true);
			expect(observedBounds[1].lower.lte(Rational.create('1/3'))).toBe(true);
			expect(observedBounds[1].upper.gte(Rational.create('1/3'))).toBe(true);
			// Both exact enclosures have width 2; allow lattice alignment without accepting defaults.
			for (const { lower, upper } of observedBounds) {
				expect(upper.minus(lower).lt(Rational.create(3n))).toBe(true);
			}
		} finally {
			rootsSpy.mockRestore();
		}
	});

	it('rounds negative and large rational enclosure endpoints outward', () => {
		const observedBounds: { lower: Rational; upper: Rational }[] = [];
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots')
			.mockImplementation(function (this: FunctionSolver) {
				observedBounds.push({
					lower: Rational.create(this.lowerBound.toString()),
					upper: Rational.create(this.upperBound.toString()),
				});
				return [];
			});
		const cases = [
			{
				input: 'x-2/3+cos(x+1/3)',
				lower: Rational.create('-1/3'),
				upper: Rational.create('5/3'),
			},
			{
				input: 'x-(100000000000000000000/3+1)+cos(x-100000000000000000000/3)',
				lower: Rational.create('100000000000000000000/3'),
				upper: Rational.create('100000000000000000006/3'),
			},
		];

		try {
			for (const { input, lower, upper } of cases) {
				solve(input, 'x');
				const observed = observedBounds.at(-1);
				expect(observed).toBeDefined();
				if (!observed) {
					throw new Error('Expected inferred numerical bounds');
				}
				expect(observed.lower.lte(lower)).toBe(true);
				expect(observed.upper.gte(upper)).toBe(true);
			}
		} finally {
			rootsSpy.mockRestore();
		}
	});

	it('rejects unsupported shapes and retains the default interval', () => {
		const observedBounds: string[][] = [];
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots')
			.mockImplementation(function (this: FunctionSolver) {
				observedBounds.push([
					this.lowerBound.toString(),
					this.upperBound.toString(),
				]);
				return [];
			});
		const brentSpy = jest.spyOn(FunctionSolver.prototype, 'Brent');

		try {
			for (const input of [
				'x+sin(x^2)-200',
				'x+x*sin(x)-200',
				'x+sin(1/x)-200',
				'x+tan(x)-200',
			]) {
				solve(input, 'x');
			}

			expect(observedBounds).toEqual(new Array(4).fill(['-100', '100']));
			expect(brentSpy).not.toHaveBeenCalled();
		} finally {
			brentSpy.mockRestore();
			rootsSpy.mockRestore();
		}
	});

	it('uses inferred bounds through factor, numerator, and exclusion paths', () => {
		const product = solve('(x+sin(x)-200)*(x-1)', 'x');
		const quotient = solve('(x+sin(x)-200)/(x-201)', 'x');
		const excludedBoundary = solve('(x-1+cos(x))/x', 'x');

		expect(product.count()).toBe(2);
		expect(product.elements.some(root => root.eq(1))).toBe(true);
		const inferredRoot = product.elements.find(root => !root.eq(1));
		expect(inferredRoot).toBeDefined();
		if (!inferredRoot) {
			throw new Error('Expected the inferred bounded-trig root');
		}
		expect(Number(inferredRoot.text())).toBeCloseTo(Number('200.51773198173452'), 12);
		expectSmallResiduals('(x+sin(x)-200)*(x-1)', product.elements);
		expect(quotient.count()).toBe(1);
		expect(Number(quotient.elements[0].text())).toBeCloseTo(
			Number('200.51773198173452'),
			12
		);
		expect(quotient.elements[0].eq(201)).toBe(false);
		expectSmallResiduals('(x+sin(x)-200)/(x-201)', quotient.elements);
		expect(excludedBoundary.text()).toBe('{}');
	});

	it('does not execute the function fallback for exact and polynomial controls', () => {
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots');
		const brentSpy = jest.spyOn(FunctionSolver.prototype, 'Brent');

		try {
			expect(solve('(1/2000)*x-1', 'x').elements[0].eq(2000)).toBe(true);
			const polynomial = solve('x^5+x+1', 'x');
			expect(polynomial.count()).toBe(5);
			expectSmallResiduals('x^5+x+1', polynomial.elements);
			expect(rootsSpy).not.toHaveBeenCalled();
			expect(brentSpy).not.toHaveBeenCalled();
		} finally {
			brentSpy.mockRestore();
			rootsSpy.mockRestore();
		}
	});

	it('retains the default scan when an inferred non-monotone scan exceeds its budget', () => {
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots')
			.mockImplementation(function (this: FunctionSolver) {
				expect(this.lowerBound.eq(-100)).toBe(true);
				expect(this.upperBound.eq(100)).toBe(true);
				return [];
			});

		try {
			expect(solve('0.001*x-200+sin(x)', 'x').text()).toBe('{}');
			expect(rootsSpy).toHaveBeenCalledTimes(1);
		} finally {
			rootsSpy.mockRestore();
		}
	});

	it('rechecks the scan budget after aligning an inferred interval', () => {
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots')
			.mockImplementation(function (this: FunctionSolver) {
				expect(this.lowerBound.eq(-100)).toBe(true);
				expect(this.upperBound.eq(100)).toBe(true);
				return [];
			});

		try {
			expect(solve('0.01*x-0.00035+sin(x)', 'x').text()).toBe('{}');
			expect(rootsSpy).toHaveBeenCalledTimes(1);
		} finally {
			rootsSpy.mockRestore();
		}
	});

	it('rejects a converged Brent candidate whose residual is too large', () => {
		const brentSpy = jest.spyOn(FunctionSolver.prototype, 'Brent').mockReturnValue({
			root: new Decimal(0),
			iterations: 1,
			converged: true,
			error: new Decimal(0),
		});
		const rootsSpy = jest.spyOn(FunctionSolver.prototype, 'roots').mockReturnValue([]);

		try {
			expect(solve('2*x-100+cos(x)', 'x').text()).toBe('{}');
			expect(brentSpy).toHaveBeenCalledTimes(1);
			expect(rootsSpy).toHaveBeenCalledTimes(1);
		} finally {
			rootsSpy.mockRestore();
			brentSpy.mockRestore();
		}
	});
});
