import { Expression } from '../../src/core/classes/expression/Expression';
import { polarForm, rectForm } from '../../src/core/functions/complex';
import '../../src/index';

describe('legacy #181 polar and rectangular conversion', () => {
	// z = |z| exp(i Arg(z)); Nerdamer uses Arg(0) = 0 by convention.
	// See NIST DLMF §1.9, https://dlmf.nist.gov/1.9
	it.each([
		['0'],
		['3'],
		['-3'],
		['2*i'],
		['-2*i'],
		['3+4*i'],
		['-3+4*i'],
		['-3-4*i'],
		['3-4*i'],
		['3/5+4*i/5'],
		['1+i'],
		['-1-i'],
	] as const)('preserves %s through a polar-rectangular round trip', input => {
		const original = Expression.create(input).evaluate();
		const result = rectForm(polarForm(original)).evaluate();
		expect(result.minus(original).evaluate().isNearlyZero()).toBe(true);
	});

	it.each([
		['e^(i*0)', '1'],
		['e^(i*pi/2)', 'i'],
		['e^(-i*pi/2)', '-i'],
		['e^(i*pi)', '-1'],
	] as const)('recovers the cardinal rectangular value for %s', (input, expected) => {
		const actual = rectForm(Expression.create(input)).evaluate();
		const reference = Expression.create(expected).evaluate();
		expect(actual.minus(reference).evaluate().isNearlyZero()).toBe(true);
	});

	// Unknown real signs must remain in atan2 instead of selecting a quadrant.
	it.each([
		['x+i', 'atan2(1, x)'],
		['x-i', 'atan2(-1, x)'],
		['i*x', 'atan2(x, 0)'],
	] as const)('preserves symbolic angle information for %s', (input, angle) => {
		const polar = polarForm(Expression.create(input));
		expect(polar.text()).toContain(angle);
	});
});
