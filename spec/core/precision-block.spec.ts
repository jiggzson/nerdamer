import Decimal from 'decimal.js';

import { precisionBlock } from '../../src/core/Settings';

describe('precisionBlock', () => {
	const original = Decimal.precision;
	afterEach(() => {
		Decimal.set({ precision: original });
	});

	it('raises the precision inside and restores the previous one', () => {
		Decimal.set({ precision: 20 });
		expect(precisionBlock(50, () => Decimal.precision)).toBe(50);
		expect(Decimal.precision).toBe(20);
	});

	it('never lowers a higher precision, and restores it rather than the minimum', () => {
		Decimal.set({ precision: 100 });
		expect(precisionBlock(50, () => Decimal.precision)).toBe(100);
		expect(Decimal.precision).toBe(100);
	});

	it('restores the previous precision when the callback throws', () => {
		Decimal.set({ precision: 20 });
		expect(() =>
			precisionBlock(50, () => {
				throw new Error('inside');
			})
		).toThrow('inside');
		expect(Decimal.precision).toBe(20);
	});

	it('restores each level when nested', () => {
		Decimal.set({ precision: 20 });
		const seen = precisionBlock(30, () => {
			const inner = precisionBlock(60, () => Decimal.precision);
			return [Decimal.precision, inner];
		});
		expect(seen).toEqual([30, 60]);
		expect(Decimal.precision).toBe(20);
	});
});
