import { Expression } from '../../src/core/classes/expression/Expression';
import '../../src/index';

describe('legacy #181 complex special-function branches', () => {
	// NIST DLMF §§6.2, 7.2: erf and Si are odd and entire.
	// Ci and Ei have principal logarithmic cuts; Ei also has a
	// real principal-value convention on the negative real axis.
	const points = ['1+i', '-1+2*i', '2+i/2'] as const;

	it.each(['erf', 'Si', 'Ci', 'Ei'] as const)('preserves %s conjugation off cuts', name => {
		for (const point of points) {
			const z = Expression.create(point);
			const conjugatedPoint = z.realPart().minus(Expression.Img().times(z.imagPart()));
			const original = Expression.create(`${name}(${point})`).evaluate();
			const conjugated = Expression.create(`${name}(${conjugatedPoint.text()})`).evaluate();
			const expected = original.realPart().minus(Expression.Img().times(original.imagPart()));
			expect(conjugated.minus(expected).evaluate().isNearlyZero()).toBe(true);
		}
	});

	it.each(['erf', 'Si'] as const)('preserves %s oddness', name => {
		for (const point of points) {
			const positive = Expression.create(`${name}(${point})`).evaluate();
			const negative = Expression.create(`${name}(-(${point}))`).evaluate();
			expect(positive.plus(negative).evaluate().isNearlyZero()).toBe(true);
		}
	});

	it.each(['-1', '-2'] as const)('keeps Ci upper and lower banks at %s distinct', point => {
		const onAxis = Expression.create(`Ci(${point})`).evaluate();
		const above = Expression.create(`Ci(${point}+i/1000)`).evaluate();
		const below = Expression.create(`Ci(${point}-i/1000)`).evaluate();
		expect(onAxis.imagPart().minus(Expression.Pi()).evaluate().isNearlyZero()).toBe(true);
		expect(above.imagPart().gt(0)).toBe(true);
		expect(below.imagPart().lt(0)).toBe(true);
	});

	it.each(['-1', '-2'] as const)('keeps Ei real principal value at %s', point => {
		const onAxis = Expression.create(`Ei(${point})`).evaluate();
		const above = Expression.create(`Ei(${point}+i/1000)`).evaluate();
		const below = Expression.create(`Ei(${point}-i/1000)`).evaluate();
		expect(onAxis.imagPart().isZero()).toBe(true);
		expect(above.imagPart().gt(0)).toBe(true);
		expect(below.imagPart().lt(0)).toBe(true);
	});

	it.each([
		'Shi(1+i)', 'Shi(1-i)', 'Chi(1+i)', 'Chi(1-i)',
		'Si(9+i)', 'Ci(9+i)', 'Ei(9+i)', 'erf(13+i)',
	] as const)('preserves the supported numerical evaluation boundary for %s', input => {
		expect(Expression.create(input).evaluate().text()).toEqual(input);
	});
});
