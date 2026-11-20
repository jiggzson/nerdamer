import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';

/** The decimal value of an expression's real or imaginary part. */
function part(x: Expression, real: boolean): number {
	return Number((real ? x.realPart() : x.imagPart()).evaluate().text({ decimal: true }));
}

// A rational power too large to compute exactly stays a symbolic power, so the components of
// an integer power must not rely on the power reducing.
describe('Components of integer powers that stay symbolic', () => {
	const t = '0.83534240898795743893+0.87622730591038080789*i';

	it.each([
		['(83534240898795743893/100000000000000000000)^3', ['0.58289937705603840663', '0']],
		['(-83534240898795743893/100000000000000000000)^3', ['-0.58289937705603840663', '0']],
		['2*(83534240898795743893/100000000000000000000)^3', ['1.16579875411207681326', '0']],
	] as [string, [string, string]][])('decomposes %s', (source, [re, im]) => {
		const x = Expression.create(source);
		expect(part(x, true)).toBeCloseTo(Number(re), 15);
		expect(part(x, false)).toBeCloseTo(Number(im), 15);
	});

	// Values from mpmath 1.3 at 30 digits.
	it.each([
		['t^3', ['-1.3411639019140096635', '1.1615413999972519359']],
		['t^3+t+1', ['0.49417850707394777541', '2.0377687059076327438']],
	] as [string, [string, string]][])(
		'evaluates %s at a 20-digit complex t',
		(source, [re, im]) => {
			const value = nerdamer(source, { t }).evaluate();
			const real = nerdamer('realpart(v)', { v: value }).evaluate().text({ decimal: true });
			const imaginary = nerdamer('imagpart(v)', { v: value })
				.evaluate()
				.text({ decimal: true });
			expect(Number(real)).toBeCloseTo(Number(re), 15);
			expect(Number(imaginary)).toBeCloseTo(Number(im), 15);
		}
	);
});
