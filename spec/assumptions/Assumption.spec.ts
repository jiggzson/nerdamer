import Decimal from 'decimal.js';

import { Assumption } from '../../src/core/classes/assumption/Assumption';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Assumption', () => {
	describe('construction', () => {
		it('recognizes singleton intervals by numeric value rather than Decimal identity', () => {
			const a = new Assumption(new Decimal(3), new Decimal(3));
			const b = new Assumption(0, 0);

			expect(a.isSingleton).toBe(true);
			expect(b.isSingleton).toBe(true);
		});

		it('rejects empty zero-width intervals', () => {
			expect(() => new Assumption(0, 0, false, false)).toThrow();
			expect(() => new Assumption(0, 0, true, false)).toThrow();
			expect(() => new Assumption(0, 0, false, true)).toThrow();
		});

		it('rejects reversed bounds', () => {
			expect(() => new Assumption(2, 1)).toThrow();
		});

		it('rejects NaN bounds', () => {
			expect(() => new Assumption(NaN, 1)).toThrow();
			expect(() => new Assumption(0, new Decimal(NaN))).toThrow();
		});

		it('normalizes infinite endpoints to open bounds', () => {
			const a = new Assumption(-Infinity, 5, true, true);
			const b = new Assumption(5, Infinity, true, true);

			expect(a.start.inclusive).toBe(false);
			expect(b.end.inclusive).toBe(false);
		});

		it('exposes immutable interval objects', () => {
			const a = new Assumption(0, 1);

			expect(Object.isFrozen(a)).toBe(true);
			expect(Object.isFrozen(a.start)).toBe(true);
			expect(Object.isFrozen(a.end)).toBe(true);
		});
	});

	describe('parse', () => {
		it('parses basic constraints without brackets', () => {
			const p1 = Assumption.parse('x>=0');
			expect(p1.symbol).toBe('x');
			expect(p1.assumption.start.value.equals(new Decimal(0))).toBe(true);
			expect(p1.assumption.start.inclusive).toBe(true);

			const p2 = Assumption.parse('y<9');
			expect(p2.symbol).toBe('y');
			expect(p2.assumption.end.value.equals(new Decimal(9))).toBe(true);
			expect(p2.assumption.end.inclusive).toBe(false);

			const p3 = Assumption.parse('z=3');
			expect(p3.symbol).toBe('z');
			expect(p3.assumption.start.value.equals(new Decimal(3))).toBe(true);
			expect(p3.assumption.end.value.equals(new Decimal(3))).toBe(true);
			expect(p3.assumption.isSingleton).toBe(true);
		});

		it('accepts equality aliases, decimals, scientific notation, and whitespace', () => {
			const equality = Assumption.parse('  a == 10  ');
			const decimal = Assumption.parse('b>-2.5');
			const scientific = Assumption.parse('c<=1e3');

			expect(equality.assumption.isSingleton).toBe(true);
			expect(equality.assumption.start.value.eq(10)).toBe(true);
			expect(decimal.assumption.start.value.eq('-2.5')).toBe(true);
			expect(scientific.assumption.end.value.eq(1000)).toBe(true);
		});

		it('parses infinity tokens as open endpoints', () => {
			const p1 = Assumption.parse('t<inf');
			expect(p1.assumption.end.value.isFinite()).toBe(false);
			expect(p1.assumption.end.inclusive).toBe(false);

			const p2 = Assumption.parse('t>-infinity');
			expect(p2.assumption.start.value.isFinite()).toBe(false);
			expect(p2.assumption.start.inclusive).toBe(false);
		});

		it('rejects syntax outside the numeric interval vocabulary', () => {
			expect(() => Assumption.parse('>=3')).toThrow();
			expect(() => Assumption.parse('x')).toThrow();
			expect(() => Assumption.parse('x>')).toThrow();
			expect(() => Assumption.parse('x?3')).toThrow();
			expect(() => Assumption.parse('x>y')).toThrow();
			expect(() => Assumption.parse('x=1/2')).toThrow();
			expect(() => Assumption.parse('2x>0')).toThrow();
		});
	});

	describe('interval properties', () => {
		it('contains respects open and closed endpoints and rejects NaN', () => {
			const a = new Assumption(0, 9, true, false); // [0,9)
			expect(a.contains(new Decimal(0))).toBe(true);
			expect(a.contains(new Decimal(9))).toBe(false);
			expect(a.contains(new Decimal(8.999))).toBe(true);
			expect(a.contains(new Decimal(NaN))).toBe(false);
		});

		it('sameInterval compares the constraints rather than possible variable values', () => {
			const a = new Assumption(0, 9, true, false);
			const b = new Assumption(0, 9, true, false);
			const c = new Assumption(0, 9, false, false);

			expect(a.sameInterval(b)).toBe(true);
			expect(a.sameInterval(c)).toBe(false);
		});

		it('overlaps matches non-empty intersection with endpoint rules', () => {
			const a = new Assumption(0, 1, true, true); // [0,1]
			const b = new Assumption(1, 2, true, true); // [1,2]
			const c = new Assumption(1, 2, false, true); // (1,2]

			expect(a.overlaps(b)).toBe(true); // overlap at 1
			expect(a.overlaps(c)).toBe(false); // 1 excluded from c
		});

		it('toString returns mathematical interval notation', () => {
			const a = new Assumption(0, 9, true, false);
			expect(a.toString()).toBe('[0, 9)');
		});
	});

	describe('three-valued equality', () => {
		it('proves equality only for matching singleton values', () => {
			const a = Assumption.exactly(3);
			const b = Assumption.exactly(3);
			const c = Assumption.exactly(4);

			expect(a.eq(b)).toBe(true);
			expect(a.eq(c)).toBe(false);
			expect(a.eq(Expression.create(3))).toBe(true);
		});

		it('disproves equality when intervals or constants are disjoint', () => {
			const a = new Assumption(0, 1);
			const b = new Assumption(2, 3);

			expect(a.eq(b)).toBe(false);
			expect(a.eq(Expression.create(2))).toBe(false);
		});

		it('compares exact rational expressions without Decimal rounding', () => {
			const roundedThird = new Decimal(1).div(3);
			const exactThird = Expression.create('1/3');
			const singleton = Assumption.exactly(roundedThird);
			const lowerBounded = new Assumption(roundedThird, 1);

			expect(singleton.eq(exactThird)).toBe(false);
			expect(singleton.gt(exactThird)).toBe(false);
			expect(singleton.gte(exactThird)).toBe(false);
			expect(singleton.lt(exactThird)).toBe(true);
			expect(singleton.lte(exactThird)).toBe(true);
			expect(lowerBounded.gte(exactThird)).toBeUndefined();
		});

		it('does not turn approximate symbolic constants into interval proofs', () => {
			const a = Assumption.exactly('3.1415926535897932384626433832795028841971');

			expect(a.eq(Expression.create('pi'))).toBeUndefined();
			expect(a.gt(Expression.create('pi'))).toBeUndefined();
			expect(a.lt(Expression.create('pi'))).toBeUndefined();
		});

		it('returns unknown for overlapping and identical non-singleton ranges', () => {
			const a = new Assumption(0, 9);
			const b = new Assumption(0, 9);
			const c = new Assumption(5, 12);

			expect(a.eq(b)).toBeUndefined();
			expect(a.eq(c)).toBeUndefined();
			expect(a.eq(Expression.create(5))).toBeUndefined();
			expect(a.eq(Expression.create('x'))).toBeUndefined();
		});
	});

	describe('three-valued ordering', () => {
		it('distinguishes proved, disproved, and unknown relations against constants', () => {
			const nonnegative = Assumption.atLeast(0, true); // [0, inf)
			const positive = Assumption.atLeast(0, false); // (0, inf)
			const bounded = new Assumption(0, 9); // [0,9]

			expect(nonnegative.gte(Expression.create(0))).toBe(true);
			expect(nonnegative.gt(Expression.create(0))).toBeUndefined();
			expect(nonnegative.lt(Expression.create(0))).toBe(false);
			expect(positive.gt(Expression.create(0))).toBe(true);
			expect(positive.lte(Expression.create(0))).toBe(false);
			expect(bounded.gt(Expression.create(5))).toBeUndefined();
			expect(bounded.lt(Expression.create(10))).toBe(true);
		});

		it('handles separated intervals and touching endpoints conservatively', () => {
			const nonnegative = Assumption.atLeast(0, true); // [0, inf)
			const negative = Assumption.atMost(0, false); // (-inf, 0)
			const nonpositive = Assumption.atMost(0, true); // (-inf, 0]
			const positive = Assumption.atLeast(0, false); // (0, inf)

			expect(nonnegative.gt(negative)).toBe(true);
			expect(nonnegative.gt(nonpositive)).toBeUndefined();
			expect(nonnegative.gte(nonpositive)).toBe(true);
			expect(positive.gt(nonpositive)).toBe(true);
			expect(nonpositive.lt(positive)).toBe(true);
			expect(nonpositive.lte(nonnegative)).toBe(true);
		});

		it('returns unknown when overlapping ranges permit both orderings', () => {
			const a = new Assumption(0, 9);
			const b = new Assumption(5, 12);

			expect(a.gt(b)).toBeUndefined();
			expect(a.gte(b)).toBeUndefined();
			expect(a.lt(b)).toBeUndefined();
			expect(a.lte(b)).toBeUndefined();
		});

		it('handles infinity as an ordered comparison value without including it in the interval', () => {
			const real = new Assumption(-Infinity, Infinity);

			expect(real.contains(Infinity)).toBe(false);
			expect(real.contains(-Infinity)).toBe(false);
			expect(real.lt(Expression.Inf())).toBe(true);
			expect(real.gt(Expression.NegInf())).toBe(true);
			expect(real.eq(Expression.Inf())).toBe(false);
		});

		it('keeps inverse relation directions consistent', () => {
			const pairs: Array<[Assumption, Assumption]> = [
				[new Assumption(0, 1), new Assumption(2, 3)],
				[new Assumption(0, 1), new Assumption(1, 2)],
				[new Assumption(0, 2), new Assumption(1, 3)],
				[Assumption.atLeast(0, false), Assumption.atMost(0, true)],
			];

			for (const [a, b] of pairs) {
				expect(a.eq(b)).toBe(b.eq(a));
				expect(a.gt(b)).toBe(b.lt(a));
				expect(a.gte(b)).toBe(b.lte(a));
				expect(a.lt(b)).toBe(b.gt(a));
				expect(a.lte(b)).toBe(b.gte(a));
			}
		});

		it.each([
			{
				name: 'matching singletons',
				a: Assumption.exactly(0),
				b: Assumption.exactly(0),
				expected: [true, false, true, false, true],
			},
			{
				name: 'strictly positive versus nonpositive',
				a: Assumption.atLeast(0, false),
				b: Assumption.atMost(0, true),
				expected: [false, true, true, false, false],
			},
			{
				name: 'nonnegative versus nonpositive',
				a: Assumption.atLeast(0, true),
				b: Assumption.atMost(0, true),
				expected: [undefined, undefined, true, false, undefined],
			},
			{
				name: 'closed intervals touching at one point',
				a: new Assumption(0, 1, true, true),
				b: new Assumption(1, 2, true, true),
				expected: [undefined, false, undefined, undefined, true],
			},
			{
				name: 'disjoint intervals separated by an open endpoint',
				a: new Assumption(0, 1, true, false),
				b: new Assumption(1, 2, true, true),
				expected: [false, false, false, true, true],
			},
			{
				name: 'overlapping intervals',
				a: new Assumption(0, 9),
				b: new Assumption(5, 12),
				expected: [undefined, undefined, undefined, undefined, undefined],
			},
		])('evaluates the relation matrix conservatively: $name', ({ a, b, expected }) => {
			expect([a.eq(b), a.gt(b), a.gte(b), a.lt(b), a.lte(b)]).toEqual(expected);
		});
	});
});
