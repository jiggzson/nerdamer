import { Expression } from '../../src/core/classes/expression/Expression';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';

describe('aggregate comparisons', () => {
	it('should return blanket false when comparing ValuesSet with non-ValuesSet', () => {
		const s = new ValuesSet([Expression.create('a')]);
		const e = Expression.create('a');
		expect(s.eq(e)).toBe(false);
		expect(s.lt(e)).toBe(false);
		expect(s.lte(e)).toBe(false);
		expect(s.gt(e)).toBe(false);
		expect(s.gte(e)).toBe(false);
	});
});
