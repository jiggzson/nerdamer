import { Expression } from '../../src/core/classes/expression/Expression';
import { Vector } from '../../src/core/classes/vector/Vector';

describe('Vector each/copy/expand/evaluate', () => {
	it('each should return Vector and keep length', () => {
		const v = new Vector([Expression.create('a'), Expression.create('b')]);
		const r = v.each(e => e);
		expect(r).toBeInstanceOf(Vector);
		expect(v.count()).toBe(2);
	});

	it('copy should be independent', () => {
		const v = new Vector([Expression.create('a')]);
		const c = v.copy();
		c.append(Expression.create('b'));
		expect(v.count()).toBe(1);
		expect(c.count()).toBe(2);
	});

	it('expand/evaluate should not mutate original', () => {
		const v = new Vector([Expression.create('(x+1)^2')]);
		const expanded = v.expand();
		expect(expanded).toBeInstanceOf(Vector);
		expect(v.text()).toEqual(new Vector([Expression.create('(x+1)^2')]).text());
	});
});
