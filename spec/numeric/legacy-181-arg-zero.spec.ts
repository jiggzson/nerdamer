import { Expression } from '../../src/core/classes/expression/Expression';
import { arg, toPolarFormArray } from '../../src/core/functions/complex';
import '../../src/index';

describe('legacy #181 zero principal argument convention', () => {
	// DLMF §4.2 leaves Arg(0) undefined. Nerdamer instead uses arg(0) = 0
	// consistently with its internal zero-radius polar decomposition.
	it('uses zero for the argument of zero by convention', () => {
		expect(arg(Expression.create('0')).isZero()).toBe(true);
		expect(Expression.create('arg(0)').evaluate().isZero()).toBe(true);
		expect(Expression.create('arg(0*i)').evaluate().isZero()).toBe(true);
	});

	it('preserves the internal zero-radius decomposition', () => {
		const [radius, angle] = toPolarFormArray(Expression.create('0'));
		expect(radius.isZero()).toBe(true);
		expect(angle.isZero()).toBe(true);
	});

	it.each([
		['2', '0'],
		['-2', 'pi'],
		['2*i', 'pi/2'],
		['-2*i', '-pi/2'],
		['1+i', 'pi/4'],
	] as const)('retains principal argument at %s', (input, expected) => {
		const actual = arg(Expression.create(input)).evaluate();
		const reference = Expression.create(expected).evaluate();
		expect(actual.minus(reference).evaluate().isNearlyZero()).toBe(true);
	});
});
