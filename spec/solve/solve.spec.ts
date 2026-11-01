import '../helpers/registerNerdamerFunctions';

import Decimal from 'decimal.js';
import { FunctionSolver } from '../../src/solve/classes/FunctionSolver';
import { PolynomialSolver } from '../../src/solve/classes/PolynomialSolver';

describe('Roots', () => {
	it('should calculate numeric roots of polynomials', () => {
		const highDegreeRoots = new PolynomialSolver(
			'3*x^20+3x^19-6*x^11+14*x^5-2*x-1'
		)
			.roots()
			.map(root => root.text())
			.sort();
		const expectedHighDegreeRoots =
			'0.71180323272376606667,0.86297656851958989314+0.69101055878558665576*i,0.50481153548365240247+0.89598562919130138041*i,0.080968713699173314951+1.1214549517445542477*i,0.093661835614056869494+0.6509667616114832967*i,-0.44418743097335200181+0.98010396118523725535*i,-0.7744329782811023431+0.84403756595086305687*i,-0.44889018238852665819+0.17504855683342571643*i,-1.1913449820257302616+0.38393926634205905678*i,-1.116835417848109669,-1.1913449820257302616-0.38393926634205905678*i,-0.7744329782811023431-0.84403756595086305687*i,0.093661835614056869494-0.6509667616114832967*i,-0.44418743097335200181-0.98010396118523725535*i,0.080968713699173314951-1.1214549517445542477*i,0.50481153548365240247-0.89598562919130138041*i,-0.44889018238852665819-0.17504855683342571643*i,0.86297656851958989314-0.69101055878558665576*i,1.0189530129144105859-0.18773494685369583385*i,1.0189530129144105859+0.18773494685369583385*i'
			.split(',')
			.sort();

		expect(highDegreeRoots).toEqual(expectedHighDegreeRoots);
		expect(new PolynomialSolver('(2*x+3)(5x-1)').roots().toString()).toEqual('0.2,-1.5');
		expect(new PolynomialSolver('x^3+1').roots().toString()).toEqual(
			'0.5+0.86602540378443864676*i,-1,0.5-0.86602540378443864676*i'
		);
		expect(new PolynomialSolver('(x^2-1)(x^2+1)').roots().toString()).toEqual('1,i,-1,-i');
	});

	it('should preserve nonzero leading coefficients below the convergence tolerance', () => {
		const roots = new PolynomialSolver('0.00000000000000000001*x+1').roots(false);

		expect(roots).toHaveLength(1);
		expect(roots[0].re.eq('-1e20')).toBe(true);
		expect(roots[0].im.isZero()).toBe(true);
	});

	it('should preserve nonzero root components below the convergence tolerance', () => {
		const roots = new PolynomialSolver('x-0.00000000000000000001').roots();

		expect(roots).toHaveLength(1);
		expect(roots[0].eq('0.00000000000000000001')).toBe(true);
	});

	it('should preserve nonzero quadratic discriminants below the convergence tolerance', () => {
		const roots = new PolynomialSolver('x^2-0.00000000000000000001').roots(false);

		expect(roots).toHaveLength(2);
		expect(roots[0].re.eq('0.0000000001')).toBe(true);
		expect(roots[0].im.isZero()).toBe(true);
		expect(roots[1].re.eq('-0.0000000001')).toBe(true);
		expect(roots[1].im.isZero()).toBe(true);
	});

	it('should preserve small imaginary components in analytic quadratic roots', () => {
		const roots = new PolynomialSolver([
			new Decimal('1.0000000000000000000000000000000000000001'),
			new Decimal(-2),
			new Decimal(1),
		]).roots();

		expect(roots).toHaveLength(2);
		expect(roots[0].realPart().eq(1)).toBe(true);
		expect(roots[0].imagPart().eq('0.00000000000000000001')).toBe(true);
		expect(roots[1].realPart().eq(1)).toBe(true);
		expect(roots[1].imagPart().eq('-0.00000000000000000001')).toBe(true);
	});

	it("should calculate numeric roots of functions using Brent's method", () => {
		expect(
			new FunctionSolver('sin(x)', 'x', { lowerBound: -10, upperBound: 10, method: 'Brent' })
				.roots()
				.toString()
		).toEqual(
			'-9.4247779607693798746,-6.2831853071795864769,-3.1415926535897932516,0,3.1415926535897932384,6.2831853071795864412,9.4247779607693797154'
		);
		expect(
			new FunctionSolver('(2*x+3)(5x-1)', 'x', { method: 'Brent' }).roots().toString()
		).toEqual('-1.5,0.2');
		expect(new FunctionSolver('2^x-1', 'x', { method: 'Brent' }).roots().toString()).toEqual(
			'0'
		);
	});

	it("should calculate numeric roots of functions using NewtonRaphson's method", () => {
		expect(
			new FunctionSolver('sin(x)', 'x', {
				lowerBound: -10,
				upperBound: 10,
				method: 'NewtonRaphson',
			})
				.roots()
				.toString()
		).toEqual(
			'-9.4247779607693797154,-6.2831853071795864769,-3.1415926535897932385,0,3.1415926535897932385,6.2831853071795864769,9.4247779607693797154'
		);
		expect(
			new FunctionSolver('(2*x+3)(5x-1)', 'x', { method: 'NewtonRaphson' }).roots().toString()
		).toEqual('-1.5,0.2');
		expect(
			new FunctionSolver('2^x-1', 'x', { method: 'NewtonRaphson' }).roots().toString()
		).toEqual('0');
	});

	it('should limit the number of roots', () => {
		expect(new FunctionSolver('sin(x)', 'x', { maxRoots: 3 }).roots().toString()).toEqual(
			'-3.1415926535897932516,0,3.1415926535897932384'
		);
		expect(new FunctionSolver('(2*x+3)(5x-1)').roots().toString()).toEqual(
			'-1.5,0.2'
		);
		expect(new FunctionSolver('log(x)').roots().toString()).toEqual('1');
		expect(new FunctionSolver('tan(x^2)+x', 'x', { maxRoots: 7 }).roots().toString()).toEqual(
			'-3.2709132513114817947,-2.739335850647753876,-2.0642857202996469251,-0.83360619440667797945,0,1.4722278817778812509,2.2645584185768777436'
		);
	});

	it('should throw for invalid input', () => {
		expect(() => new FunctionSolver('x^2-y')).toThrow();
		expect(() => new PolynomialSolver('1/x+x')).toThrow();
	});
});

