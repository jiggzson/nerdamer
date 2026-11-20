import '../helpers/registerNerdamerFunctions';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Rational } from '../../src/core/classes/rational/Rational';
import { GCD, productInRange } from '../../src/core/functions/bigint/bigint';
import nerdamer from '../../src/index';

/** Euclid's algorithm, the reference for GCD. */
function euclid(a: bigint, b: bigint): bigint {
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;
	while (b !== 0n) {
		const r = a % b;
		a = b;
		b = r;
	}
	return a;
}

/** A reduced fraction with a positive denominator, by one gcd of the whole fraction. */
function reduce(numerator: bigint, denominator: bigint): [bigint, bigint] {
	const g = euclid(numerator, denominator);
	const sign = denominator < 0n ? -1n : 1n;
	return [(sign * numerator) / g, (sign * denominator) / g];
}

/** A deterministic sequence of large integers. */
function* integers(seed: bigint, count: number): Generator<bigint> {
	let x = seed;
	for (let i = 0; i < count; i++) {
		x = (x * 6364136223846793005n + 1442695040888963407n) % (1n << 64n);
		yield x ** BigInt(1 + (i % 9)) * (i % 3 === 0 ? -1n : 1n);
	}
}

describe('GCD', () => {
	it('agrees with Euclid on large values', () => {
		const values = [...integers(7n, 200)];
		for (let i = 0; i + 1 < values.length; i++) {
			// A shared factor makes the gcd nontrivial.
			const common = values[(i * 7) % values.length];
			const a = values[i] * common;
			const b = values[i + 1] * common;
			expect(GCD(a, b)).toBe(euclid(a, b));
			expect(GCD(b, a, 0n)).toBe(euclid(a, b));
		}
	});

	it('handles Fibonacci pairs, signs and zeros', () => {
		let [f0, f1] = [0n, 1n];
		for (let i = 0; i < 2000; i++) {
			[f0, f1] = [f1, f0 + f1];
		}
		expect(GCD(f1, f0)).toBe(1n);
		expect(GCD(f1 * 6n, f0 * 9n)).toBe(3n);
		expect(GCD(0n, 0n)).toBe(0n);
		expect(GCD()).toBe(0n);
		expect(GCD(-12n, 18n)).toBe(6n);
		expect(GCD(1n << 200n, 3n << 190n)).toBe(1n << 190n);
	});
});

describe('Rational arithmetic on large values', () => {
	it('gives reduced products and sums equal to reducing the whole fraction', () => {
		const values = [...integers(11n, 80)];
		for (let i = 0; i + 3 < values.length; i += 2) {
			const [a, b] = reduce(values[i], values[i + 1] === 0n ? 1n : values[i + 1]);
			const [c, d] = reduce(values[i + 2], values[i + 3] === 0n ? 1n : values[i + 3]);
			const x = new Rational(a, b);
			const y = new Rational(c, d);
			const product = x.times(y);
			const sum = x.plus(y);
			expect([product.numerator, product.denominator]).toEqual(reduce(a * c, b * d));
			expect([sum.numerator, sum.denominator]).toEqual(reduce(a * d + c * b, b * d));
			expect(product.value).toBe(
				`${product.numerator}/${product.denominator}`.replace(/\/1$/, '')
			);
		}
	});

	it('normalizes zero results', () => {
		const x = Rational.create('7/12');
		expect(x.times(Rational.create('0')).value).toBe('0');
		expect(x.times(Rational.create('0')).denominator).toBe(1n);
		expect(x.plus(Rational.create('-7/12')).denominator).toBe(1n);
		expect(x.plus(Rational.create('5/12')).value).toBe('1');
	});

	it('builds the text of a number when it is read', () => {
		const x = Rational.create('3/4');
		const y = x.copy();
		y.numerator = 5n;
		y.updateValue();
		expect(y.value).toBe('5/4');
		expect(x.value).toBe('3/4');
		expect(Rational.create('0.5').value).toBe('0.5');
		const number = Expression.fromRational(Rational.create('-22/7'));
		expect(number.value).toBe('-22/7');
		expect(number.copy().value).toBe('-22/7');
	});
});

describe('Exact powers of large rationals', () => {
	it('keeps the cube of a 20-digit decimal exact', () => {
		const cube = Rational.create('83534240898795743893/100000000000000000000').pow(
			Rational.create('3')
		);
		const result = Expression.create('0.83534240898795743893^3');
		expect(result.isNUM()).toBe(true);
		expect(result.getMultiplier().numerator).toBe(cube.numerator);
		expect(result.getMultiplier().denominator).toBe(cube.denominator);
	});

	// 3^209590 and 2^332192 have 100,000 digits, the default MAX_NUMBER_DIGITS.
	it.each([
		['3^209590', true],
		['3^209591', false],
		['2^332192', true],
		['2^332193', false],
		['(3/2)^300000', false],
	])('computes %s exactly only within MAX_NUMBER_DIGITS', (source, exact) => {
		expect(Expression.create(source).isNUM()).toBe(exact);
	});

	// The square of x^(p/2) must be x^p exactly.
	it.each([
		['83534240898795743893/100000000000000000000', '61'],
		['1000000000000000000117*1000000000000000000193', '31'],
	])('takes an odd half power of %s exactly', (base, p) => {
		const root = Expression.create(`(${base})^(${p}/2)`);
		expect(root.hasFunction('sqrt') || root.text().includes('^(1/2)')).toBe(true);
		expect(nerdamer(`(${root.text()})^2-(${base})^${p}`).text()).toBe('0');
	});
});

describe('Exact integer functions', () => {
	it('builds factorials and double factorials from a product tree', () => {
		let reference = 1n;
		for (let k = 2n; k <= 1000n; k++) {
			reference *= k;
		}
		expect(nerdamer('factorial(1000)').text()).toBe(String(reference));
		expect(productInRange(17, 1000) * productInRange(2, 16)).toBe(reference);
		expect(productInRange(5, 4)).toBe(1n);
		expect(productInRange(1, 99, 2) * productInRange(2, 100, 2)).toBe(productInRange(1, 100));
		expect(nerdamer('dfactorial(-7)').text()).toBe('-1/15');
	});

	// gamma(n + 1/2) * gamma(1/2 - n) = (-1)^n * pi
	it.each(['1', '2', '25', '400'])(
		'satisfies the reflection formula for half integers at n = %s',
		n => {
			const product = nerdamer(`gamma(${n}+1/2)*gamma(1/2-${n})`);
			expect(product.text()).toBe(Number(n) % 2 === 0 ? 'pi' : '-pi');
		}
	);
});

describe('Accumulated sums and products', () => {
	// Each of these took tens of seconds before the arithmetic above.
	it('multiplies and adds ten thousand exact terms quickly', () => {
		const start = performance.now();
		expect(nerdamer('product(k,k,1,10000)').text()).toBe(nerdamer('factorial(10000)').text());
		const harmonic = nerdamer('sum(1/k,k,1,10000)');
		expect(Number(harmonic.text({ decimal: true }))).toBeCloseTo(9.787606036044382, 12);
		expect(performance.now() - start).toBeLessThan(5000);
	}, 30000);
});
