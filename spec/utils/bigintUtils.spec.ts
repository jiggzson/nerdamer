import { GCD, sign, simplifyRatio, factorial, invMod } from '../../src/core/functions/bigint/bigint';
import { isPrimeBig, primeFactorsBig } from '../../src/core/functions/bigint/primeFactor';

describe('BigInt GCD', () => {
	it('should calculate the gcd correctly', () => {
		expect(GCD(15n, 21n, 45n)).toBe(3n);
		expect(GCD(7n, 21n, 45n)).toBe(1n);
	});
});

describe('BigInt sign', () => {
	it('should calculate the sign correctly', () => {
		expect(sign(-3445n)).toBe(-1);
		expect(sign(11n)).toBe(1);
		expect(sign(0n)).toBe(0);
	});
});
describe('BigInt simplifyRatio', () => {
	it('should simplify correctly', () => {
		expect(simplifyRatio(45n, 15n)).toEqual([3n, 1n]);
		expect(simplifyRatio(7n, 3n)).toEqual([7n, 3n]);
		expect(simplifyRatio(111n, 296n)).toEqual([3n, 8n]);
	});
});
describe('BigInt factorial', () => {
	it('should calculate correctly', () => {
		expect(factorial(40)).toEqual(815915283247897734345611269596115894272000000000n);
		expect(factorial(1)).toEqual(1n);
		expect(factorial(2)).toEqual(2n);
		expect(factorial(5)).toEqual(120n);
	});

	it('rejects negative integer inputs', () => {
		expect(() => factorial(-1n)).toThrow(RangeError);
	});
});

describe('BigInt modular inverse', () => {
	it('calculates exact modular inverses', () => {
		expect(invMod(3n, 7n)).toBe(5n);
		expect(invMod(10n, 17n)).toBe(12n);
	});

	it('returns -1 when no modular inverse exists', () => {
		expect(invMod(2n, 4n)).toBe(-1n);
		expect(invMod(0n, 7n)).toBe(-1n);
	});
});

describe('BigInt primality and factorization', () => {
	it('rejects a strong pseudoprime and factors it exactly', () => {
		const input = 3825123056546413051n;
		expect(isPrimeBig(input)).toBe(false);
		expect(primeFactorsBig(input).factors).toEqual([149491n, 747451n, 34233211n]);
	});
});
