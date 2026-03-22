import Decimal from 'decimal.js';

import { Assumption } from '../../src/core/classes/assumption/Assumption';

describe('Assumption', () => {
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
			expect(p3.assumption.start.inclusive).toBe(true);
			expect(p3.assumption.end.inclusive).toBe(true);
		});

		it('ignores whitespace', () => {
			const p = Assumption.parse('  a  <=  10  ');
			expect(p.symbol).toBe('a');
			expect(p.assumption.end.value.equals(new Decimal(10))).toBe(true);
			expect(p.assumption.end.inclusive).toBe(true);
		});

		it('parses infinity tokens', () => {
			const p1 = Assumption.parse('t<inf');
			expect(p1.assumption.end.value.isFinite()).toBe(false);

			const p2 = Assumption.parse('t>-infinity');
			expect(p2.assumption.start.value.isFinite()).toBe(false);
		});

		it('throws on malformed inputs', () => {
			expect(() => Assumption.parse('>=3')).toThrow();
			expect(() => Assumption.parse('x')).toThrow();
			expect(() => Assumption.parse('x>')).toThrow();
			expect(() => Assumption.parse('x?3')).toThrow();
		});
	});

	describe('interval relations', () => {
		it('contains respects open/closed endpoints', () => {
			const a = new Assumption(0, 9, true, false); // [0,9)
			expect(a.contains(new Decimal(0))).toBe(true);
			expect(a.contains(new Decimal(9))).toBe(false);
			expect(a.contains(new Decimal(8.999))).toBe(true);
		});

		it('gt and lt are provable only when bounds separate', () => {
			// a >= 0
			const a = Assumption.atLeast(0, true); // [0, inf)
			// b < 0
			const b = Assumption.atMost(0, false); // (-inf, 0)
			expect(a.gt(b)).toBe(true); // all b are < 0, all a are >= 0

			// b2 <= 0
			const b2 = Assumption.atMost(0, true); // (-inf, 0]
			expect(a.gt(b2)).toBe(false); // could both be 0

			// c > 0
			const c = Assumption.atLeast(0, false); // (0, inf)
			expect(c.gt(b2)).toBe(true); // all c are > 0, all b2 are <= 0
		});

		it('overlaps matches non-empty intersection with endpoint rules', () => {
			const a = new Assumption(0, 1, true, true); // [0,1]
			const b = new Assumption(1, 2, true, true); // [1,2]
			const c = new Assumption(1, 2, false, true); // (1,2]

			expect(a.overlaps(b)).toBe(true); // overlap at 1
			expect(a.overlaps(c)).toBe(false); // 1 excluded from c
		});

		it('toString returns a readable representation', () => {
			const a = new Assumption(0, 9, true, false);
			const s = a.toString();
			expect(typeof s).toBe('string');
			expect(s.length > 0).toBe(true);
		});
	});
});
