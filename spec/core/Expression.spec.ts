import { Expression } from '../../src/core/classes/expression/Expression';

describe('getNumerator', () => {
	it('should get the numerator correctly', () => {
		expect(Expression.create('a*(x+1)/(x^2+2*x+1)').getNumerator().text()).toEqual('a*(1+x)');
		expect(Expression.create('a/x+8').getNumerator().text()).toEqual('8+a*x^-1');
		expect(Expression.create('(a*(x*(x+2)^-2))').getNumerator().text()).toEqual('a*x');
		expect(Expression.create('a/((x+1)*(a+b))').getNumerator().text()).toEqual('a');
		expect(Expression.create('(1/2)*(x+1)').getNumerator().text()).toEqual('1+x');
		expect(Expression.create('2/x').getNumerator().text()).toEqual('2');
		expect(Expression.create('2/x^x').getNumerator().text()).toEqual('2');
	});
});
describe('getDenominator', () => {
	it('should get the numerator correctly', () => {
		expect(Expression.create('a*(x+1)/(x^2+2*x+1)').getDenominator().text()).toEqual(
			'1+2*x+x^2'
		);
		expect(Expression.create('a/x+8').getDenominator().text()).toEqual('1');
		expect(Expression.create('(a*(x*(x+2)^-2))').getDenominator().text()).toEqual('(2+x)^2');
		expect(Expression.create('a/((x+1)*(a+b))').getDenominator().text()).toEqual('(1+x)*(a+b)');
		expect(Expression.create('(1/2)*(x+1)').getDenominator().text()).toEqual('2');
		expect(Expression.create('2/x').getDenominator().text()).toEqual('x');
		expect(Expression.create('2/x^x').getDenominator().text()).toEqual('x^x');
		expect(Expression.create('5/(8*x^cos(x))').getDenominator().text()).toEqual('8*x^cos(x)');
	});
});
