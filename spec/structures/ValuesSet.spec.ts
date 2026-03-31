import { Expression } from '../../src/core/classes/expression/Expression';
import { ValuesSet } from '../../src/core/classes/valuesSet/ValuesSet';

describe('ValuesSet', () => {
	it('should expose required parser flags', () => {
		const s = new ValuesSet();
		expect(s.isEnumerable).toBe(true);
		expect(s.isFunctionReturn).toBe(false);
		expect(Boolean(s.dataType)).toBe(true);
	});

	it('should dedupe by semantic equality (.eq)', () => {
		const x1 = Expression.create('x');
		const x2 = Expression.create('x');
		const s = new ValuesSet([x1, x2]);
		expect(s.elements.length).toBe(1);
		expect(s.has(Expression.create('x'))).toBe(true);
	});

	it('add/delete/clear should behave as a set', () => {
		const s = new ValuesSet();
		expect(s.add(Expression.create('a'))).toBe(s);
		expect(s.elements.length).toBe(1);

		// delete by semantic equality (not the same reference)
		expect(s.delete(Expression.create('a'))).toBe(true);
		expect(s.elements.length).toBe(0);
		expect(s.delete(Expression.create('a'))).toBe(false);

		s.add(Expression.create('b'));
		s.add(Expression.create('c'));
		expect(s.elements.length).toBe(2);
		s.clear();
		expect(s.elements.length).toBe(0);
		expect(s.has(Expression.create('b'))).toBe(false);
	});

	it('copy should be independent', () => {
		const a = new ValuesSet([Expression.create('a')]);
		const b = a.copy();

		b.add(Expression.create('b'));
		expect(a.has(Expression.create('b'))).toBe(false);
		expect(b.has(Expression.create('b'))).toBe(true);

		b.delete(Expression.create('a'));
		expect(a.has(Expression.create('a'))).toBe(true);
		expect(b.has(Expression.create('a'))).toBe(false);
	});

	it('each should preserve uniqueness and keep first occurrence', () => {
		const s = new ValuesSet([
			Expression.create('a'),
			Expression.create('b'),
			Expression.create('c'),
		]);

		// map everything to "a" -> should collapse to one element
		s.each(() => Expression.create('a'));
		expect(s.elements.length).toBe(1);
		expect(s.has(Expression.create('a'))).toBe(true);

		const t = new ValuesSet([
			Expression.create('a'),
			Expression.create('b'),
			Expression.create('c'),
		]);
		// map b -> a -> should collapse b away but keep a and c
		t.each(e => (e.eq(Expression.create('b')) ? Expression.create('a') : e));
		expect(t.has(Expression.create('a'))).toBe(true);
		expect(t.has(Expression.create('c'))).toBe(true);
		expect(t.elements.length).toBe(2);
	});

	it('eq should be order independent', () => {
		const a = new ValuesSet([Expression.create('a'), Expression.create('b')]);
		const b = new ValuesSet([Expression.create('b'), Expression.create('a')]);
		expect(a.eq(b)).toBe(true);
	});

	it('sort should change iteration order but not equality', () => {
		const a = new ValuesSet([Expression.create('b'), Expression.create('a')]);
		const b = a.copy();
		b.sort();
		expect(a.eq(b)).toBe(true);
		// Representation likely changes
		expect(a.text()).not.toEqual(b.text());
	});

	it('subset/superset comparisons should work and return false for non-ValuesSet', () => {
		const a = new ValuesSet([Expression.create('a')]);
		const b = new ValuesSet([Expression.create('a'), Expression.create('b')]);

		expect(a.lte(b)).toBe(true);
		expect(a.lt(b)).toBe(true);
		expect(b.gte(a)).toBe(true);
		expect(b.gt(a)).toBe(true);

		// blanket false when other is not a ValuesSet
		expect(a.lt(Expression.create('a'))).toBe(false);
		expect(a.lte(Expression.create('a'))).toBe(false);
		expect(a.gt(Expression.create('a'))).toBe(false);
		expect(a.gte(Expression.create('a'))).toBe(false);
		expect(a.eq(Expression.create('a'))).toBe(false);
	});
});
