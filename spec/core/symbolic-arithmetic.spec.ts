import nerdamer from '../../src/index';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('Symbolic arithmetic construction', () => {
	it('should handle zero correctly', () => {
		expect(Parser.parse('a+0').text()).toEqual('a');
		expect(Parser.parse('a-0').text()).toEqual('a');
		expect(Parser.parse('0+a').text()).toEqual('a');
		expect(Parser.parse('0-a').text()).toEqual('-a');
		expect(Parser.parse('0+0').text()).toEqual('0');
		expect(Parser.parse('a*0').text()).toEqual('0');
		expect(Parser.parse('a*0').text()).toEqual('0');
		expect(Parser.parse('0*0').text()).toEqual('0');
		expect(Parser.parse('0/a').text()).toEqual('0');
		expect(Parser.parse('a^0').text()).toEqual('1');
		expect(Parser.parse('10^0').text()).toEqual('1');
		expect(Parser.parse('-10^0').text()).toEqual('-1');
	});


	it('should perform basic operations with variables', () => {
		expect(Parser.parse('x-y').text()).toEqual('x-y');
		expect(Parser.parse('x+1').text()).toEqual('1+x');
		expect(Parser.parse('x+y').text()).toEqual('x+y');
		expect(Parser.parse('(x+1)+(1+x)').text()).toEqual('2+2*x');
		expect(Parser.parse('8*(x+1)-3*(1+x)').text()).toEqual('5+5*x');
		expect(Parser.parse('4*(x+1)-4*(1+x)').text()).toEqual('0');
		expect(Parser.parse('0-x-2*x+6').text()).toEqual('6-3*x');
		expect(Parser.parse('(x+y)+(a+x)').text()).toEqual('2*x+y+a');
		expect(Parser.parse('x^y+x^y').text()).toEqual('2*x^y');
		expect(Parser.parse('9+(x+1)-(1+x)').text()).toEqual('9');
		expect(Parser.parse('7*(x+y)+2*(a+x)').text()).toEqual('9*x+7*y+2*a');
		expect(Parser.parse('-x*x').text()).toEqual('-x^2');
		expect(Parser.parse('-x*-x').text()).toEqual('x^2');
		expect(Parser.parse('x-x').text()).toEqual('0');
		expect(Parser.parse('-x+x').text()).toEqual('0');
		expect(Parser.parse('x*2').text()).toEqual('2*x');
		expect(Parser.parse('x*y').text()).toEqual('x*y');
		expect(Parser.parse('x^x').text()).toEqual('x^x');
		expect(Parser.parse('x^(x)').text()).toEqual('x^x');
		expect(Parser.parse('x*y*z-7*a*b').text()).toEqual('x*y*z-7*a*b');
		expect(Parser.parse('7*x*y*z-7*x*y*z').text()).toEqual('0');
		expect(Parser.parse('7*x*y*z-6*x*y*z').text()).toEqual('x*y*z');
		expect(Parser.parse('(x-1)^2-(x-1)^2').text()).toEqual('0');
		expect(Parser.parse('(-5(x/2-5)/4)^0').text()).toEqual('1');
		expect(Parser.parse('y^y^3').text()).toEqual('y^y^3');
	});


	it('should simplify correctly', () => {
		expect(Parser.parse('((1+x)^(-2))+((1+x)^(-1))+((1+x)^(-1))+(1)').text()).toEqual(
			'1+(1+x)^-2+2*(1+x)^-1'
		);
		expect(Parser.parse('(x^(1/2)*x^(1/3))-x^(5/6)').text()).toEqual('0');
		expect(Parser.parse('(x-1)^2+(x-1)^2').text()).toEqual('2*(-1+x)^2');
		expect(Parser.parse('9*(x+1+y)+(x+1)').text()).toEqual('10+10*x+9*y');
		expect(Parser.parse('x+x').text()).toEqual('2*x');
		expect(Parser.parse('2*x*x').text()).toEqual('2*x^2');
		expect(Parser.parse('(x+x^2)+x').text()).toEqual('2*x+x^2');
		expect(Parser.parse('(x+1)+4').text()).toEqual('5+x');
		expect(Parser.parse('x+x+1+x').text()).toEqual('1+3*x');
		expect(Parser.parse('(x+1)+(8+y)').text()).toEqual('9+x+y');
		expect(Parser.parse('(x+1)+(a+y)').text()).toEqual('1+x+a+y');
		expect(Parser.parse('(x+x^2)+(x^3+x)').text()).toEqual('2*x+x^2+x^3');
		expect(Parser.parse('3*(x+x^2)+5*(x^3+x)').text()).toEqual('8*x+3*x^2+5*x^3');
		expect(Parser.parse('2*(1+x)*3*(z+x)^x*8').text()).toEqual('48*(z+x)^x*(1+x)');
		expect(Parser.parse('(x+x^2)*(x+x^2)').text()).toEqual('(x+x^2)^2');
		expect(Parser.parse('(x+x^2)*2*(x+x^2)').text()).toEqual('2*(x+x^2)^2');
		expect(Parser.parse('(x*y)*(x*y)').text()).toEqual('(x*y)^2');
		expect(Parser.parse('(x*y)*(x*z)').text()).toEqual('x^2*y*z');
		expect(Parser.parse('(x+y)*(x+y)').text()).toEqual('(x+y)^2');
		expect(Parser.parse('(x+y)*(y+x)').text()).toEqual('(x+y)^2');
		expect(Parser.parse('(1+x)*(x+y)').text()).toEqual('(1+x)*(x+y)');
		expect(Parser.parse('x*y*x').text()).toEqual('x^2*y');
		expect(Parser.parse('x*y*x/x').text()).toEqual('x*y');
		expect(Parser.parse('3*(x^2+1)^x*(2*(x^2+1))').text()).toEqual('6*(1+x^2)^(1+x)');
		expect(Parser.parse('2*(x+x^2)+1').text()).toEqual('1+2*x+2*x^2');
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)').text()).toEqual('2*x+5*x^2+3*x^3');
		expect(Parser.parse('(x+1)/(x+1)').text()).toEqual('1');
	});


	it('should properly collapse expressions', () => {
		expect(Parser.parse('(x+1)^x*(z+1)^z*(x+1)').text()).toEqual('(1+z)^z*(1+x)^(1+x)');
		expect(Parser.parse('(17/2)*K^2*((32-5*K)^-1)*(32-5*K)').text()).toEqual('(17/2)*K^2');
	});


	it('should pass existing parser tests', () => {
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)^2').text()).toEqual('2*x+3*(x^2+x^3)^2+2*x^2');
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)^2+x').text()).toEqual('3*x+3*(x^2+x^3)^2+2*x^2');
		expect(Parser.parse('2*(x+x^2)+3*(x^2+x^3)^2+(x^2+x)').text()).toEqual(
			'3*x+3*(x^2+x^3)^2+3*x^2'
		);
		expect(Parser.parse('2*(x+x^2)^2+3*(x^2+x)^2').text()).toEqual('5*(x+x^2)^2');
		expect(Parser.parse('2*(x+x^2)^2+2*(x+x^2)^3+4*(x+x^2)^2').text()).toEqual(
			'6*(x+x^2)^2+2*(x+x^2)^3'
		);
		expect(Parser.parse('2*x^2+3*x+y+y^2').text()).toEqual('y+y^2+3*x+2*x^2');
		expect(Parser.parse('(y+y^2)^6+y').text()).toEqual('y+(y+y^2)^6');
		expect(Parser.parse('x*cos(n)*y^-1*((3+n)^-1)*cos(n)^-1').text()).toEqual(
			'((3+n)^-1)*x*y^-1'
		);
		expect(Parser.parse('2*(x+x^2)+(y+y^2)^6+y').text()).toEqual('2*x+2*x^2+y+(y+y^2)^6');
		expect(Parser.parse('2*(x+x^2)+4').text()).toEqual('4+2*x+2*x^2');
		expect(Parser.parse('2*(x+x^2)+(48+x+2*y)').text()).toEqual('48+3*x+2*x^2+2*y');
		expect(Parser.parse('(x^2+1)-1').text()).toEqual('x^2');
		expect(Parser.parse('(x^2+1)-1+x+x^3+x').text()).toEqual('2*x+x^2+x^3');
		expect(Parser.parse('5+(x^2+y+1)+(x+y+15)').text()).toEqual('x+x^2+2*y+21');
		expect(Parser.parse('(x^2+y+1)+(x+y+15)+(x^2+y+1)').text()).toEqual('x+2*x^2+3*y+17');
		expect(Parser.parse('(x^2+y+1)+(x+x^2)').text()).toEqual('x+2*x^2+y+1');
		expect(Parser.parse('(1+(1+x)^2)').text()).toEqual('1+(1+x)^2');
		expect(Parser.parse('(x+x)^x').text()).toEqual('2^x*x^x');
		expect(Parser.parse('x^2+x-x^y+x').text()).toEqual('2*x+x^2-x^y');
		expect(Parser.parse('x^x+x^x-1-2*x^x').text()).toEqual('-1');
		expect(Parser.parse('x^x+x^x-1-2*x^x+2*y+1-2*y').text()).toEqual('0');
		expect(Parser.parse('(x+1)-x*y-5+2*x*y').text()).toEqual('-4+x+x*y');
		expect(Parser.parse('(2*x-y+7-x+y-x-5)*2+15/3').text()).toEqual('9');
		expect(Parser.parse('(x+x^2)^x*x').text()).toEqual('x*(x+x^2)^x');
		expect(Parser.parse('(x+x^2)^x*(x+x^x)').text()).toEqual('(x+x^2)^x*(x+x^x)');
		expect(Parser.parse('(x+x^2)^2*x').text()).toEqual('x*((x+x^2)^2)');
		expect(Parser.parse('(z+z^2)^x*(x+y^2+1)').text()).toEqual('(z+z^2)^x*(x+y^2+1)');
		expect(Parser.parse('2*(x+x^2)+48*x*y').text()).toEqual('2*x+2*x^2+48*x*y');
		expect(Parser.parse('1/4*2^x*x^x').text()).toEqual('(1/4)*2^x*x^x');
		expect(Parser.parse('x*y*z/(x*y*z)').text()).toEqual('1');
		expect(Parser.parse('x^y/x^y').text()).toEqual('1');
		expect(Parser.parse('4*x^2').text()).toEqual('4*x^2');
		expect(Parser.parse('5*x^y/x^y').text()).toEqual('5');
		expect(Parser.parse('(x+x^6)^y/(x+x^6)^y').text()).toEqual('1');
		expect(Parser.parse('2^y*2^y').text()).toEqual('2^(2*y)');
		expect(Parser.parse('2^x').text()).toEqual('2^x');
		expect(Parser.parse('((x^3+x)^x*(x^2+x)^x+1)*x').text()).toEqual(
			'x*(1+(x+x^3)^x*(x+x^2)^x)'
		);
		expect(Parser.parse('2*x^4*(1+log(x)^2)-(-x^4)').text()).toEqual('x^4+2*x^4*(1+log(x)^2)');
		expect(Parser.parse('2*x*(4^(1/3))^3').text()).toEqual('8*x');
		expect(Parser.parse('6*(4^(1/3)*4^(2/3))').text()).toEqual('24');
		expect(Parser.parse('(8*x)^(2/3)').text()).toEqual('4*x^(2/3)');
		expect(Parser.parse('(y^3+2)/(z^4*(y^3/2))^2*cos(x)*sqrt(x)').text()).toEqual(
			'4*(2+y^3)*cos(x)*x^(1/2)*(z^8*y^6)^-1'
		);
		expect(Parser.parse('(x^6)^(1/4)').text()).toEqual('abs(x)^(3/2)');
		expect(Parser.parse('(x+y)--(x+y)').text()).toEqual('2*x+2*y');
		expect(Parser.parse('-z-(r+x)--(r+x)').text()).toEqual('-z');
		expect(Parser.parse('+-z-(r+x)+--+(r+x)').text()).toEqual('-z');
		expect(Parser.parse('(x)^(3-x)').text()).toEqual('x^(3-x)');
		expect(Parser.parse('(1/2*x)^(1/2)').text()).toEqual('(1/2)*2^(1/2)*x^(1/2)');
		expect(Parser.parse('256^(1/8)').text()).toEqual('2');
		expect(Parser.parse('-2*256^(1/8)').text()).toEqual('-4');
		expect(Parser.parse('(81*(x*y)^2+9*x*y)+(9*x*y)').text()).toEqual('81*x^2*y^2+18*x*y');
		expect(Parser.parse('((x)^(1/2)*x^(1/3))-x^(5/6)').text()).toEqual('0');
		expect(Parser.parse('(9*y*x+1)^3').text()).toEqual('(1+9*y*x)^3');
		expect(Parser.parse('(81*(x*y)^2+9*x*y)*(9*x*y)').text()).toEqual(
			'9*x*y*(81*x^2*y^2+9*x*y)'
		);
		expect(Parser.parse('2*((81*(x*y)^2+9*x*y))*(5*(9*x*y))').text()).toEqual(
			'90*x*y*(81*x^2*y^2+9*x*y)'
		);
		expect(Parser.parse('x*y*x/x/x/y').text()).toEqual('1');
		expect(Parser.parse('(5*(4^(1/3)))^3').text()).toEqual('500');
		expect(Parser.parse('2*x*(5*(4^(1/3)))^3').text()).toEqual('1000*x');
		expect(Parser.parse('y^y^y').text()).toEqual('y^y^y');
		expect(Parser.parse('(x^4)^(1/4)').text()).toEqual('abs(x)');
		expect(Parser.parse('(-2*x)^2').text()).toEqual('4*x^2');
		expect(Parser.parse('-4*x^3--x^3+x^2-(-2*x)^2+y').text()).toEqual('y-3*x^2-3*x^3');
		expect(Parser.parse('2*x/x').text()).toEqual('2');
		expect(Parser.parse('(x^2*y)^2').text()).toEqual('x^4*y^2');
		expect(Parser.parse('(x+1)^(z+1)*(1+x)^(1+z)').text()).toEqual('(1+x)^(2+2*z)');
		expect(Parser.parse('(x+1)^(z+1)*(1+x)^4').text()).toEqual('(1+x)^(5+z)');
		expect(Parser.parse('(-1)^x').text()).toEqual('(-1)^x');
		expect(Parser.parse('(-25)^(1/5)').text()).toEqual('5^(2/5)*(-1)^(1/5)');
	});


	it('should pivot correctly with key conflicts', () => {
		expect(Parser.parse('x^-1+(x^2+x^3)^-1+x^-1').text()).toEqual('2*x^-1+(x^2+x^3)^-1');
		expect(Parser.parse('(x+x^2)^-1+(x^2+x^3)^-1+x^-1+(x+x^2)^-1').text()).toEqual(
			'2*(x+x^2)^-1+(x^2+x^3)^-1+x^-1'
		);
		expect(Parser.parse('x^-1+(x^2+x^3)^-1-x^-1').text()).toEqual('(x^2+x^3)^-1');
	});


	it('should correctly perform simple simplifications', () => {
		expect(Parser.parse('-9-x+y-11').text()).toEqual('-20-x+y');
		expect(Parser.parse('2*x+y-10-x-x').text()).toEqual('y-10');
		expect(Parser.parse('2*x^-1/-x^-1').text()).toEqual('-2');
	});


	it('should simplify powers', () => {
		expect(Parser.parse('(3^x)^(1/x)+4').text()).toEqual('7');
		expect(Parser.parse('(3^(2x))^x^-1').text()).toEqual('9');
		expect(Parser.parse('10*x^0').text()).toEqual('10');
		expect(Parser.parse('1^0').text()).toEqual('1');
		expect(Parser.parse('x^1').text()).toEqual('x');
		expect(Parser.parse('(5*b*x^6)^2').text()).toEqual('25*b^2*x^12');
		expect(Parser.parse('((-x)^2)^(5/4)').text()).toEqual('abs(x)^(5/2)');
		expect(Parser.parse('(-2)^(3/2)').text()).toEqual('-2*2^(1/2)*i');
		expect(Parser.parse('656^(1/5)').text()).toEqual('2^(4/5)*41^(1/5)');
		expect(Parser.parse('656^(1/5)').text()).toEqual('2^(4/5)*41^(1/5)');
		expect(Parser.parse('((x^x)^y)^z').text()).toEqual('((x^x)^y)^z');
		expect(Parser.parse('(x^(2*x))^(3/2)').text()).toEqual('(x^(2*x))^(3/2)');
		expect(Parser.parse('64^(1/6)').text()).toEqual('2');
		expect(Parser.parse('(9^(15/4))^(4/3)').text()).toEqual('59049');
	});


	it('should not cause infinite recursion', () => {
		expect(Parser.parse('1/(1+x)+(1+x)').text()).toEqual('1+x+(1+x)^-1');
	});


	it('should handle multipliers correctly', () => {
		expect(Parser.parse('1/(2*abs(x))').text()).toEqual('(1/2)*abs(x)^-1');
	});


	it('should not falsely subtract two values', () => {
		expect(Parser.parse('(x^(1/2))-((-x)^(1/2))').text()).toEqual('x^(1/2)-(-x)^(1/2)');
	});

});

describe('Evaluation stability', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/647
	it('keeps parentheses semantically neutral during evaluation', () => {
		expect(nerdamer('sigma=1000*m').evaluate().text()).toEqual('sigma=1000*m');
		expect(nerdamer('sigma=(1000*m)').evaluate().text()).toEqual('sigma=1000*m');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/354
	it('evaluates substituted divided expressions without recursion', () => {
		const actual = Number(
			nerdamer('((3+y)*2-(cos(x)*4+z))', { x: 2.1, y: 3.3, z: 1 })
				.evaluate()
				.text({ decimal: true })
		);
		const expected = (3 + 3.3) * 2 - (Math.cos(2.1) * 4 + 1);

		expect(actual).toBeCloseTo(expected, 12);
	});
});

describe('Symbolic arithmetic regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/681
	it('normalizes nested reciprocal division correctly', () => {
		expect(nerdamer('(1/L)/S').text()).toEqual(nerdamer('1/(L*S)').text());
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/377
	it('reduces every nonzero expression raised to zero to one', () => {
		expect(nerdamer('(-5*(x/2-5)/4)^0').text()).toEqual('1');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/606
	it('preserves subtraction order between expressions', () => {
		const left = Expression.create('2*x-y');
		const right = Expression.create('2*x-y+4');

		expect(left.subtract(right).text()).toEqual('-4');
		expect(right.subtract(left).text()).toEqual('4');
	});
});
