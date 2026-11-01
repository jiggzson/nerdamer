import { zero, one } from '../../src/core/classes/expression/shortcuts';

describe('cached numeric expressions', () => {
	it('does not expose mutable cached multipliers', () => {
		const value = zero();
		const multiplier = value.getMultiplier();
		expect(Object.isFrozen(multiplier)).toBe(true);
		expect(() => {
			multiplier.numerator = 7n;
		}).toThrow(TypeError);
		expect(zero().getMultiplier().isZero()).toBe(true);
	});

	it('returns independent powers from cached expressions', () => {
		const power = one().getPower();
		power.getMultiplier().numerator = 7n;
		expect(one().getPower().isZero()).toBe(true);
		expect(one().text()).toBe('1');
	});
});
