import { Expression } from '../../src/core/classes/expression/Expression';
import nerdamer from '../../src/index';

describe('Comparisons with infinity', () => {
	it.each([
		// Infinity against a constant.
		['Infinity>2', '1'],
		['Infinity>=2', '1'],
		['Infinity<2', '0'],
		['2<Infinity', '1'],
		['-Infinity<0', '1'],
		['2>-Infinity', '1'],
		['Infinity>pi', '1'],
		['-Infinity<-10^30', '1'],
		// Infinity against infinity.
		['Infinity==Infinity', '1'],
		['Infinity==-Infinity', '0'],
		['Infinity!=2', '1'],
		['Infinity>-Infinity', '1'],
		['Infinity>Infinity', '0'],
		['Infinity>=Infinity', '1'],
		// A variable or an infinity in an unknown direction can't be ordered.
		['Infinity>x', '0'],
		['x*Infinity>2', '0'],
	])('%s gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});

	it('orders infinity in the Expression methods', () => {
		const infinity = Expression.create('Infinity');
		expect(infinity.gt(2)).toBe(true);
		expect(infinity.lt(2)).toBe(false);
		expect(Expression.create(2).lte(infinity)).toBe(true);
		expect(infinity.eq('Infinity')).toBe(true);
		expect(infinity.eq('-Infinity')).toBe(false);
	});
});

describe('max and min with infinity', () => {
	it.each([
		['max(Infinity,2)', 'Inf'],
		['max(2,Infinity)', 'Inf'],
		['min(Infinity,2)', '2'],
		['min(2,Infinity)', '2'],
		['min(-Infinity,5)', '-Inf'],
		['max(-Infinity,5)', '5'],
		['max(-Infinity,Infinity,3)', 'Inf'],
		['max(Infinity,Infinity)', 'Inf'],
		// A variable keeps the call.
		['max(Infinity,x)', 'max(Inf, x)'],
	])('%s gives %s', (input, expected) => {
		expect(nerdamer(input).text()).toBe(expected);
	});
});
