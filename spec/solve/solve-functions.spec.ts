import '../helpers/registerNerdamerFunctions';

import { Expression } from '../../src/core/classes/expression/Expression';
import { solve } from '../../src/solve/solve';

function expectPeriodicSolutions(source: string, families: number): void {
	const solutions = solve(source, 'x');
	expect(solutions.solutionForm).toBe('parametric');
	expect(solutions.count()).toBe(families);

	for (const root of solutions.elements) {
		for (const n of [-2, -1, 0, 1, 2]) {
			const candidate = root.subst('_n', n);
			const residual = Expression.create(source).subst('x', candidate).evaluate().expand();
			expect(residual.isNearlyZero()).toBe(true);
		}
	}
}

describe('Solve Functions', () => {
	it('should solve sin(x) = 0', () => {
		expect(solve('sin(x)', 'x').text()).toEqual('{_n*pi}');
	});

	it('should solve cos(x) = 0', () => {
		expect(solve('cos(x)', 'x').text()).toEqual('{(1/2)*pi*(1+2*_n)}');
	});

	it('should solve tan(x) = 0', () => {
		expect(solve('tan(x)', 'x').text()).toEqual('{_n*pi}');
	});

	it('should solve sin with linear argument', () => {
		expect(solve('sin(2*x+1)', 'x').text()).toEqual('{(-1/2)*(1-_n*pi)}');
	});

	it('should solve log(x) = 0', () => {
		expect(solve('log(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve sinh(x) = 0', () => {
		expect(solve('sinh(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve tanh(x) = 0', () => {
		expect(solve('tanh(x)', 'x').text()).toEqual('{0}');
	});
	it('should solve asin(x) = 0', () => {
		expect(solve('asin(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve acos(x) = 0', () => {
		expect(solve('acos(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve atan(x) = 0', () => {
		expect(solve('atan(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve cot(x) = 0', () => {
		expect(solve('cot(x)', 'x').text()).toEqual('{(1/2)*pi*(1+2*_n)}');
	});

	it('should solve asec(x) = 0', () => {
		expect(solve('asec(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve asinh(x) = 0', () => {
		expect(solve('asinh(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve acosh(x) = 0', () => {
		expect(solve('acosh(x)', 'x').text()).toEqual('{1}');
	});

	it('should solve atanh(x) = 0', () => {
		expect(solve('atanh(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve abs(x) = 0', () => {
		expect(solve('abs(x)', 'x').text()).toEqual('{0}');
	});

	it('should solve inverse trig with linear argument', () => {
		expect(solve('asin(2*x+1)', 'x').text()).toEqual('{-1/2}');
		expect(solve('acos(x-3)', 'x').text()).toEqual('{4}');
	});

	it('should solve abs with linear argument', () => {
		expect(solve('abs(x-5)', 'x').text()).toEqual('{5}');
	});

	it('should solve sin(x) = c', () => {
		expectPeriodicSolutions('sin(x)-1/2', 2);
	});

	it('should solve cos(x) = c', () => {
		expectPeriodicSolutions('cos(x)-1/2', 2);
	});

	it('should solve tan(x) = c', () => {
		expectPeriodicSolutions('tan(x)-1', 1);
		const root = solve('tan(x)-1', 'x').at(0);
		if (!root) throw new Error('Expected tangent solution family');
		expect(root.subst('_n', 0).eq('pi/4')).toBe(true);
		expect(root.subst('_n', 1).minus(root.subst('_n', 0)).eq('pi')).toBe(true);
	});

	it('should solve cot(x) = c', () => {
		expectPeriodicSolutions('cot(x)-1', 1);
		const root = solve('cot(x)-1', 'x').at(0);
		if (!root) throw new Error('Expected cotangent solution family');
		expect(root.subst('_n', 0).eq('pi/4')).toBe(true);
		expect(root.subst('_n', 1).minus(root.subst('_n', 0)).eq('pi')).toBe(true);
	});

	it('should solve log(x) = c', () => {
		expect(solve('log(x)-3', 'x').text()).toEqual('{e^3}');
	});

	it('should solve abs(x) = c', () => {
		expect(solve('abs(x)-5', 'x').text()).toEqual('{5, -5}');
	});

	it('should solve a*sin(x) = c', () => {
		expectPeriodicSolutions('2*sin(x)-1', 2);
	});

	it('should solve sin(x)^2 = c', () => {
		const source = 'sin(x)^2-1/4';
		expectPeriodicSolutions(source, 4);
		const atZero = solve(source, 'x').elements.map(root => root.subst('_n', 0));
		for (const expected of ['pi/6', '5*pi/6', '-pi/6', '7*pi/6']) {
			expect(atZero.some(root => root.minus(Expression.create(expected)).expand().isZero()))
				.toBe(true);
		}
	});

	it('should solve asin(x) = c', () => {
		expect(solve('asin(x)-pi/6', 'x').text()).toEqual('{1/2}');
	});

	it('should solve sinh(x) = c', () => {
		expect(solve('sinh(x)-1', 'x').text()).toEqual('{asinh(1)}');
	});

	it('should solve sin with composite argument and constant', () => {
		expectPeriodicSolutions('sin(2*x)-1/2', 2);
	});

	it('should solve e^x = c', () => {
		expect(solve('e^x-3', 'x').text()).toEqual('{log(3)}');
	});

	it('should solve cos(x) = 1', () => {
		expectPeriodicSolutions('cos(x)-1', 1);
	});

	it('should solve sin(x) = 1', () => {
		expectPeriodicSolutions('sin(x)-1', 1);
	});

	it('should solve e^(2*x) = c', () => {
		expect(solve('e^(2*x)-5', 'x').text()).toEqual('{(1/2)*log(5)}');
	});

	it('should solve a*e^x = c', () => {
		expect(solve('3*e^x-6', 'x').text()).toEqual('{log(2)}');
	});

	it('should solve log with composite argument and constant', () => {
		expect(solve('log(x+1)-2', 'x').text()).toEqual('{-(1-e^2)}');
	});
});

