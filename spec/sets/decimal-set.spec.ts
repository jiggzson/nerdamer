import Decimal from 'decimal.js';

import { DecimalSet } from '../../src/core/classes/decimalSet/DecimalSet';

describe('DecimalSet', () => {
	it('should dedupe numerically equivalent decimal representations', () => {
		const set = new DecimalSet([1, '1.0', new Decimal('1.000'), 0, '-0']);

		expect(set.size).toBe(2);
		expect(set.has('1.0000')).toBe(true);
		expect(set.has('-0')).toBe(true);
		expect(set.toString()).toEqual('DecimalSet { 0, 1 }');
	});

	it('range should support positive and negative finite steps', () => {
		expect(DecimalSet.range(0, 1, '0.25').toSorted().map(x => x.toString())).toEqual([
			'0',
			'0.25',
			'0.5',
			'0.75',
		]);
		expect(DecimalSet.range(3, -1, -1).toArray().map(x => x.toString())).toEqual([
			'3',
			'2',
			'1',
			'0',
		]);
		expect(DecimalSet.range(0, 3, -1).isEmpty()).toBe(true);
	});

	it('range should reject zero and non-finite values', () => {
		expect(() => DecimalSet.range(0, 10, 0)).toThrow('Step cannot be zero');
		expect(() => DecimalSet.range(0, Infinity, 1)).toThrow('Range values must be finite');
		expect(() => DecimalSet.range(NaN, 10, 1)).toThrow('Range values must be finite');
		expect(() => DecimalSet.range(0, 10, Infinity)).toThrow('Range values must be finite');
		expect(() => DecimalSet.range('1e100', '1.1e100', 1)).toThrow(
			'Step does not advance range at current precision'
		);
	});

	it('should implement standard finite-set operations', () => {
		const a = new DecimalSet([1, 2, 3]);
		const b = new DecimalSet([3, 4]);

		expect(a.union(b).toSorted().map(x => x.toString())).toEqual(['1', '2', '3', '4']);
		expect(a.intersection(b).toArray().map(x => x.toString())).toEqual(['3']);
		expect(a.difference(b).toArray().map(x => x.toString())).toEqual(['1', '2']);
		expect(a.symmetricDifference(b).toSorted().map(x => x.toString())).toEqual([
			'1',
			'2',
			'4',
		]);
		expect(a.equals(new DecimalSet(['3.0', '2.00', '1']))).toBe(true);
	});

	it('should implement subset, superset, and disjointness predicates', () => {
		const one = new DecimalSet([1]);
		const oneTwo = new DecimalSet([1, 2]);
		const three = new DecimalSet([3]);

		expect(one.isSubsetOf(oneTwo)).toBe(true);
		expect(one.isProperSubsetOf(oneTwo)).toBe(true);
		expect(oneTwo.isSupersetOf(one)).toBe(true);
		expect(oneTwo.isProperSupersetOf(one)).toBe(true);
		expect(one.isDisjointFrom(three)).toBe(true);
		expect(oneTwo.isDisjointFrom(one)).toBe(false);
	});

	it('should support map, filter, predicates, aggregates, and iteration', () => {
		const set = new DecimalSet([1, 2, 3]);

		expect(set.map(x => x.times(2)).toArray().map(x => x.toString())).toEqual([
			'2',
			'4',
			'6',
		]);
		expect(set.filter(x => x.greaterThan(1)).toArray().map(x => x.toString())).toEqual([
			'2',
			'3',
		]);
		expect(set.every(x => x.greaterThan(0))).toBe(true);
		expect(set.some(x => x.equals(2))).toBe(true);
		expect(set.min()?.toString()).toEqual('1');
		expect(set.max()?.toString()).toEqual('3');
		expect(set.sum().toString()).toEqual('6');
		expect([...set].map(x => x.toString())).toEqual(['1', '2', '3']);
	});

	it('clone and collection mutations should remain independent', () => {
		const original = DecimalSet.from([1, 2]);
		const copy = original.clone();

		copy.add(3).delete(1);
		expect(original.toArray().map(x => x.toString())).toEqual(['1', '2']);
		expect(copy.toArray().map(x => x.toString())).toEqual(['2', '3']);

		copy.clear();
		expect(copy.isEmpty()).toBe(true);
		expect(original.size).toBe(2);
	});

	it('forEach should match Set callback conventions', () => {
		const set = new DecimalSet([1, 2]);
		const values: string[] = [];
		const thisArg = { prefix: 'v' };

		set.forEach(function (this: { prefix: string }, value, value2, owner) {
			expect(value2).toBe(value);
			expect(owner).toBe(set);
			values.push(`${this.prefix}:${value}`);
		}, thisArg);

		expect(values).toEqual(['v:1', 'v:2']);
	});
});
