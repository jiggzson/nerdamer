import nerdamer from '../../src/index';

/** Relative error of a computed value against a reference value. */
function relativeError(actual: number, expected: number): number {
	return Math.abs(actual - expected) / Math.abs(expected);
}

describe('Symbolic erfc', () => {
	// Reference values from mpmath at 30 digits.
	const cases: [number, string][] = [
		[2, '0.0046777349810472658379'],
		[7, '4.1838256077794143986e-23'],
		[10, '2.088487583762544757e-45'],
	];

	it('stays an erfc node', () => {
		expect(nerdamer('erfc(x)').text()).toEqual('erfc(x)');
		expect(nerdamer('2*erfc(x^2)').text()).toEqual('2*erfc(x^2)');
	});

	it('evaluates a substituted value with the accurate erfc', () => {
		for (const [x, expected] of cases) {
			const value = nerdamer('erfc(x)')
				.evaluate({ x: String(x) })
				.text({ decimal: true });
			expect(value).toEqual(nerdamer(`erfc(${x})`).evaluate().text({ decimal: true }));
			expect(relativeError(Number(value), Number(expected))).toBeLessThan(1e-15);
		}
	});

	it('compiles to the native erfc in buildFunction', () => {
		const f = nerdamer('erfc(x)').buildFunction(['x']);
		for (const [x, expected] of cases) {
			expect(relativeError(f(x), Number(expected))).toBeLessThan(4e-15);
		}
	});

	it('keeps the existing exact and limit values', () => {
		expect(nerdamer('erfc(0)').text()).toEqual('1');
		expect(nerdamer('erfc(Infinity)').text()).toEqual('0');
		expect(nerdamer('erfc(-Infinity)').text()).toEqual('2');
		expect(nerdamer('limit(erfc(x),x,Infinity)').text()).toEqual('0');
		expect(nerdamer('limit(erfc(x),x,-Infinity)').text()).toEqual('2');
	});

	it('differentiates as -2e^(-x^2)/sqrt(pi)', () => {
		const derivative = nerdamer('diff(erfc(x),x)');
		const expected = nerdamer('-2*e^(-x^2)/sqrt(pi)');
		expect(nerdamer(`(${derivative.text()})-(${expected.text()})`).text()).toEqual('0');
		expect(nerdamer('diff(erfc(x)+erf(x),x)').text()).toEqual('0');
	});

	it('still evaluates complex arguments', () => {
		expect(nerdamer('erfc(1+i)').evaluate().text()).toEqual(
			nerdamer('1-erf(1+i)').evaluate().text()
		);
	});
});
