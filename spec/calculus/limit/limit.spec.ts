import { limit } from '../../../src/calculus/limit/limit';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { exp } from '../../../src/math/math';

describe('limit', () => {
	describe('regular finite limits', () => {
		it('evaluates a polynomial at a finite point', () => {
			expect(limit('x^2+3*x+1', 'x', 2).text()).toEqual(Expression.create(11).text());
		});

		it('evaluates a rational function when denominator is nonzero', () => {
			expect(limit('(x^2+1)/(x+2)', 'x', 1).text()).toEqual(Expression.create('2/3').text());
		});

		it('evaluates a constant expression', () => {
			expect(limit('5', 'x', 3).text()).toEqual(Expression.create(5).text());
		});

		it('evaluates a linear function at zero', () => {
			expect(limit('3*x+7', 'x', 0).text()).toEqual(Expression.create(7).text());
		});
	});

	describe('zero over zero by simplification', () => {
		it('simplifies (x^2-1)/(x-1) at x=1', () => {
			expect(limit('(x^2-1)/(x-1)', 'x', 1).text()).toEqual(Expression.create(2).text());
		});
	});

	describe("zero over zero by L'Hopital", () => {
		it('computes lim sin(x)/x as x->0', () => {
			expect(limit('sin(x)/x', 'x', 0).text()).toEqual(Expression.create(1).text());
		});

		it('computes lim tan(x)/x as x->0', () => {
			expect(limit('tan(x)/x', 'x', 0).text()).toEqual(Expression.create(1).text());
		});

		it('computes lim (e^x-1)/x as x->0', () => {
			expect(limit('(e^x-1)/x', 'x', 0).text()).toEqual(Expression.create('1.0').text());
		});

		it('computes lim log(1+x)/x as x->0', () => {
			expect(limit('log(1+x)/x', 'x', 0).text()).toEqual(Expression.create(1).text());
		});

		it('computes lim (1-cos(x))/x^2 as x->0', () => {
			expect(limit('(1-cos(x))/x^2', 'x', 0).text()).toEqual(Expression.create('1/2').text());
		});
	});

	describe('nonzero over zero (one-sided limits)', () => {
		it('computes lim 1/x as x->0+ = +Inf', () => {
			expect(limit('1/x', 'x', 0, 'right').text()).toEqual(Expression.Inf().text());
		});

		it('computes lim 1/x as x->0- = -Inf', () => {
			expect(limit('1/x', 'x', 0, 'left').text()).toEqual(Expression.NegInf().text());
		});

		it('computes lim 1/x^2 as x->0 = +Inf (even order, both sides agree)', () => {
			expect(limit('1/x^2', 'x', 0, 'both').text()).toEqual(Expression.Inf().text());
		});

		it('computes lim -1/x^2 as x->0 = -Inf', () => {
			expect(limit('-1/x^2', 'x', 0, 'both').text()).toEqual(Expression.NegInf().text());
		});

		it('computes lim 1/(x-1) as x->1+ = +Inf', () => {
			expect(limit('1/(x-1)', 'x', 1, 'right').text()).toEqual(Expression.Inf().text());
		});

		it('computes lim 1/(x-1) as x->1- = -Inf', () => {
			expect(limit('1/(x-1)', 'x', 1, 'left').text()).toEqual(Expression.NegInf().text());
		});
	});

	describe('polynomial dominance at infinity', () => {
		it('returns 0 when denominator degree is larger', () => {
			expect(limit('x/(x^2+1)', 'x', 'Inf').text()).toEqual(Expression.create(0).text());
		});

		it('returns leading coefficient ratio when degrees match', () => {
			expect(limit('(3*x^2+1)/(2*x^2-5)', 'x', 'Inf').text()).toEqual(
				Expression.create('3/2').text()
			);
		});

		it('returns Inf when numerator degree is larger', () => {
			expect(limit('(x^3+1)/(x^2+1)', 'x', 'Inf').text()).toEqual(Expression.Inf().text());
		});

		it('returns NegInf when odd-degree sign flips at -Inf', () => {
			expect(limit('(x^3+1)/(x^2+1)', 'x', '-Inf').text()).toEqual(
				Expression.NegInf().text()
			);
		});
	});

	describe('growth hierarchy at infinity', () => {
		it('exponential dominates polynomial: e^x/x^5 -> Inf', () => {
			expect(limit('e^x/x^5', 'x', 'Inf').text()).toEqual(Expression.Inf().text());
		});

		it('polynomial dominated by exponential: x^3/e^x -> 0', () => {
			expect(limit('x^3/e^x', 'x', 'Inf').text()).toEqual(Expression.create(0).text());
		});

		it('exponential ratio: e^(2x)/e^x -> Inf', () => {
			expect(limit('e^(2*x)/e^x', 'x', 'Inf').text()).toEqual(Expression.Inf().text());
		});

		it('negative exponent over polynomial: e^(-x)/x -> 0', () => {
			expect(limit('e^(-x)/x', 'x', 'Inf').text()).toEqual(Expression.create(0).text());
		});

		it('logarithmic dominated by polynomial: log(x)/x -> 0', () => {
			expect(limit('log(x)/x', 'x', 'Inf').text()).toEqual(Expression.create(0).text());
		});

		it('polynomial dominates logarithmic: x/log(x) -> Inf', () => {
			expect(limit('x/log(x)', 'x', 'Inf').text()).toEqual(Expression.Inf().text());
		});

		it('fractional powers: sqrt(x)/x -> 0', () => {
			expect(limit('sqrt(x)/x', 'x', 'Inf').text()).toEqual(Expression.create(0).text());
		});
	});

	describe('compositional limits', () => {
		it('computes lim sin(1/x) as x->Inf = 0', () => {
			expect(limit('sin(1/x)', 'x', 'Inf').text()).toEqual(Expression.create(0).text());
		});

		it('computes lim atan(x) as x->+Inf = pi/2', () => {
			const result = limit('atan(x)', 'x', 'Inf').text();
			expect(result).toEqual(Expression.Pi().div(Expression.create(2)).text());
		});

		it('computes lim atan(x) as x->-Inf = -pi/2', () => {
			const result = limit('atan(x)', 'x', '-Inf').text();
			expect(result).toEqual(Expression.Pi().div(Expression.create(-2)).text());
		});

		it('computes lim e^(1/x) as x->Inf = 1', () => {
			expect(limit('exp(1/x)', 'x', 'Inf').text()).toEqual(Expression.create(1).text());
		});

		it('computes lim log(1+1/x) as x->Inf = 0', () => {
			expect(limit('log(1+1/x)', 'x', 'Inf').text()).toEqual(Expression.create(0).text());
		});
	});

	describe('sum and product decomposition', () => {
		it('computes lim (x + sin(x)) as x->0 = 0', () => {
			expect(limit('x+sin(x)', 'x', 0).text()).toEqual(Expression.create(0).text());
		});

		it('computes lim (x^2 + 3x + 2) as x->1 = 6', () => {
			expect(limit('x^2+3*x+2', 'x', 1).text()).toEqual(Expression.create(6).text());
		});

		it('computes lim 2*cos(x) as x->0 = 2', () => {
			expect(limit('2*cos(x)', 'x', 0).text()).toEqual(Expression.create(2).text());
		});

		it('computes lim x*e^x as x->0 = 0', () => {
			expect(limit('x*e^x', 'x', 0).text()).toEqual(Expression.create(0).text());
		});

		it("computes lim x*sin(1/x) as x->Inf = 1 (0·∞ via direct L'Hôpital)", () => {
			expect(limit('x*sin(1/x)', 'x', 'Inf').text()).toEqual(Expression.create(1).text());
		});

		it('computes lim x+sin(x) as x->Inf = Inf', () => {
			expect(limit('x+sin(x)', 'x', 'Inf').text()).toEqual(Expression.Inf().text());
		});

		it('computes lim e^x+x as x->Inf = Inf', () => {
			expect(limit('e^x+x', 'x', 'Inf').text()).toEqual(Expression.Inf().text());
		});
	});

	describe('indeterminate power forms', () => {
		it('computes lim x^x as x->0+ = 1 (0^0 form)', () => {
			expect(limit('x^x', 'x', 0, 'right').text()).toEqual(Expression.create(1).text());
		});

		it('computes lim (1+1/x)^x as x->Inf = e (1^∞ form)', () => {
			expect(limit('(1+1/x)^x', 'x', 'Inf').text()).toEqual(exp(1).text());
		});
	});

	describe('piecewise functions (abs, sign)', () => {
		it('computes lim abs(x)/x as x->0+ = 1', () => {
			expect(limit('abs(x)/x', 'x', 0, 'right').text()).toEqual(Expression.create(1).text());
		});

		it('computes lim abs(x)/x as x->0- = -1', () => {
			expect(limit('abs(x)/x', 'x', 0, 'left').text()).toEqual(Expression.create(-1).text());
		});
	});

	describe('fallback behavior', () => {
		it('returns symbolic limit for sin(x) at Inf (oscillating)', () => {
			expect(limit('sin(x)', 'x', 'Inf').text()).toEqual(
				Expression.toFunction('limit', [
					Expression.create('sin(x)'),
					Expression.create('x'),
					Expression.create('Inf'),
					'both',
				]).text()
			);
		});

		it('returns symbolic limit for 1/x at 0 both (DNE)', () => {
			expect(limit('1/x', 'x', 0, 'both').text()).toEqual(
				Expression.toFunction('limit', [
					Expression.create('x^(-1)'),
					Expression.create('x'),
					Expression.create(0),
					'both',
				]).text()
			);
		});
	});
});
