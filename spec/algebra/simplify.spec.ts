import { simplify } from '../../src/algebra/simplify/simplify';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';

const text = (expr: string | number) => Expression.create(expr).text();

describe('Simplify', () => {
	// TODO: These can be handled with simplify
	it('should simplify square roots', () => {
		expect(Parser.parse('2*sqrt(4*x)').text()).toEqual('4*x^(1/2)');
		expect(Parser.parse('sqrt(128/49)').text()).toEqual('(8/7)*2^(1/2)');
		expect(Parser.parse('expand((sqrt(7)+3sqrt(2))(sqrt(7)-3sqrt(2)))').text()).toEqual('-11');
		expect(Parser.parse('(1/2)*x^(1/2)+sqrt(x)').text()).toEqual('(3/2)*x^(1/2)');
		expect(Parser.parse('sqrt((4+x)^2)').text()).toEqual('abs(4+x)');
		expect(Parser.parse('sqrt(2/x)').text()).toEqual('2^(1/2)*x^(-1/2)');
		expect(Parser.parse('sqrt(2)*sqrt(8)').text()).toEqual('4');
		expect(Parser.parse('sqrt(2*x^2)^2').text()).toEqual('2*x^2');
		expect(Parser.parse('sqrt(4)^-1').text()).toEqual('1/2');
		expect(Parser.parse('sqrt(4*x^2)').text()).toEqual('2*abs(x)');
		expect(Parser.parse('74689676.31109099*sqrt(5578547747455547)').text()).toEqual(
			'74689676.31109099*5578547747455547^(1/2)'
		);
		expect(Parser.parse('2*sqrt(3/4)').text()).toEqual('3^(1/2)');
		expect(Parser.parse('sqrt(242)').text()).toEqual('11*2^(1/2)');
		expect(Parser.parse('sqrt(2)-2/(sqrt(2))').text()).toEqual('0');
		expect(Parser.parse('sqrt(x^2)*sqrt(x^4)').text()).toEqual('abs(x)^3');
		expect(Parser.parse('sqrt(5)*sqrt(2)^-1*abs(x^5)').text()).toEqual(
			'(1/2)*2^(1/2)*5^(1/2)*abs(x^5)'
		);
		expect(Parser.parse('sqrt(4*sqrt(2)^(-1)*x^(1/2))').text()).toEqual('2^(3/4)*x^(1/4)');
		expect(Parser.parse('sqrt(3^x)').text()).toEqual('(3^x)^(1/2)');
	});

	it('should simplify square roots', () => {
		expect(simplify('sqrt(1/2)*7^(1/5)*sqrt(5/6)').text()).toEqual('(1/6)*7^(1/5)*15^(1/2)');
		expect(simplify('3*sqrt(2)*2*sqrt(6)').text()).toEqual('12*3^(1/2)');
		expect(simplify('sqrt(5)*sqrt(2)^-1*abs(x^5)').text()).toEqual('(1/2)*10^(1/2)*abs(x^5)');
		expect(simplify('sqrt(1/2)*7^(1/5)*sqrt(5/6)').text()).toEqual('(1/6)*7^(1/5)*15^(1/2)');
		expect(simplify('(1/6)*sqrt(3)').text()).toEqual('(1/6)*3^(1/2)');
		expect(simplify('3*sqrt(1/2)^5').text()).toEqual('(3/8)*2^(1/2)');
		expect(simplify('sqrt(1/2)').text()).toEqual('(1/2)*2^(1/2)');
		expect(simplify('3*sqrt(2)*2*sqrt(6)').text()).toEqual('12*3^(1/2)');
		expect(simplify('sqrt(4*sqrt(2)^(-1)*x^(1/2))').text()).toEqual('2^(3/4)*x^(1/4)');
		expect(simplify('sqrt(2/x)').text()).toEqual('2^(1/2)*x^(-1/2)');
	});

	it('should simplify factors', () => {
		expect(simplify('a*(x+1)/(x^2+2*x+1)').text()).toEqual(text('a/(1+x)'));
		expect(simplify('(-x+x^2+1)/(x-x^2-1)').text()).toEqual('-1');
		expect(simplify('(a+27)/(a^(1/3)+3)').text()).toEqual('9+a^(2/3)-3*a^(1/3)');
		expect(
			simplify(
				'(-(25*x^3*y)-35*x^2*y-5*b*x*y-7*b*y+5*b*x^2+b^2)/(-(10*x^2*y)-29*x*y-21*y+2*b*x+3*b)'
			).text()
		).toEqual(text('(b+5*x^2)/(3+2*x)'));
	});

	it('should simplify factorials', () => {
		expect(simplify('x*n!/((n+1)!*a)').text()).toEqual('x*(a*(1+n))^-1');
	});

	it('should simplify rationals', () => {
		expect(
			simplify(
				'((17/2)*(-5*K+32)^(-1)*K^2+(5/2)*K-125*(-5*K+32)^(-1)*K-16+400*(-5*K+32)^(-1))*(-17*(-5*K+32)^(-1)*K+80*(-5*K+32)^(-1))^(-1)'
			).text()
		).toEqual('(112-35*K+4*K^2)*((-80+17*K)^-1)');
		expect(simplify('(8/J)/(x/y+a/b+1)').text()).toEqual('8*b*y*(J*(a*y+b*x+b*y))^-1');
		expect(simplify('a/b+b/a').text()).toEqual('(a*b)^-1*(a^2+b^2)');
		expect(simplify('(-3/2)x+(1/3)y+2+z').text()).toEqual('(-1/6)*(9*x-2*y-6*z-12)');
		expect(
			simplify(
				'(x*sin(x))/(4*a*x^2-5*a*x+4*x-5)+sin(x)/(4*a*x^2-5*a*x+4*x-5)+(x*cos(x))/(4*a*x^2-5*a*x+4*x-5)+cos(x)/(4*a*x^2-5*a*x+4*x-5)'
			).text()
		).toEqual('((-5+4*x)*(1+a*x))^-1*(cos(x)+sin(x)+x*cos(x)+x*sin(x))');
	});

	it('should respect general guards and simplifications', () => {
		expect(simplify('4*((a+b)^2)/c').text()).toEqual('4*c^-1*((a+b)^2)');
		expect(simplify('4/((a+b)^2)').text()).toEqual('4*(a+b)^-2');
	});

	it('should simplify sums of differences and differences of sums', () => {
		expect(simplify('(a-b)/(b-a)').text()).toEqual('-1');
		expect(simplify('(a-b)^3 - (b-a)^3 ').text()).toEqual('2*(a-b)^3');
		expect(simplify('(a-b)^2-(b-a)^2').text()).toEqual('0');
		expect(simplify('a+(a-b)^2-(b-a)^2').text()).toEqual('a');
		expect(simplify('(x-3)^2 - (3-x)^2').text()).toEqual('0');
	});

	it('should simplify trig identities', () => {
		expect(simplify('sin(x)^2+cos(x)^2').text()).toEqual('1');
		expect(simplify('1/2*sin(x^2)^2+cos(x^2)^2').text()).toEqual('(1/2)*(1+cos(x^2)^2)');
		// expect(simplify('0.75*sin(x^2)^2+cos(x^2)^2').text()).toEqual('0.25*(3.0+cos(x^2)^2)');
		expect(simplify('cos(x)^2+sin(x)^2+cos(x)-tan(x)-1+sin(x^2)^2+cos(x^2)^2').text()).toEqual(
			'cos(x)-sin(x)*cos(x)^-1+1'
		);
	});

	it('should simplify polynomial quotients', () => {
		expect(simplify('(x^2+4*x-45)/(x^2+x-30)').text()).toEqual('(9+x)*((6+x)^-1)');
		expect(simplify('1/(x-1)+1/(1-x)').text()).toEqual('0');
		expect(simplify('(x-1)/(1-x)').text()).toEqual('-1');
		expect(simplify('(x^2+2*x+1)/(x+1)').text()).toEqual('1+x');
		expect(simplify('(- x + x^2 + 1)/(x - x^2 - 1)').text()).toEqual('-1');
	});

	it('should simplify expressions with e', () => {
		expect(simplify('((2*e^t)/(e^t))+(1/(e^t))').text()).toEqual('e^(-t)*(1+2*e^t)');
	});

	it('should simplify expressions with powers of sums', () => {
		expect(simplify('((a+b)^2)/c').text()).toEqual('c^-1*((a+b)^2)');
	});

	it('should simplify negated expressions', () => {
		expect(simplify('-(-5*x - 9 + 2*y)').text()).toEqual('5*x-2*y+9');
	});

	it('should simplify the hard ones', () => {
		expect(
			simplify(
				'(20*asec(x^2))/(sqrt(1-1/x^4)*x^3)-(20*acos(1/x^2))/(sqrt(1-1/x^4)*x^3)'
			).text()
		).toEqual('0');
		expect(
			simplify(
				'(20*asin(1/x^2))/(sqrt(1-1/x^4)*x^3)-(20*acsc(x^2))/(sqrt(1-1/x^4)*x^3)'
			).text()
		).toEqual('0');
	});

	// Pending: factorial cancellation bug
	it('should simplify factorials via Parser.parse', () => {
		expect(Parser.parse('simplify(n!/(n+1)!)').text()).toEqual('(1+n)^-1');
	});

	// Pending: complex number simplification bugs
	it('should simplify complex number expressions', () => {
		expect(simplify('(17/2)*(-10+8*i)^(-1)-5*(-10+8*i)^(-1)*i').text()).toEqual(
			'(-1/164)*(125+18*i)'
		);
		expect(simplify('(-2*i+7)^(-1)*(3*i+4)').text()).toEqual('(1/53)*(22+29*i)');
	});
});

/* Pending
(1/2)*log(x)+(-1/2)*log(2+3*x) -> (1/2)*log(x*((2+3*x)^-1))
log(x)-log(1+x) ->log(x*((1+x)^-1))
*/
