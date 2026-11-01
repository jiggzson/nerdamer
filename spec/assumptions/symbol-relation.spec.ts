import '../../src/api/parser';
import { parseSymbolRelation } from '../../src/core/classes/assumption/symbolRelation';

/** Checks plain-symbol normalization without changing assumption state. */
describe('symbol relationship representation', () => {
	it.each([
		['x>y', { left: 'x', operator: '>', right: 'y' }],
		['x>=y', { left: 'x', operator: '>=', right: 'y' }],
		['x<y', { left: 'y', operator: '>', right: 'x' }],
		['x<=y', { left: 'y', operator: '>=', right: 'x' }],
		['x=y', { left: 'x', operator: '=', right: 'y' }],
		['rate_2 < value3', { left: 'value3', operator: '>', right: 'rate_2' }],
	])('normalizes %s', (source, expected) => {
		expect(parseSymbolRelation(source)).toEqual(expected);
	});

	it.each([
		'x>0', 'x>y+1', 'x^2>y', 'sqrt(x)>y',
		'x>y>z', 'x>1/2', 'x>sin(y)', 'x==y', 'x == y',
	])('rejects non-plain symbol relation %s', source => {
		expect(parseSymbolRelation(source)).toBeUndefined();
	});
});
