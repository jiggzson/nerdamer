import { Parser } from '../../src/core/classes/parser/Parser';

describe('Derivative', () => {
	it('power rule and polynomials', () => {
		expect(Parser.parse('diff((5/8)*x^2,x)').text()).toEqual('(5/4)*x');
		expect(Parser.parse('diff(x^2+2*x+1,x)').text()).toEqual('2+2*x');
	});

	it('functions', () => {
		expect(Parser.parse('diff(5*sin(x),x)').text()).toEqual('5*cos(x)');
		expect(Parser.parse('diff(5*cos(x),x)').text()).toEqual('-5*sin(x)');
		expect(Parser.parse('diff(5*sin(x)^2,x)').text()).toEqual('10*cos(x)*sin(x)');
		expect(Parser.parse('diff(5*cos(x)^2,x)').text()).toEqual('-10*sin(x)*cos(x)');
		expect(Parser.parse('diff(5*sin(x^2)^2,x)').text()).toEqual('20*x*cos(x^2)*sin(x^2)');
		expect(Parser.parse('diff(5*cos(x^2)^2,x)').text()).toEqual('-20*x*sin(x^2)*cos(x^2)');
		expect(Parser.parse('diff(5*tan(x),x)').text()).toEqual('5*sec(x)^2');
		expect(Parser.parse('diff(5*tan(x)^2,x)').text()).toEqual('10*sec(x)^2*tan(x)');
		// Use the chain rule with the remaining functions as this covers the implementation fully
		expect(Parser.parse('diff(5*log(x^2)^2,x)').text()).toEqual('40*x^-1*log(x)');
		expect(Parser.parse('diff(5*sec(x^2)^2,x)').text()).toEqual('20*tan(x^2)*sec(x^2)^2*x');
		expect(Parser.parse('diff(5*csc(x^2)^2,x)').text()).toEqual('-20*cot(x^2)*csc(x^2)^2*x');
		expect(Parser.parse('diff(5*cot(x^2)^2,x)').text()).toEqual('-20*x*csc(x^2)^2*cot(x^2)');
		expect(Parser.parse('diff(5*acos(x^2)^2,x)').text()).toEqual(
			'-20*x*((1-x^4)^(-1/2))*acos(x^2)'
		);
		expect(Parser.parse('diff(5*asin(x^2)^2,x)').text()).toEqual(
			'20*x*((1-x^4)^(-1/2))*asin(x^2)'
		);
		expect(Parser.parse('diff(5*atan(x^2)^2,x)').text()).toEqual('20*x*((1+x^4)^-1)*atan(x^2)');
		expect(Parser.parse('diff(5*asec(x^2)^2,x)').text()).toEqual(
			'20*x*asec(x^2)*(x^4*((1-x^-4)^(1/2)))^-1'
		);
		expect(Parser.parse('diff(5*acsc(x^2)^2,x)').text()).toEqual(
			'-20*x*acsc(x^2)*(x^4*((1-x^-4)^(1/2)))^-1'
		);
	});

	it('additional coverage', () => {
		expect(Parser.parse('diff(x*y+sin(y),x)').text()).toEqual('y');
		expect(Parser.parse('diff(x*y+sin(y),y)').text()).toEqual('x+cos(y)');
		expect(Parser.parse('diff((x+y)^3,x)').text()).toEqual('3*(x+y)^2');

		expect(Parser.parse('diff((x+1)/(x-1),x)').text()).toEqual('-((-1+x)^-2)*(1+x)+(-1+x)^-1');
		expect(Parser.parse('diff(1/(x*(2+3*x)),x)').text()).toEqual(
			'-(x^2*((2+3*x)^2))^-1*(2+6*x)'
		);

		expect(Parser.parse('diff((2*x)^3*sin(x),x)').text()).toEqual(
			'8*(3*x^2*sin(x)+x^3*cos(x))'
		);
		expect(Parser.parse('diff(5*(x+1)^3*(x-1),x)').text()).toEqual(
			'5*(3*((1+x)^2)*(-1+x)+(1+x)^3)'
		);

		expect(Parser.parse('diff((x+1)^(x-1),x)').text()).toEqual(
			'(1+x)^(-1+x)*(log(1+x)+((1+x)^-1)*(-1+x))'
		);
		expect(Parser.parse('diff(sin(x)^cos(x),x)').text()).toEqual(
			'sin(x)^cos(x)*(-sin(x)*log(sin(x))+sin(x)^-1*cos(x)^2)'
		);
		expect(Parser.parse('diff(x^sin(x),x)').text()).toEqual(
			'x^sin(x)*(x^-1*sin(x)+cos(x)*log(x))'
		);
		expect(Parser.parse('diff(2^x,x)').text()).toEqual('2^x*log(2)');

		expect(Parser.parse('diff(log(sin(x^2)),x)').text()).toEqual('2*x*cos(x^2)*sin(x^2)^-1');
		expect(Parser.parse('diff(cos(log(x^3)),x)').text()).toEqual('-3*x^-1*sin(3*log(x))');

		expect(Parser.parse('diff(abs(x^2+1),x)').text()).toEqual('2*x');
	});
});
