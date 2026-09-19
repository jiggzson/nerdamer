
import nerdamer from '../../src/index';
import { getDivisors } from '../../src/algebra/algorithms/arith';
import { gcd } from '../../src/algebra/gcd/gcd';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { content, deg } from '../../src/core/classes/polynomial/functions';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import { isprime } from '../../src/math/utils';

describe('Number theory', () => {
	// Regression: https://github.com/together-science/nerdamer-prime/issues/145
	it('rejects 0 and 1 as prime numbers', () => {
		expect(nerdamer('isprime(0)').text()).toEqual('0');
		expect(nerdamer('isprime(1)').text()).toEqual('0');
		expect(nerdamer('isprime(2)').text()).toEqual('1');
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/139
	it('returns all divisors when repeated prime factors are present', () => {
		expect(getDivisors(36n)).toEqual([1n, 2n, 3n, 4n, 6n, 9n, 12n, 18n, 36n]);
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/141
	it('exposes symbolic lcm through the expression API', () => {
		expect(nerdamer('lcm(x,x)').text()).toEqual('x');
		expect(nerdamer('lcm(6,4)').text()).toEqual('12');
	});
});

describe('Polynomial functions', () => {
	it('returns total degree when no variable is supplied', () => {
		expect(nerdamer('deg(x^2+y^100)').text()).toEqual('100');
		expect(new Polynomial('x^2+y^100').deg()).toEqual(100);
	});

	it('returns degree with respect to the requested variable', () => {
		expect(nerdamer('deg(x*y+x,x)').text()).toEqual('1');
		expect(nerdamer('deg(x^2*y^3+x,x)').text()).toEqual('2');
		expect(nerdamer('deg(x^2*y^3+x,y)').text()).toEqual('3');

		const polynomial = new Polynomial('x^2*y^3+x');
		expect(polynomial.deg('x')).toEqual(2);
		expect(polynomial.deg('y')).toEqual(3);
		expect(polynomial.deg('z')).toEqual(0);
	});

	it('uses the selected variable when building dense coefficient arrays', () => {
		const polynomial = new Polynomial('x^5+y^2');
		const coefficients = polynomial.toArray(false, 'y');

		expect(coefficients.map(x => x.text())).toEqual(['x^5', '0', '1']);
	});

	it('evaluates direct Polynomial inputs for degree and numeric content', () => {
		const polynomial = new Polynomial('6*x^2+15*x*y-3*y');

		expect(deg(polynomial).text()).toEqual('2');
		expect(deg(polynomial, 'x').text()).toEqual('2');
		expect(content(polynomial).text()).toEqual('3');
	});
});

describe('Native symbolic fallbacks', () => {
	it('does not reinterpret existing symbolic arguments through parser values', () => {
		const variable = 'native_symbolic_fallback_probe';
		const expression = Expression.Variable(variable);
		const previous = Parser.KNOWN_VALUES[variable];
		const hasDecimal = expression.hasDecimal;

		try {
			Parser.KNOWN_VALUES[variable] = Expression.create(7);

			const primeResult = isprime(expression);
			expression.hasDecimal = () => {
				throw new Error('Force symbolic GCD fallback');
			};
			const gcdResult = gcd(expression, 2);

			expect(primeResult.getArguments()[0].eq(expression)).toBe(true);
			expect(gcdResult.getArguments()[0].eq(expression)).toBe(true);
			expect(gcdResult.getArguments()[1].eq(2)).toBe(true);
		} finally {
			expression.hasDecimal = hasDecimal;
			if (previous === undefined) {
				delete Parser.KNOWN_VALUES[variable];
			} else {
				Parser.KNOWN_VALUES[variable] = previous;
			}
		}
	});
});
