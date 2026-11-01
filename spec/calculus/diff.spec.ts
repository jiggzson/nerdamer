import { Parser } from '../../src/core/classes/parser/Parser';
import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { LOG, ATAN } from '../../src/core/classes/parser/constants';
import { diff } from '../../src/calculus/derivative/diff';

describe('Derivative', () => {
	it('power rule and polynomials', () => {
		expect(Parser.parse('diff((5/8)*x^2,x)').text()).toEqual('(5/4)*x');
		expect(Parser.parse('diff(x^2+2*x+1,x)').text()).toEqual('2+2*x');
	});

	it('differentiates scaled logarithms without duplicating the coefficient', () => {
		const source = '(1/2)*2^(-1/2)*log((-2*2^(1/2)+2*x)/(2*2^(1/2)+2*x))';
		const derivative = Parser.parse(`diff(${source},x)`);
		for (const x of [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3]) {
			const expected = Number(Expression.create('1/(x^2-2)').evaluate({ x }).text({ decimal: true }));
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			expect(actual).toBeCloseTo(expected, 8);
		}
	});

	// Regression: coefficient normalization must not change a product's derivative.
	it('retains reciprocal radical coefficients when differentiating products', () => {
		for (const source of [
			'sqrt(pi)*erf(sqrt(2)*x)/(2*sqrt(2))',
			'sqrt(pi/2)*erf(sqrt(2)*x)/2',
		]) {
			const derivative = diff(source, 'x');
			const expected = Expression.create('e^(-2*x^2)');
			for (const x of [-1.2, -0.3, 0, 0.3, 1.2]) {
				const actualValue = Number(derivative.evaluate({ x }).text({ decimal: true }));
				const expectedValue = Number(expected.evaluate({ x }).text({ decimal: true }));
				expect(actualValue).toBeCloseTo(expectedValue, 8);
			}
		}
	});

	it('differentiates function nodes constructed without parsing their text', () => {
		const argument = Expression.create('x^2+1');
		for (const name of [LOG, ATAN]) {
			const expression = Expression.toFunction(name, [argument]);
			const derivative = diff(expression, 'x');
			const expected = name === LOG
				? Expression.create('2*x/(1+x^2)')
				: Expression.create('2*x/(1+(1+x^2)^2)');
			for (const x of [0.2, 0.6, 1.1]) {
				const actualValue = Number(derivative.evaluate({ x }).text({ decimal: true }));
				const expectedValue = Number(expected.evaluate({ x }).text({ decimal: true }));
				expect(actualValue).toBeCloseTo(expectedValue, 8);
			}
		}
	});

	it.each([
		{ source: 'Si(2*x)', expected: 'sin(2*x)/x' },
		{ source: 'Ci(3*x)', expected: 'cos(3*x)/x' },
		{ source: 'Chi(2*x)', expected: 'cosh(2*x)/x' },
		{ source: 'Shi(3*x)', expected: 'sinh(3*x)/x' },
		{ source: 'Ei(2*x)', expected: 'e^(2*x)/x' },
		{ source: 'Si(1+x)', expected: 'sin(1+x)/(1+x)' },
		{ source: 'Ci(1+x)', expected: 'cos(1+x)/(1+x)' },
		{ source: 'Chi(1+x)', expected: 'cosh(1+x)/(1+x)' },
		{ source: 'Shi(1+x)', expected: 'sinh(1+x)/(1+x)' },
		{ source: 'Ei(1+x)', expected: 'e^(1+x)/(1+x)' },
	])('differentiates $source with a grouped argument denominator', ({ source, expected }) => {
		const derivative = diff(source, 'x');
		const expectedDerivative = Expression.create(expected);
		for (const x of [0.3, 0.7, 1.1]) {
			const actual = Number(derivative.evaluate({ x }).text({ decimal: true }));
			const expectedValue = Number(expectedDerivative.evaluate({ x }).text({ decimal: true }));
			expect(Number.isFinite(actual)).toBe(true);
			expect(actual).toBeCloseTo(expectedValue, 10);
		}
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
		expect(Parser.parse('diff(5*log(x^2)^2,x)').text()).toEqual(
			Parser.parse('20*x^-1*log(x^2)').text()
		);
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
		expect(Parser.parse('diff(cos(log(x^3)),x)').text()).toEqual(
			Parser.parse('-3*x^-1*sin(log(x^3))').text()
		);

		expect(Parser.parse('diff(abs(x^2+1),x)').text()).toEqual('2*x');
	});
});

describe('Differentiation regressions', () => {
	it('does not retain zero powers when differentiating during evaluation', () => {
		expect(Parser.evaluate('diff(x-y,x)').text()).toEqual('1');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/675
	it('treats radicals independent of the differentiation variable as constants', () => {
		expect(nerdamer.diff('y*sqrt(x)', 'y').text()).toEqual('x^(1/2)');
		expect(nerdamer.diff('y/sqrt(x)', 'y').text()).toEqual('x^(-1/2)');
		expect(nerdamer.diff('sqrt(y)*sqrt(x)', 'y').text()).toEqual(
			'(1/2)*y^(-1/2)*x^(1/2)'
		);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/590
	it('differentiates a compound square-root sum by the chain rule', () => {
		// The original screenshot is unavailable, so this reconstructs the source from the
		// surviving mathematical constraints: the reported outer factor 3*(sqrt(x)+x)^2
		// and the exact derivative value 135 at x=4.
		const derivative = nerdamer.diff('(sqrt(x)+x)^3', 'x');
		const expected = Expression.create('3*(sqrt(x)+x)^2*(1+1/(2*sqrt(x)))');

		expect(derivative.minus(expected).simplify().isZero()).toBe(true);
		expect(Number(derivative.evaluate({ x: 4 }).text({ decimal: true }))).toBeCloseTo(135, 12);
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/610
	it('applies the chain rule to a square root containing an exponential', () => {
		const derivative = nerdamer.diff('sqrt(e^x+a)', 'x');
		const expected = Expression.create('e^x/(2*sqrt(e^x+a))');

		expect(derivative.minus(expected).simplify().isZero()).toBe(true);
		const actualAtPoint = Number(derivative.evaluate({ x: 0, a: 3 }).text({ decimal: true }));
		expect(actualAtPoint).toBeCloseTo(1 / 4, 12);
	});
});
