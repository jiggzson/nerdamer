import '../helpers/registerNerdamerFunctions';
import { gcd as arithGcd } from '../../src/algebra/algorithms/arith';
import { Term } from '../../src/core/classes/polynomial/Term';
import { UnexpectedInputError } from '../../src/core/errors';
import {
	bigintLCM,
	factorial,
	GCD,
	LCM,
	productInRange,
	recoverCoeffsZ,
	uniqueSortedArray,
} from '../../src/core/functions/bigint/bigint';
import { productInRange as numericProductInRange } from '../../src/core/functions/numeric';

describe('Bigint helpers', () => {
	it('recovers the power of each prime and the remaining coefficient', () => {
		expect(recoverCoeffsZ(12n, { x: 2n })).toEqual({ x: 2, coeff: 3n });
		expect(recoverCoeffsZ(3n, { x: 2n })).toEqual({ x: 0, coeff: 3n });
		expect(recoverCoeffsZ(360n, { x: 2n, y: 3n, z: 5n })).toEqual({
			x: 3,
			y: 2,
			z: 1,
			coeff: 1n,
		});
	});

	it('rejects a non-integer factorial index', () => {
		expect(() => factorial(2.5)).toThrow(UnexpectedInputError);
		expect(factorial(5)).toBe(120n);
	});

	it('stops a stepped product before passing the end', () => {
		expect(productInRange(1, 4, 2)).toBe(3n);
		expect(productInRange(1, 5, 2)).toBe(15n);
		expect(productInRange(1, 4)).toBe(24n);
		expect(numericProductInRange(1, 4, 2)).toBe(3);
	});

	it('gives an empty product of one', () => {
		expect(productInRange(5, 4)).toBe(1n);
		expect(numericProductInRange(5, 4)).toBe(1);
	});

	it('leaves a term unchanged by a derivative of order zero', () => {
		const term = new Term('3', { x: 4 }, ['x']);
		expect(term.diff('x', 0).coeff.text()).toBe('3');
		expect(term.diff('x', 0).powers.x).toBe(4);
		expect(term.diff('x', 2).coeff.text()).toBe('36');
	});

	it('sorts distinct absolute values numerically in descending order', () => {
		expect(uniqueSortedArray([10n, 9n, 100n, -9n])).toEqual([100n, 10n, 9n]);
	});

	it('computes nonnegative GCDs and LCMs', () => {
		expect(GCD(-12n, 18n)).toBe(6n);
		expect(GCD(12n, 18n, 8n)).toBe(2n);
		expect(GCD(0n, 0n)).toBe(0n);
		expect(GCD()).toBe(0n);
		expect(arithGcd(-12n, 18n)).toBe(6n);
		expect(LCM(-4n, 6n)).toBe(12n);
		expect(LCM(4n, 6n, 10n)).toBe(60n);
		expect(LCM(0n, 5n)).toBe(0n);
		expect(bigintLCM([4n, 6n])).toBe(12n);
		expect(bigintLCM([])).toBe(1n);
	});
});
