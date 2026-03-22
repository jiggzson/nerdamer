import { Collection } from '../../src/core/classes/collection/Collection';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Collection', () => {
	it('should construct from array and be iterable', () => {
		const c = new Collection([Expression.create('a'), Expression.create('b')]);
		expect(c.isCollectionOfValues).toBe(true);
		expect(c.count()).toBe(2);
	});

	it('each should return Collection', () => {
		const c = new Collection([Expression.create('a'), Expression.create('b')]);
		const r = c.each(e => e);
		expect(r).toBeInstanceOf(Collection);
	});

	it('copy should be independent', () => {
		const c = new Collection([Expression.create('a')]);
		const d = c.copy();
		d.each(() => Expression.create('b'));
		expect(c.text()).not.toEqual(d.text());
	});
});
