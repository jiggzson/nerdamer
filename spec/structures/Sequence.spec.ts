import { Sequence } from '../../src/core/classes/seq/SEQ';

function __(fn: (n: bigint) => bigint, length: number, startAt = 0n) {
	return Array.from({ length }, (_, i) => fn(BigInt(i) + startAt));
}

describe('Sequence tests', () => {
	it('should generate polynomial sequences', () => {
		expect(
			new Sequence(
				__(x => x + 2n, 10, 3n),
				{ startsAt: 3 }
			)
				.analyze()
				.toPolynomialString()
		).toEqual('x+2');

		expect(new Sequence(__(x => 2n * x ** 2n + 1n, 10)).analyze().toPolynomialString()).toEqual(
			'2x^2+1'
		);
	});

	it('should handle constants and negatives', () => {
		expect(new Sequence([5, 5, 5]).analyze().toPolynomialString()).toEqual('5');

		expect(new Sequence(__(x => -3n * x + 1n, 10)).analyze().toPolynomialString()).toEqual(
			'-3x+1'
		);
	});

	it('should reject non-polynomial sequences', () => {
		expect(() => new Sequence([1, 2, 4, 8]).analyze()).toThrow();
	});

	it('should reject invalid startsAt', () => {
		expect(() => new Sequence([1, 2, 3], { startsAt: 1.5 })).toThrow();
	});

	it('should reject insufficient data points', () => {
		expect(() => new Sequence([1, 2]).analyze()).toThrow();
	});
});
