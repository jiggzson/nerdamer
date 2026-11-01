import { Expression } from '../../src/core/classes/expression/Expression';
import '../../src/index';

describe('legacy #181 inverse hyperbolic cut symmetry', () => {
	// NIST DLMF §4.37(ii) defines principal branches in the cut plane.
	// https://dlmf.nist.gov/4.37
	const conjugateCases = [
		['asinh', '1+2*i', '1-2*i'],
		['asinh', '-1+2*i', '-1-2*i'],
		['acosh', '1+i', '1-i'],
		['acosh', '-2+i', '-2-i'],
		['atanh', '2+i', '2-i'],
		['atanh', '-2+i', '-2-i'],
		['atanh', 'i/2', '-i/2'],
	] as const;

	it.each(conjugateCases)('preserves off-cut conjugation for %s at %s', (name, input, conjugated) => {
		const value = Expression.create(`${name}(${input})`).evaluate();
		const opposite = Expression.create(`${name}(${conjugated})`).evaluate();
		const conjugateValue = value.realPart().minus(Expression.Img().times(value.imagPart()));
		expect(conjugateValue.minus(opposite).evaluate().isNearlyZero()).toBe(true);
	});

	// Values approached from opposite sides of a cut can differ. Check their
	// component signs instead of equating them to the exact-cut value.
	const cutCases = [
		['asinh', '2*i', '1/1000+2*i', '-1/1000+2*i', 'real'],
		['asinh', '-2*i', '1/1000-2*i', '-1/1000-2*i', 'real'],
		['acosh', '-2', '-2+i/1000', '-2-i/1000', 'imaginary'],
		['acosh', '1/2', '1/2+i/1000', '1/2-i/1000', 'imaginary'],
		['atanh', '2', '2+i/1000', '2-i/1000', 'imaginary'],
		['atanh', '-2', '-2+i/1000', '-2-i/1000', 'imaginary'],
	] as const;

	it.each(cutCases)('preserves opposite cut-side signs for %s at %s', (name, _cut, upper, lower, component) => {
		const upperValue = Expression.create(`${name}(${upper})`).evaluate();
		const lowerValue = Expression.create(`${name}(${lower})`).evaluate();
		const upperPart = component === 'real' ? upperValue.realPart() : upperValue.imagPart();
		const lowerPart = component === 'real' ? lowerValue.realPart() : lowerValue.imagPart();
		expect(upperPart.gt(0)).toBe(true);
		expect(lowerPart.lt(0)).toBe(true);
	});
});
