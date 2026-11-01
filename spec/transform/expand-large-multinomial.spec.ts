import nerdamer from '../../src/index';
import { powerExpandToArray } from '../../src/core/functions/expand/expand';

describe('Large multinomial expansion', () => {
	it('preserves exact coefficients above the safe integer range', () => {
		const terms = powerExpandToArray(['x', 'y', 'z'], 41);
		const coefficient = terms.find(term => term.powers.join(',') === '13,14,14')?.coefficient;
		expect(coefficient?.toString()).toBe('706857555303576000');
		expect(terms.reduce((total, term) => total + term.coefficient, 0n).toString())
			.toBe('36472996377170786403');
	});

	it('simplifies a smaller multinomial expansion exactly', () => {
		expect(nerdamer('(x+y+z)^8').simplify().evaluate({ x: 1, y: 1, z: 1 }).text())
			.toBe('6561');
	});
});
