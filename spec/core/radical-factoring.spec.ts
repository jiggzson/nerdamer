import { Parser } from '../../src/core/classes/parser/Parser';
import { intRootBig } from '../../src/core/functions/bigint/bigint';
import nerdamer from '../../src/index';

// Two 19-digit primes: fully factoring their product with Pollard rho takes hours.
const p = 1000000000000000003n;
const q = 1000000000000000009n;

describe('Radicals of large integers', () => {
	it('leave a part that resists factoring under the radical instead of hanging', () => {
		const start = performance.now();
		expect(nerdamer(`sqrt(${p * q})`).text()).toEqual(`${p * q}^(1/2)`);
		expect(nerdamer(`sqrt(${4n * p * q})`).text()).toEqual(`2*${p * q}^(1/2)`);
		expect(nerdamer(`(${8n * p * q})^(1/3)`).text()).toEqual(`2*${p * q}^(1/3)`);
		expect(performance.now() - start).toBeLessThan(2000);
	});

	it('still simplifies perfect powers of large primes', () => {
		expect(nerdamer(`sqrt(${p * p})`).text()).toEqual(String(p));
		expect(nerdamer(`(${p * p * p})^(1/3)`).text()).toEqual(String(p));
	});

	it('keeps small radicals unchanged', () => {
		expect(nerdamer('sqrt(4320)').text()).toEqual('12*30^(1/2)');
		expect(nerdamer('(-25)^(1/5)').text()).toEqual('5^(2/5)*(-1)^(1/5)');
		expect(nerdamer(`sqrt(${1000003n * 1000003n * 7n})`).text()).toEqual('1000003*7^(1/2)');
	});

	it('uses the configured step budget', () => {
		const previous = Parser.get('MAX_RADICAL_FACTOR_STEPS');
		Parser.set('MAX_RADICAL_FACTOR_STEPS', 5);
		try {
			// Within a 5-step budget rho can't split two 7-digit primes.
			expect(nerdamer('sqrt(1000003*1000033)').text()).toEqual('1000036000099^(1/2)');
		} finally {
			Parser.set('MAX_RADICAL_FACTOR_STEPS', previous);
		}
		expect(nerdamer('sqrt(4*1000003*1000033)').text()).toEqual('2*1000036000099^(1/2)');
	});

	it('keeps pfactor complete', () => {
		expect(nerdamer('pfactor(1000000007*1000000009)').text()).toEqual(
			'[1000000007, 1000000009]'
		);
	});
});

describe('intRootBig', () => {
	it('returns the floor of the k-th root', () => {
		for (const k of [2n, 3n, 5n, 7n]) {
			for (const value of [
				0n,
				1n,
				2n,
				7n,
				1000n,
				p,
				p * q,
				p ** k,
				p ** k - 1n,
				p ** k + 1n,
			]) {
				const root = intRootBig(value, k);
				expect(root ** k <= value).toBe(true);
				expect((root + 1n) ** k > value).toBe(true);
			}
		}
	});
});
