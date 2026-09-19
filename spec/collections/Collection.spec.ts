import { Collection } from '../../src/core/classes/collection/Collection';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Collection', () => {
	it('should construct from array and be iterable', () => {
		const elements = [Expression.create('a'), Expression.create('b')];
		const c = new Collection(elements);

		expect(c.isEnumerable).toBe(true);
		expect(c.count()).toBe(2);
		expect(c.dimensions()).toEqual([2]);
		expect(c.getElements()).toBe(elements);

		elements.push(Expression.create('c'));
		expect(c.count()).toBe(3);
		expect(c.text()).toEqual('(a, b, c)');
	});

	it('should support indexed reads and writes', () => {
		const c = new Collection([Expression.create('a'), Expression.create('b')]);

		expect(c.__get__([0]).eq(Expression.create('a'))).toBe(true);
		c.__set__([1], Expression.create('c'));
		expect(c.__get__([1]).eq(Expression.create('c'))).toBe(true);

		expect(() => c.__get__([-1])).toThrow(RangeError);
		expect(() => c.__get__([2])).toThrow(RangeError);
		expect(() => c.__set__([2], Expression.create('d'))).toThrow(RangeError);
	});

	it('each should return Collection', () => {
		const c = new Collection([Expression.create('a'), Expression.create('b')]);
		const r = c.each((e, i) => (i === 0 ? Expression.create('c') : e));

		expect(r).toBe(c);
		expect(c.text()).toEqual('(c, b)');
	});

	it('copy should be independent', () => {
		const c = new Collection([Expression.create('a')]);
		const d = c.copy();
		d.each(() => Expression.create('b'));
		expect(c.text()).not.toEqual(d.text());
	});

	it('evaluate and expand should leave the original collection unchanged', () => {
		const evaluatedSource = new Collection([Expression.create('pi')]);
		const evaluated = evaluatedSource.evaluate();
		expect(evaluated).not.toBe(evaluatedSource);
		expect(evaluated.__get__([0]).eq(evaluatedSource.__get__([0]).evaluate())).toBe(true);
		expect(evaluatedSource.text()).toEqual('(pi)');

		const expandedSource = new Collection([Expression.create('(x+1)^2')]);
		const expanded = expandedSource.expand();
		expect(expanded).not.toBe(expandedSource);
		expect(expanded.__get__([0]).eq(expandedSource.__get__([0]).expand())).toBe(true);
		expect(expandedSource.text()).toEqual('((1+x)^2)');
	});

	it('should compare corresponding values component-wise', () => {
		const lower = new Collection([
			Expression.create(1),
			Expression.create(2),
			Expression.create(3),
		]);
		const upper = new Collection([
			Expression.create(2),
			Expression.create(2),
			Expression.create(4),
		]);
		const equal = new Collection([
			Expression.create(1),
			Expression.create(2),
			Expression.create(3),
		]);

		expect(lower.eq(equal)).toBe(true);
		expect(lower.eq(Expression.create(1))).toBe(false);
		expect(upper.gt(lower)).toBe(false);
		expect(lower.lt(upper)).toBe(false);
		expect(upper.gte(lower)).toBe(true);
		expect(lower.lte(upper)).toBe(true);
		expect(lower.gte(upper)).toBe(false);
		expect(upper.lte(lower)).toBe(false);
		expect(upper.gte(Expression.create(1))).toBe(false);
		expect(lower.lte(new Collection([Expression.create(1)]))).toBe(false);
	});
});
