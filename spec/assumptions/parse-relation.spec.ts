import '../../src/api/parser';
import { parseRelation } from '../../src/core/classes/assumption/parseRelation';

/** Verifies relationship extraction without evaluating expressions or registering assumptions. */
describe('shared assumption relationship syntax', () => {
	it.each([
		['x<y+1', '<', 'x', 'y 1 +'],
		['x^2<a', '<', 'x 2 ^', 'a'],
		['x>=0', '>=', 'x', '0'],
		['x+1<y*2', '<', 'x 1 +', 'y 2 *'],
		['(x+1)*2<y', '<', 'x 1 + 2 *', 'y'],
		['x==3', '==', 'x', '3'],
		['sqrt(x+1)<y', '<', 'x 1 + sqrt', 'y'],
		['x<sin(y*2)', '<', 'x', 'y 2 * sin'],
		['(x+1)<(y*2)', '<', 'x 1 +', 'y 2 *'],
		['x<(y+1)*2', '<', 'x', 'y 1 + 2 *'],
	])('extracts %s using shared RPN', (source, operator, left, right) => {
		const result = parseRelation(source);
		expect(result?.operator).toBe(operator);
		expect(result?.left.map(token => token.value).join(' ')).toBe(left);
		expect(result?.right.map(token => token.value).join(' ')).toBe(right);
	});

	it('retains exact rational syntax without evaluating it', () => {
		const relation = parseRelation('x=1/2');
		expect(relation?.operator).toBe('=');
		expect(relation?.left.map(token => token.value)).toEqual(['x']);
		expect(relation?.right.map(token => token.value)).toEqual(['1', '2', '/']);
	});

	it.each([
		'x', 'x+y', 'x<y<z', 'x>0 and y<3', 'integer(x)',
		'x<(y+1)<z', '(x<y)+1<z', 'x<(y<z)',
		'x<max(y,2)', 'x<sqrt(y<2)',
	])('does not claim unsupported syntax %s is a relationship', source => {
		expect(parseRelation(source)).toBeUndefined();
	});
});
