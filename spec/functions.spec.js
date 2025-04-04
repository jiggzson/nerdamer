/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, xit, expect, require */
'use strict';

const { Parser: parser } = require('../output/core/classes/parser/Parser');
const { sqrtToPow, powToSqrt } = require('../output/core/classes/parser/operations/power');

describe('The square root function', () => {
	it('should be calculated correctly for numbers', () => {
		expect(parser.parse('sqrt(9)').text()).toBe('3');
		expect(parser.parse('7*sqrt(9)').text()).toBe('21');
		expect(parser.parse('sqrt(45)').text()).toBe('3*5^(1/2)');
		expect(parser.parse('sqrt(430)').text()).toBe('430^(1/2)');
		expect(parser.parse('sqrt(4320)').text()).toBe('12*30^(1/2)');
		expect(parser.parse('sqrt(121)').text()).toEqual('11');
	});

	it('should be calculated correctly for variables', () => {
		expect(parser.parse('sqrt(2*(x+1)^(4*x))').text()).toEqual('2^(1/2)*((1+x)^(4*x))^(1/2)');
	});

	it('should be simplified correctly for integer powers', () => {
		expect(parser.parse('(2*sqrt(6))^5').text()).toEqual('1152*6^(1/2)');
		expect(parser.parse('(2*sqrt(3))^2').text()).toEqual('12');
		expect(parser.parse('(2*sqrt(3))^-2').text()).toEqual('1/12');
		expect(parser.parse('sqrt(x)^4*x').text()).toEqual('x^3');
		expect(parser.parse('sqrt(x^2)').text()).toEqual('abs(x)');
		expect(parser.parse('sqrt(2*x^2)^2').text()).toEqual('2*x^2');
		expect(parser.parse('sqrt(x)^2').text()).toEqual('x');
		expect(parser.parse('sqrt(2*sqrt(5)^(5/3))').text()).toEqual('2^(1/2)*5^(5/12)');
		expect(parser.parse('sqrt(1/2)').text()).toEqual('2^(-1/2)');
		expect(parser.parse('sqrt(2*sqrt(5))').text()).toEqual('2^(1/2)*5^(1/4)');
	});

	it('should be calculated correctly', () => {
		expect(parser.parse('sqrt(1+x)^(4*x)').text()).toEqual('(1+x)^(2*x)');
		expect(parser.parse('sqrt(2)*sqrt(2)').text()).toEqual('2');
		expect(parser.parse('sqrt(2)^2').text()).toEqual('2');
		expect(parser.parse('6*sqrt(2)^4').text()).toEqual('24');
		expect(parser.parse('(sqrt((5/2)*x^10))*-sqrt(2)').text()).toEqual('-5^(1/2)*abs(x)^5');
		expect(parser.parse('sqrt(9)').text()).toEqual('3');
		expect(parser.parse('sqrt(-9)').text()).toEqual('3*i');
		expect(parser.parse('sqrt(a/x)').text()).toEqual('a^(1/2)*x^(-1/2)');
		expect(parser.parse('sqrt(-x)').text()).toEqual('(-x)^(1/2)');
		expect(parser.parse('sqrt(-x)*sqrt(-x)').text()).toEqual('-x');
		expect(parser.parse('sqrt(-x)*sqrt(-x)+4*x').text()).toEqual('3*x');
		expect(parser.parse('sqrt((1/2*x)^(1/2))').text()).toEqual('2^(-1/4)*x^(1/4)');
	});

	it('should convert square roots to power form', () => {
		expect(sqrtToPow(parser.parse('sqrt(x)^(3/5)')).text()).toEqual('x^(3/10)');
		expect(sqrtToPow(parser.parse('6*sqrt(x^5)^(3/5)')).text()).toEqual('6*x^(3/2)');
		expect(sqrtToPow(parser.parse('x^2')).text()).toEqual('x^2');
		expect(sqrtToPow(parser.parse('sqrt(4)')).text()).toEqual('2');
	});

	it('should powers to square root', () => {
		expect(powToSqrt(parser.parse('x^3')).text()).toEqual('x^3');
	});

	// TODO: These can be handled with simplify
	xit('should simplify square roots', () => {
		expect(parser.parse('sqrt(1/2)*sqrt(1/6)').text()).toEqual('(1/6)*sqrt(3)');
		expect(parser.parse('3*sqrt(1/2)^5').text()).toEqual('(3/8)*sqrt(2)');
		expect(parser.parse('2*sqrt(4*x)').text()).toEqual('4*sqrt(x)');
		expect(powToSqrt(parser.parse('5*x^(3/2)')).text()).toEqual('5*sqrt(x^3)');
		expect(parser.parse('sqrt(128/49)').text()).toEqual('(8/7)*sqrt(2)');
		expect(parser.parse('expand((sqrt(7)+3sqrt(2))(sqrt(7)-3sqrt(2)))').text()).toEqual('-11');
		expect(parser.parse('3sqrt(2)*2sqrt(6)').text()).toEqual('12*sqrt(3)');
		expect(parser.parse('sqrt(4*sqrt(2)^(-1)*x^(1/2))').text()).toEqual('2^(1/4)*x^(1/4)*sqrt(2)');
		expect(parser.parse('(1/2)*x^(1/2)+sqrt(x)').text()).toEqual('(3/2)*sqrt(x)');
		expect(parser.parse('sqrt((4+x)^2)').text()).toEqual('abs(4+x)');
		expect(parser.parse('2*sqrt(3/4)').text()).toEqual('sqrt(3)');
		expect(parser.parse('sqrt(2)*sqrt(8)').text()).toEqual('4');
		expect(parser.parse('sqrt(242)').text()).toEqual('11*sqrt(2)');
		expect(parser.parse('sqrt(4)^-1').text()).toEqual('1/2');
		expect(parser.parse('sqrt(4*x^2)').text()).toEqual('2*abs(x)');
		expect(parser.parse('74689676.31109099*sqrt(5578547747455547)').text()).toEqual('(824947474856/11045)*sqrt(5578547747455547)');
		expect(parser.parse('sqrt(2/x)').text()).toEqual('sqrt(2)*sqrt(x)^(-1)');
		expect(parser.parse('sqrt(3^x)').text()).toEqual('sqrt(3^x)');
		expect(parser.parse('sqrt(2*x^2)^2').text()).toEqual('2*x^2');
		expect(parser.parse('sqrt(2)-2/(sqrt(2))').text()).toEqual('0');
		expect(parser.parse('sqrt(5)*sqrt(2)^-1*abs(x^5)').text()).toEqual('(1/2)*sqrt(10)*abs(x^5)');
		expect(parser.parse('sqrt(x^2)*sqrt(x^4)').text()).toEqual('x^2*abs(x)');
	});
});

describe('The abs function', () => {
	it('should be calculated correctly', () => {
		expect(parser.parse('abs(-x^2)').text()).toEqual('x^2');
		expect(parser.parse('abs(-x)').text()).toEqual('abs(x)');
		expect(parser.parse('abs(-5)').text()).toEqual('5');
		expect(parser.parse('abs(-x^2-5)').text()).toEqual('5+x^2');
		expect(parser.parse('abs((x+1)^2)').text()).toEqual('(1+x)^2');
		expect(parser.parse('abs(x^2)').text()).toEqual('x^2');
		expect(parser.parse('abs(-x^2-x-pi)').text()).toEqual('pi+x+x^2');
		expect(parser.parse('abs(-x^2-1-pi)').text()).toEqual('1+x^2+pi');
		expect(parser.parse('abs(-x^2+5)').text()).toEqual('abs(-5+x^2)');
		expect(parser.parse('abs((-x^2+5)^2)').text()).toEqual('(5-x^2)^2');
		expect(parser.parse('2*abs(x)*abs(x)').text()).toEqual('2*x^2');
	});
});

describe('The hypot function', () => {
	it('should be calculated correctly', () => {
		expect(parser.parse('hypot(3*cos(x), 3*sin(x))').text()).toBe('3');
		expect(parser.parse('hypot(3*cos(x), 2*sin(x))').text()).toBe('(9*cos(x)^2+4*sin(x)^2)^(1/2)');
		expect(parser.parse('hypot(2*a, b)').text()).toBe('(4*a^2+b^2)^(1/2)');
		expect(parser.parse('hypot(3, 4)').text()).toBe('5');
		expect(parser.parse('hypot(x, x)').text()).toBe('2^(1/2)*abs(x)');
	});
});

describe('Factorial', () => {
	xit('should compute fractions of factorials', () => {
		expect(parser.parse('(-1/2)!').text()).toEqual('sqrt(pi)');
		expect(parser.parse('(-7/2)!').text()).toEqual('(-8/15)*sqrt(pi)');
		expect(parser.parse('(-9/2)!').text()).toEqual('(16/105)*sqrt(pi)');
		expect(parser.parse('(9/2)!').text()).toEqual('(945/32)*sqrt(pi)');
		expect(parser.parse('(7/2)!').text()).toEqual('(105/16)*sqrt(pi)');
		expect(parser.parse('(1/2)!').text()).toEqual('(1/2)*sqrt(pi)');
	});
});

describe('Logarithms', () => {
	it('should be computed correctly', () => {
		expect(parser.parse('log(e)').text()).toEqual('1');
		expect(parser.parse('log(e^e)').text()).toEqual('e');
		expect(parser.parse('log(1/e^e)').text()).toEqual('-e');
		expect(parser.parse('log(1/sqrt(2))').text()).toEqual('(-1/2)*log(2)');
		expect(parser.parse('log(6*e^e)').text()).toEqual('log(6*e^e)');
	});
});

describe('The erf, erfc function', () => {
	it('should calculate erf correctly', () => {
		expect(parser.parse('erf(0)').text()).toEqual('0');
		expect(parser.parse('erf(0.3)').text()).toEqual('0.32862675945912742764');
		expect(parser.parse('erf(1)').text()).toEqual('0.84270079294971486936');
		expect(parser.parse('erf(-0.67)').text()).toEqual('-0.65662770230030504644');
		expect(parser.parse('erf(100)').text()).toEqual('1');
	});

	it('should calculate erfc correctly', () => {
		expect(parser.parse('erfc(0)').text()).toEqual('1');
		expect(parser.parse('erfc(0.3)').text()).toEqual('0.67137324054087257236');
		expect(parser.parse('erfc(1)').text()).toEqual('0.15729920705028513064');
		expect(parser.parse('erfc(-0.67)').text()).toEqual('1.6566277023003050464');
		expect(parser.parse('erfc(100)').text()).toEqual('0');
	});
});

describe('The buildFunction method', () => {
	it('should compile and evaluate correctly', () => {
		const f = parser.parse('cos(abs(x))+erf(y)').buildFunction();
		expect(f(0.3, 0.5)).toEqual(1.4758363669386525);
	});
	it('should respect the order of provided arguments', () => {
		const f = parser.parse('cos(abs(x))+erf(y)').buildFunction(['y', 'x']);
		expect(f(0.3, -0.5)).toEqual(1.2062093213495002);
	});
});
