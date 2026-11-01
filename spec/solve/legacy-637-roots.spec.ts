import nerdamer from '../../src/index';
import { PolynomialSolver } from '../../src/solve/classes/PolynomialSolver';

describe('legacy #637 high-degree roots', () => {
	// All twelve roots of unity must survive numerical and symbolic collection.
	it('retains all roots from numerical iteration', () => {
		expect(new PolynomialSolver('z^12-1', 'z').roots(false)).toHaveLength(12);
	});

	it('retains all roots after numerical validation', () => {
		expect(new PolynomialSolver('z^12-1', 'z').validatedRoots(false)).toHaveLength(12);
	});

	it('keeps every exact root through public factor solving', () => {
		const roots = nerdamer.solve('z^12-1', 'z');
		expect(roots.count()).toBe(12);
		expect(roots.solutionsType).toBe('symbolic');
	});

	it('retains all roots in the numerical roots API', () => {
		expect(nerdamer.roots('z^12-1', 'z').count()).toBe(12);
	});
});
