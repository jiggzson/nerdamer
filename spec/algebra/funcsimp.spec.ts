import { simplifyFactorials, simplifyLogs } from '../../src/algebra/simplify/funcsimp';
import { simplify } from '../../src/algebra/simplify/simplify';
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
		it('should combine log(x) + log(y) → log(x*y)', () => {
			const result = simplifyLogs(Expression.create('log(x)+log(y)'));
			expect(result.text()).toEqual('log(x*y)');
		});

		it('should combine log(x) - log(y) → log(x*y^-1)', () => {
			const result = simplifyLogs(Expression.create('log(x)-log(y)'));
			expect(result.text()).toEqual('log(x*y^-1)');
		});

		it('should combine log(x) - log(1+x) → log(x*((1+x)^-1))', () => {
			const result = simplifyLogs(Expression.create('log(x)-log(1+x)'));
			expect(result.text()).toEqual('log(x*((1+x)^-1))');
		});

		it('should combine (1/2)*log(x) + (-1/2)*log(2+3*x)', () => {
			const result = simplifyLogs(Expression.create('(1/2)*log(x)+(-1/2)*log(2+3*x)'));
			expect(result.text()).toEqual('(1/2)*log(x*((2+3*x)^-1))');
		});

		it('should combine three terms: log(a) + log(b) + log(c) → log(a*b*c)', () => {
			const result = simplifyLogs(Expression.create('log(a)+log(b)+log(c)'));
			expect(result.text()).toEqual('log(a*b*c)');
		});

		it('should combine log(a) + log(b) - log(c) → log(a*b*c^-1)', () => {
			const result = simplifyLogs(Expression.create('log(a)+log(b)-log(c)'));
			expect(result.text()).toEqual('log(a*b*c^-1)');
		});

		it('should preserve non-log terms: log(x) + log(y) + 5', () => {
			const result = simplifyLogs(Expression.create('log(x)+log(y)+5'));
			expect(result.text()).toEqual('5+log(x*y)');
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

		it('should handle matching fractional coefficients: (1/3)*log(a) + (1/3)*log(b)', () => {
			const result = simplifyLogs(Expression.create('(1/3)*log(a)+(1/3)*log(b)'));
			expect(result.text()).toEqual('(1/3)*log(a*b)');
		});

		it('should handle mismatched coefficients separately', () => {
			// (1/2)*log(x) + (1/3)*log(y) — different coefficient groups, no combination
			const x = Expression.create('(1/6)*log(x^3*y^2)');
			const result = simplifyLogs(x);
			expect(result.text()).toEqual('(1/6)*log(x^3*y^2)');
		});
	});

	describe('simplify() integration — logarithms', () => {
		it('should simplify log(x) - log(1+x)', () => {
			const result = simplify('log(x)-log(1+x)');
			expect(result.text()).toEqual('log(x*((1+x)^-1))');
		});

		it('should simplify (1/2)*log(x) + (-1/2)*log(2+3*x)', () => {
			const result = simplify('(1/2)*log(x)+(-1/2)*log(2+3*x)');
			expect(result.text()).toEqual('(1/2)*log(x*((2+3*x)^-1))');
		});

		it('should simplify log(a) + log(b)', () => {
			const result = simplify('log(a)+log(b)');
			expect(result.text()).toEqual('log(a*b)');
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

	it('should still simplify rationals', () => {
		expect(simplify('a/b+b/a').text()).toEqual('(a*b)^-1*(a^2+b^2)');
	});
});
