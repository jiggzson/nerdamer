'use strict';

import { Expression } from '../../src/core/classes/expression/Expression';
import { sqrtToPow, powToSqrt } from '../../src/core/classes/parser/operations/power';
import { Parser } from '../../src/core/classes/parser/Parser';
import nerdamer from '../../src/index';
import { UndefinedError } from '../../src/core/errors';
import { mathFunctionRegistry } from '../../src/core/dispatch';

describe('The square root function', () => {
	it('should be calculated correctly for numbers', () => {
		expect(Parser.parse('sqrt(9)').text()).toBe('3');
		expect(Parser.parse('7*sqrt(9)').text()).toBe('21');
		expect(Parser.parse('sqrt(2)*sqrt(8)').text()).toBe('4');
		expect(Parser.parse('sqrt(45)').text()).toBe('3*5^(1/2)');
		expect(Parser.parse('sqrt(242)').text()).toBe('11*2^(1/2)');
		expect(Parser.parse('sqrt(430)').text()).toBe('430^(1/2)');
		expect(Parser.parse('sqrt(4320)').text()).toBe('12*30^(1/2)');
		expect(Parser.parse('sqrt(121)').text()).toEqual('11');
		expect(Parser.parse('sqrt(128/49)').text()).toEqual('(8/7)*2^(1/2)');
		expect(Parser.parse('2*sqrt(3/4)').text()).toEqual('3^(1/2)');
		expect(Parser.parse('sqrt(4)^-1').text()).toEqual('1/2');
	});

	it('should be calculated correctly for variables', () => {
		expect(Parser.parse('sqrt(2*(x+1)^(4*x))').text()).toEqual(
			'2^(1/2)*((1+x)^(4*x))^(1/2)'
		);
		expect(Parser.parse('2*sqrt(4*x)').text()).toEqual('4*x^(1/2)');
		expect(Parser.parse('5*x^(3/2)*sqrt(x)').text()).toEqual('5*x^2');
		expect(Parser.parse('sqrt(2/x)').text()).toEqual('2^(1/2)*(x^-1)^(1/2)');
		expect(Parser.parse('sqrt(3^x)').text()).toEqual('(3^x)^(1/2)');
		expect(Parser.parse('sqrt(2*x^2)^2').text()).toEqual('2*x^2');
	});

	it('should honor decimals when multiplying sqrt', () => {
		expect(Parser.parse('74689676.31109099*sqrt(5578547747455547)').text()).toEqual(
			'74689676.31109099*5578547747455547^(1/2)'
		);
	});

	it('should be simplified correctly for integer powers', () => {
		expect(Parser.parse('(2*sqrt(6))^5').text()).toEqual('1152*6^(1/2)');
		expect(Parser.parse('(2*sqrt(3))^2').text()).toEqual('12');
		expect(Parser.parse('(2*sqrt(3))^-2').text()).toEqual('1/12');
		expect(Parser.parse('sqrt(x)^4*x').text()).toEqual('x^3');
		expect(Parser.parse('sqrt(x^2)').text()).toEqual('abs(x)');
		expect(Parser.parse('sqrt(4*x^2)').text()).toEqual('2*abs(x)');
		expect(Parser.parse('sqrt(2*x^2)^2').text()).toEqual('2*x^2');
		expect(Parser.parse('sqrt(x)^2').text()).toEqual('x');
		expect(Parser.parse('sqrt(2*sqrt(5)^(5/3))').text()).toEqual('2^(1/2)*5^(5/12)');
		expect(Parser.parse('sqrt(1/2)').text()).toEqual('(1/2)*2^(1/2)');
		expect(Parser.parse('sqrt(2*sqrt(5))').text()).toEqual('2^(1/2)*5^(1/4)');
	});

	it('should be calculated correctly', () => {
		expect(Parser.parse('sqrt(1+x)^(4*x)').text()).toEqual('(1+x)^(2*x)');
		expect(Parser.parse('sqrt(2)*sqrt(2)').text()).toEqual('2');
		expect(Parser.parse('sqrt(2)^2').text()).toEqual('2');
		expect(Parser.parse('6*sqrt(2)^4').text()).toEqual('24');
		expect(Parser.parse('(sqrt((5/2)*x^10))*-sqrt(2)').text()).toEqual('-5^(1/2)*abs(x)^5');
		expect(Parser.parse('sqrt(9)').text()).toEqual('3');
		expect(Parser.parse('sqrt(-9)').text()).toEqual('3*i');
		expect(Parser.parse('sqrt(a/x)').text()).toEqual('(a*x^-1)^(1/2)');
		expect(Parser.parse('sqrt(-x)').text()).toEqual('(-x)^(1/2)');
		expect(Parser.parse('sqrt(-x)*sqrt(-x)').text()).toEqual('-x');
		expect(Parser.parse('sqrt(-x)*sqrt(-x)+4*x').text()).toEqual('3*x');
		expect(Parser.parse('sqrt((1/2*x)^(1/2))').text()).toEqual('(1/2)*2^(3/4)*x^(1/4)');
	});

	it('should convert square roots to power form', () => {
		expect(sqrtToPow(Parser.parse('sqrt(x)^(3/5)') as Expression).text()).toEqual('x^(3/10)');
		expect(sqrtToPow(Parser.parse('6*sqrt(x^5)^(3/5)') as Expression).text()).toEqual(
			'6*(x^5)^(3/10)'
		);
		expect(sqrtToPow(Parser.parse('x^2') as Expression).text()).toEqual('x^2');
		expect(sqrtToPow(Parser.parse('sqrt(4)') as Expression).text()).toEqual('2');
	});

	it('should powers to square root', () => {
		expect(powToSqrt(Parser.parse('x^3') as Expression).text()).toEqual('x^3');
	});

	it('should respect parens', () => {
		expect(Parser.parse('parens(x+1)+parens(x+1)+1').text()).toEqual('1+2*(1+x)');
		expect(Parser.parse('parens(9)+parens(9)+1').text()).toEqual('1+2*(9)');
		expect(Parser.parse('parens(9)*parens(9)').text()).toEqual('(9)^2');
		expect(Parser.parse('parens(9)^6-parens(9)').text()).toEqual('-(9)+(9)^6');
		expect(Parser.parse('parens(x^2)-parens(x^2)').text()).toEqual('0');
	});
});

describe('The abs function', () => {
	it('should be calculated correctly', () => {
		expect(Parser.parse('abs(-x^2)').text()).toEqual('x^2');
		expect(Parser.parse('abs(-x)').text()).toEqual('abs(x)');
		expect(Parser.parse('abs(-5)').text()).toEqual('5');
		expect(Parser.parse('abs(-x^2-5)').text()).toEqual('5+x^2');
		expect(Parser.parse('abs((x+1)^2)').text()).toEqual('(1+x)^2');
		expect(Parser.parse('abs(x^2)').text()).toEqual('x^2');
		expect(Parser.parse('abs(-x^2-x-pi)').text()).toEqual('abs(pi+x+x^2)');
		expect(Parser.parse('abs(-x^2-1-pi)').text()).toEqual('pi+x^2+1');
		expect(Parser.parse('abs(-x^2+5)').text()).toEqual('abs(-5+x^2)');
		expect(Parser.parse('abs((-x^2+5)^2)').text()).toEqual('(5-x^2)^2');
		expect(Parser.parse('2*abs(x)*abs(x)').text()).toEqual('2*x^2');
	});
});

describe('The hypot function', () => {
	it('should be calculated correctly', () => {
		expect(Parser.parse('hypot(3*cos(x), 3*sin(x))').text()).toBe('3');
		expect(Parser.parse('hypot(3*cos(x), 2*sin(x))').text()).toBe(
			'(9*cos(x)^2+4*sin(x)^2)^(1/2)'
		);
		expect(Parser.parse('hypot(2*a, b)').text()).toBe('(4*a^2+b^2)^(1/2)');
		expect(Parser.parse('hypot(3, 4)').text()).toBe('5');
		expect(Parser.parse('hypot(x, x)').text()).toBe('2^(1/2)*abs(x)');
	});
});

describe('Factorial', () => {
	it('should compute fractions of factorials', () => {
		expect(Parser.parse('(-1/2)!').text()).toEqual('pi^(1/2)');
		expect(Parser.parse('(-7/2)!').text()).toEqual('(-8/15)*pi^(1/2)');
		expect(Parser.parse('(-9/2)!').text()).toEqual('(16/105)*pi^(1/2)');
		expect(Parser.parse('(9/2)!').text()).toEqual('(945/32)*pi^(1/2)');
		expect(Parser.parse('(7/2)!').text()).toEqual('(105/16)*pi^(1/2)');
		expect(Parser.parse('(1/2)!').text()).toEqual('(1/2)*pi^(1/2)');
	});
});

describe('Logarithms', () => {
	it('should be computed correctly', () => {
		expect(Parser.parse('log(e)').text()).toEqual('1');
		expect(Parser.parse('log(e^e)').text()).toEqual('e');
		expect(Parser.parse('log(1/e^e)').text()).toEqual('-e');
		expect(Parser.parse('log(1/sqrt(2))').text()).toEqual('(-1/2)*log(2)');
		expect(Parser.parse('e+log(6)').text()).toEqual('e+log(6)');
	});
});

describe('The erf, erfc function', () => {
	it('should calculate erf correctly', () => {
		expect(Parser.parse('erf(0)').text()).toEqual('0');
		expect(Parser.parse('erf(0.3)').text()).toEqual('0.32862675945912742764');
		expect(Parser.parse('erf(1)').text()).toEqual('0.84270079294971486936');
		expect(Parser.parse('erf(-0.67)').text()).toEqual('-0.65662770230030504644');
		expect(Parser.parse('erf(100)').text()).toEqual('1');
	});

	it('should calculate erfc correctly', () => {
		expect(Parser.parse('erfc(0)').text()).toEqual('1');
		expect(Parser.parse('erfc(0.3)').text()).toEqual('0.67137324054087257236');
		expect(Parser.parse('erfc(1)').text()).toEqual('0.15729920705028513064');
		expect(Parser.parse('erfc(-0.67)').text()).toEqual('1.6566277023003050464');
		expect(Parser.parse('erfc(100)').text()).toEqual('0');
	});
});

describe('The buildFunction method', () => {
	it('should compile and evaluate correctly', () => {
		const f = (Parser.parse('cos(abs(x))+erf(y)') as Expression).buildFunction();
		expect(f(0.3, 0.5)).toEqual(1.4758363669386525);
	});
	it('should respect the order of provided arguments', () => {
		const f = (Parser.parse('cos(abs(x))+erf(y)') as Expression).buildFunction(['y', 'x']);
		expect(f(0.3, -0.5)).toEqual(1.2062093213495002);
	});
});

describe('sum and product (finite)', () => {
	describe('numeric evaluation', () => {
		it('evaluates simple sum', () => {
			expect(Expression.create('sum(k, k, 1, 5)').text()).toBe('15');
		});

		it('evaluates simple product', () => {
			expect(Expression.create('product(k, k, 1, 4)').text()).toBe('24');
		});

		it('evaluates polynomial body', () => {
			// 1^2 + 2^2 + 3^2 = 14
			expect(Expression.create('sum(k^2, k, 1, 3)').text()).toBe('14');
		});

		it('evaluates shifted bounds', () => {
			// 3 + 4 + 5 = 12
			expect(Expression.create('sum(k, k, 3, 5)').text()).toBe('12');
		});
	});

	describe('constant body simplification', () => {
		it('simplifies constant sum', () => {
			// 3 + 3 + 3 + 3 = 12
			expect(Expression.create('sum(3, k, 1, 4)').text()).toBe('12');
		});

		it('simplifies constant product', () => {
			// 3^4 = 81
			expect(Expression.create('product(3, k, 1, 4)').text()).toBe('81');
		});

		it('simplifies symbolic constant body', () => {
			// a + a + a = 3*a
			expect(Expression.create('sum(a, k, 1, 3)').text()).toBe('3*a');
		});

		it('simplifies symbolic constant product', () => {
			// a * a * a = a^3
			expect(Expression.create('product(a, k, 1, 3)').text()).toBe('a^3');
		});
	});

	describe('empty range behavior', () => {
		it('sum returns 0 when lower > upper', () => {
			expect(Expression.create('sum(k, k, 5, 1)').text()).toBe('0');
		});

		it('product returns 1 when lower > upper', () => {
			expect(Expression.create('product(k, k, 5, 1)').text()).toBe('1');
		});
	});

	describe('symbolic fallback', () => {
		it('returns symbolic form for symbolic upper bound', () => {
			expect(Expression.create('sum(k, k, 1, n)').text()).toBe('sum(k, k, 1, n)');
		});

		it('returns symbolic form for symbolic lower bound', () => {
			expect(Expression.create('sum(k, k, n, 10)').text()).toBe('sum(k, k, n, 10)');
		});

		it('returns symbolic form when index is invalid', () => {
			expect(Expression.create('sum(k, k+1, 1, 5)').text()).toBe('sum(k, 1+k, 1, 5)');
		});

		it('returns symbolic form when bounds are non-integers', () => {
			expect(Expression.create('sum(k, k, 1/2, 5)').text()).toBe('sum(k, k, 1/2, 5)');
		});
	});

	describe('evaluation safety limit', () => {
		it('does not evaluate when term count exceeds limit', () => {
			expect(Expression.create('sum(k, k, 1, 20000)').text()).toBe('sum(k, k, 1, 20000)');
		});

		it('evaluates at limit boundary', () => {
			expect(Expression.create('sum(1, k, 1, 10000)').text()).toBe('10000');
		});
	});
});

describe('size', () => {
	it('returns the dimensions of structured parser values', () => {
		expect(nerdamer('size([a,b,c])').text()).toEqual('[3]');
		expect(nerdamer('size(matrix([1,2,3],[4,5,6]))').text()).toEqual('[2, 3]');
		expect(nerdamer('size({a,b,c})').text()).toEqual('[3]');
	});

	it('keeps unresolved input symbolic', () => {
		expect(nerdamer('size(x)').text()).toEqual('size(x)');
	});
});

describe('Function regressions', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/267
	it('does not assign zero to undefined atan2(0,0)', () => {
		let result: string | undefined;
		let threwUndefined = false;

		try {
			result = nerdamer('atan2(0,0)').text();
		} catch (error) {
			expect(error).toBeInstanceOf(UndefinedError);
			threwUndefined = true;
		}

		expect(threwUndefined || result !== '0').toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/393
	it('treats exp(x) and e^x as the same symbolic expression', () => {
		expect(nerdamer('exp(x)-e^x').text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/30
	it('evaluates the accepted ceil spelling', () => {
		expect(nerdamer('ceil(2.4)').text()).toEqual('3');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/143
	it('evaluates Fibonacci numbers across zero and negative indices', () => {
		const cases = [
			['fib(-15)', '610'],
			['fib(-14)', '-377'],
			['fib(-4)', '-3'],
			['fib(-3)', '2'],
			['fib(-2)', '-1'],
			['fib(-1)', '1'],
			['fib(0)', '0'],
			['fib(1)', '1'],
			['fib(2)', '1'],
			['fib(14)', '377'],
			['fib(15)', '610'],
			['fib(100)', '354224848179261915075'],
		];

		for (const [input, expected] of cases) {
			expect(nerdamer(input).text()).toEqual(expected);
		}

		expect(nerdamer('fib(x)').text()).toEqual('fib(x)');
		expect(nerdamer('fib(1/2)').text()).toEqual('fib(1/2)');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/148
	it('collapses repeated negative infinity from Ei(0)', () => {
		expect(nerdamer('Ei(0)+Ei(0)').evaluate().text()).toEqual('-Inf');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/150
	it('evaluates logarithms with a non-standard base', () => {
		expect(nerdamer('log(9,3)').text()).toEqual('2');
		expect(Number(nerdamer('log(3,9)').evaluate().text({ decimal: true }))).toBeCloseTo(
			0.5,
			15
		);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/283
	it('handles negative factorials without finite values at gamma poles', () => {
		const result = Number(nerdamer('(-5.5)!').evaluate().text({ decimal: true }));

		expect(Number.isFinite(result)).toBe(true);
		expect(result).toBeCloseTo(-0.06001960130050425, 12);
		expect(() => nerdamer('(-5)!').evaluate()).toThrow();
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/285
	it('evaluates finite sums without producing NaN', () => {
		const result = Number(
			nerdamer('sum(e^(-x^2*pi/9),x,1,12)').evaluate().text({ decimal: true })
		);

		expect(Number.isFinite(result)).toBe(true);
		expect(result).toBeCloseTo(1.0000000000015774, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/289
	it('evaluates large numeric logarithms with an explicit base', () => {
		const base2 = Number(nerdamer('log(512,2)').evaluate().text({ decimal: true }));
		const base3 = Number(nerdamer('log(729,3)').evaluate().text({ decimal: true }));

		expect(Number.isFinite(base2)).toBe(true);
		expect(Number.isFinite(base3)).toBe(true);
		expect(base2).toBeCloseTo(9, 12);
		expect(base3).toBeCloseTo(6, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/550
	it('exposes completed nth-root and real cube-root behavior', () => {
		expect(nerdamer('nthroot(8,3)').text()).toEqual('2');
		expect(nerdamer('cbrt(-27)').evaluate().text()).toEqual('-3');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/576
	it('evaluates logarithms of scaled powers of e correctly', () => {
		const actual = Number(Expression.create('log(1.2*e^4.3,7.8*e^4.9)').evaluate().text({ decimal: true }));
		const expected = (Math.log(1.2) + 4.3) / (Math.log(7.8) + 4.9);

		expect(actual).toBeCloseTo(expected, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/389
	it('evaluates finite floor sums without hanging', () => {
		expect(nerdamer('sum(floor(4*x/2013),x,1,2012)').text()).toEqual('3018');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/392
	it('evaluates finite binomial sums with decimal probabilities', () => {
		const name = 'legacy_392_binomial_term';

		try {
			nerdamer.setFunction(
				name,
				['a', 'b', 'c'],
				'(factorial(a)/factorial(c)/factorial(a-c))*b^c*(1-b)^(a-c)'
			);
			const actual = Number(
				nerdamer(`sum(${name}(20,0.1,k),k,0,10)`).evaluate().text({ decimal: true })
			);

			expect(actual).toBeCloseTo(0.9999992911393668, 15);
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/399
	it('expands symbolic sinc during evaluation', () => {
		const actual = Expression.create('sinc(x)').evaluate();
		const expected = Expression.create('sin(x)/x');

		expect(actual.hasFunction('sinc')).toBe(false);
		expect(actual.minus(expected).text()).toEqual('0');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/357
	it('recognizes exact zeros of sinc before numeric evaluation', () => {
		expect(Expression.create('sinc(0)').text()).toEqual('1');
		expect(Expression.create('sinc(pi)').evaluate().isZero()).toBe(true);
		expect(Expression.create('sinc(2*pi)').evaluate().isZero()).toBe(true);
		expect(Expression.create('sin((20!-1)*pi)').evaluate().isZero()).toBe(true);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/638
	it('registers max and min with parser dispatch', () => {
		expect(nerdamer('max(-5,1)').text()).toEqual('1');
		expect(nerdamer('min(-5,1)').text()).toEqual('-5');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/358
	it('keeps both arguments when mod is symbolic', () => {
		expect(nerdamer('mod(a,b)').text()).toEqual('mod(a, b)');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/358
	it('exposes nthroot as a parser-callable function', () => {
		const actual = Expression.create('nthroot(a,b)');
		const expected = Expression.create('a^(1/b)');
		expect(actual.minus(expected).simplify().text()).toEqual('0');
	});
});