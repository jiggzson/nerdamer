import nerdamer from '../../src/index';
import { solveSystem } from '../../src/solve/solveSystem';

describe('legacy #645 absolute-value systems', () => {
	// Polynomial constraints supply candidates, while every original equation remains binding.
	it('solves a compatible absolute-value and polynomial system', () => {
		const results = solveSystem(['abs(x)=8', 'x^2=64']);
		expect(results.count()).toBe(2);
		expect(results.elements.map(value => value.text()).sort()).toEqual([
			'{x => -8}',
			'{x => 8}',
		]);
	});

	it('exposes the same results through the parser system API', () => {
		const results = nerdamer('solveeqs([abs(x)=8,x^2=64])');
		expect(results.text()).toContain('{x => -8}');
		expect(results.text()).toContain('{x => 8}');
	});

	it('rejects polynomial candidates violating an absolute-value constraint', () => {
		expect(solveSystem(['abs(x)=7', 'x^2=64']).count()).toBe(0);
	});

	it('checks non-polynomial constraints in a multivariable system', () => {
		const results = solveSystem(['abs(x)=8', 'x^2=64', 'y-x=0']);
		expect(results.elements.map(value => value.text()).sort()).toEqual([
			'{x => -8, y => -8}',
			'{x => 8, y => 8}',
		]);
	});
});
