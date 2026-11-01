import '../helpers/registerNerdamerFunctions';
import { simplifyFactorials, simplifyLogs } from '../../src/algebra/simplify/funcsimp';
import { simplify } from '../../src/algebra/simplify/simplify';
import { assume, clearAssumptions } from '../../src/core/classes/assumption/assume';
import { Expression } from '../../src/core/classes/expression/Expression';

const text = (expr: string | number) => Expression.create(expr).text();

// ============================================================================
// FACTORIAL SIMPLIFICATION
// ============================================================================
describe('Factorial Simplification', () => {
	describe('simplifyFactorials (unit)', () => {
		it('should cancel n! / (n+1)! → 1/(n+1)', () => {
			const result = simplifyFactorials(Expression.create('n!/((n+1)!)'));
			expect(result.text()).toEqual(text('(1+n)^(-1)'));
		});

		it('should cancel (n+1)! / n! → (n+1)', () => {
			const result = simplifyFactorials(Expression.create('(n+1)!/n!'));
			expect(result.text()).toEqual(text('1+n'));
		});

		it('should cancel n! / (n+2)! → 1/((n+1)(n+2))', () => {
			const result = simplifyFactorials(Expression.create('n!/((n+2)!)'));
			expect(result.text()).toEqual(text('((1+n)*(2+n))^(-1)'));
		});

		it('should cancel (n+3)! / n! → (n+1)(n+2)(n+3)', () => {
			const result = simplifyFactorials(Expression.create('(n+3)!/n!'));
			expect(result.text()).toEqual(text('(1+n)*(2+n)*(3+n)'));
		});

		it('should cancel n! / n! → 1', () => {
			const result = simplifyFactorials(Expression.create('n!/n!'));
			expect(result.text()).toEqual('1');
		});

		it('should preserve extra factors: x * n! / (n+1)!', () => {
			const result = simplifyFactorials(Expression.create('x*n!/((n+1)!)'));
			expect(result.text()).toEqual(text('x*(1+n)^(-1)'));
		});

		it('should handle non-product expressions unchanged', () => {
			const result = simplifyFactorials(Expression.create('n!'));
			expect(result.text()).toEqual(text('n!'));
		});

		it('should leave unmatched factorials unchanged', () => {
			// n! / m! — different base variables, can't determine integer diff
			const result = simplifyFactorials(Expression.create('n!/m!'));
			expect(result.text()).toEqual(text('n!/m!'));
		});
	});

	describe('simplify() integration — factorials', () => {
		it('should simplify x*n!/((n+1)!*a)', () => {
			expect(simplify('x*n!/((n+1)!*a)').text()).toEqual('x*(a*(1+n))^-1');
		});

		it('should simplify (n+1)!/n!', () => {
			const result = simplify('(n+1)!/n!');
			expect(result.text()).toEqual(text('1+n'));
		});
	});
});

// ============================================================================
// LOGARITHM COMBINATION
// ============================================================================
describe('Logarithm Simplification', () => {
	describe('simplifyLogs (unit)', () => {
		it('should combine log(x) + log(y) → log(x*y) for positive arguments', () => {
			assume('x>0');
			assume('y>0');

			try {
				const result = simplifyLogs(Expression.create('log(x)+log(y)'));
				expect(result.text()).toEqual('log(x*y)');
			} finally {
				clearAssumptions();
			}
		});

		it('should combine log(x) - log(y) → log(x*y^-1) for positive arguments', () => {
			assume('x>0');
			assume('y>0');

			try {
				const result = simplifyLogs(Expression.create('log(x)-log(y)'));
				expect(result.text()).toEqual('log(x*y^-1)');
			} finally {
				clearAssumptions();
			}
		});

		it('should preserve log(x) - log(1+x) when positivity is not provable', () => {
			const value = Expression.create('log(x)-log(1+x)');
			const result = simplifyLogs(value);

			expect(result.text()).toEqual(value.text());
		});

		it('should preserve fractional log combinations when positivity is not provable', () => {
			const value = Expression.create('(1/2)*log(x)+(-1/2)*log(2+3*x)');
			const result = simplifyLogs(value);

			expect(result.text()).toEqual(value.text());
		});

		it('reduces unity produced by combining positive numeric logarithms', () => {
			expect(simplifyLogs(Expression.create('log(28)-2*log(2)-log(7)')).text()).toEqual('0');
			expect(simplifyLogs(Expression.create('log(6)-log(2)-log(3)')).text()).toEqual('0');
		});

		it('cancels an exact numeric logarithm quotient after combining the numerator', () => {
			const result = simplify('(log(12.5)-log(0.0125))/log(1000)');
			expect(result.minus(1).isZero()).toBe(true);
		});

		it('normalizes an exact numeric log argument produced by combining decimal inputs', () => {
			const result = simplifyLogs(Expression.create('log(12.5)-log(0.0125)'));
			expect(result.text()).toEqual('log(1000)');
		});

		it('should combine three positive log arguments', () => {
			assume('a>0');
			assume('b>0');
			assume('c>0');

			try {
				const result = simplifyLogs(Expression.create('log(a)+log(b)+log(c)'));
				expect(result.text()).toEqual('log(a*b*c)');
			} finally {
				clearAssumptions();
			}
		});

		it('should combine positive log arguments across subtraction', () => {
			assume('a>0');
			assume('b>0');
			assume('c>0');

			try {
				const result = simplifyLogs(Expression.create('log(a)+log(b)-log(c)'));
				expect(result.text()).toEqual('log(a*b*c^-1)');
			} finally {
				clearAssumptions();
			}
		});

		it('should preserve non-log terms while combining positive logs', () => {
			assume('x>0');
			assume('y>0');

			try {
				const result = simplifyLogs(Expression.create('log(x)+log(y)+5'));
				expect(result.text()).toEqual('5+log(x*y)');
			} finally {
				clearAssumptions();
			}
		});

		it('should not combine when only one log term exists', () => {
			const x = Expression.create('log(x)+5');
			const result = simplifyLogs(x);
			expect(result.text()).toEqual(x.text());
		});

		it('should not combine non-sum expressions', () => {
			const x = Expression.create('log(x)');
			const result = simplifyLogs(x);
			expect(result.text()).toEqual(x.text());
		});

		it('should not combine log terms with non-linear powers (e.g. log(x)^2)', () => {
			// log(x)^2 + log(y) — the log(x)^2 is not a linear log term
			const x = Expression.create('log(x)^2+log(y)');
			const result = simplifyLogs(x);
			expect(result.text()).toEqual(x.text());
		});

		it('should handle matching fractional coefficients for positive arguments', () => {
			assume('a>0');
			assume('b>0');

			try {
				const result = simplifyLogs(Expression.create('(1/3)*log(a)+(1/3)*log(b)'));
				expect(result.text()).toEqual('(1/3)*log(a*b)');
			} finally {
				clearAssumptions();
			}
		});

		it('should handle mismatched coefficients separately', () => {
			// (1/2)*log(x) + (1/3)*log(y) — different coefficient groups, no combination
			const x = Expression.create('(1/6)*log(x^3*y^2)');
			const result = simplifyLogs(x);
			expect(result.text()).toEqual('(1/6)*log(x^3*y^2)');
		});
	});

	describe('simplify() integration — logarithms', () => {
		it('should preserve log(x) - log(1+x) when positivity is unknown', () => {
			const value = Expression.create('log(x)-log(1+x)');
			const result = simplify(value);

			expect(result.eq(value)).toBe(true);
		});

		it('should preserve fractional log combinations when positivity is unknown', () => {
			const value = Expression.create('(1/2)*log(x)+(-1/2)*log(2+3*x)');
			const result = simplify(value);

			expect(result.eq(value)).toBe(true);
		});

		it('should simplify log(a) + log(b) when both arguments are positive', () => {
			assume('a>0');
			assume('b>0');

			try {
				const result = simplify('log(a)+log(b)');
				expect(result.text()).toEqual('log(a*b)');
			} finally {
				clearAssumptions();
			}
		});

		it('should leave log(x) + sin(x) unchanged (no pair)', () => {
			const result = simplify('log(x)+sin(x)');
			expect(result.text()).toEqual(text('log(x)+sin(x)'));
		});
	});
});

// ============================================================================
// REGRESSION — existing simplify tests should still pass
// ============================================================================
describe('Simplify Regression', () => {
	it('should still simplify trig identities', () => {
		expect(simplify('sin(x)^2+cos(x)^2').text()).toEqual('1');
	});

	it('should still simplify polynomial quotients', () => {
		expect(simplify('(x^2+2*x+1)/(x+1)').text()).toEqual('1+x');
		expect(simplify('(x-1)/(1-x)').text()).toEqual('-1');
	});

	it('should still simplify radicals', () => {
		expect(simplify('3*sqrt(2)*2*sqrt(6)').text()).toEqual('12*3^(1/2)');
	});

	it('distributes a numeric radical across a sum', () => {
		expect(simplify('sqrt(24)*(sqrt(12)+sqrt(18))').text())
			.toEqual(text('12*sqrt(2)+12*sqrt(3)'));
	});

	it('should still simplify rationals', () => {
		expect(simplify('a/b+b/a').eq('(a*b)^-1*(a^2+b^2)')).toBe(true);
	});
});
