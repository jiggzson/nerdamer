import nerdamer from '../../src/index';

describe('simplify with erfc', () => {
	it('cancels erf(u) + erfc(u)', () => {
		const cases: [string, string][] = [
			['erf(x)+erfc(x)', '1'],
			['erfc(x^2)+erf(x^2)', '1'],
			['erfc(x)+erf(x)+y', '1+y'],
			['2*erfc(x)+2*erf(x)', '2'],
			['erfc(x)-1', '-erf(x)'],
			['3*erfc(x)-3', '-3*erf(x)'],
			['sin(erfc(x)+erf(x))', 'sin(1)'],
		];
		for (const [source, expected] of cases) {
			expect(nerdamer(`simplify(${source})`).text()).toEqual(expected);
		}
	});

	it('keeps erfc when the rewrite does not cancel', () => {
		expect(nerdamer('simplify(erfc(x))').text()).toEqual('erfc(x)');
		expect(nerdamer('simplify(erfc(x)+x)').text()).toEqual('x+erfc(x)');
		expect(nerdamer('simplify(erfc(x)+erf(y))').text()).toEqual('erf(y)+erfc(x)');
	});

	it('returns a value equal to the input', () => {
		for (const source of [
			'erf(x)-erfc(x)',
			'3*erfc(x)-3',
			'erfc(x)^2+erf(x)',
			'erfc(x)^2-2*erfc(x)+1',
		]) {
			const simplified = nerdamer(`simplify(${source})`).text();
			for (const x of ['0.3', '-1.2', '2']) {
				const before = nerdamer(source).evaluate({ x }).text({ decimal: true });
				const after = nerdamer(simplified).evaluate({ x }).text({ decimal: true });
				expect(Math.abs(Number(before) - Number(after))).toBeLessThan(1e-15);
			}
		}
	});

	it('does not rewrite erfc outside simplify', () => {
		expect(nerdamer('erf(x)+erfc(x)').text()).toEqual('erf(x)+erfc(x)');
		expect(nerdamer('erfc(x)').evaluate({ x: '7' }).text()).toEqual(
			'4.1838256077794143986e-23'
		);
	});
});
