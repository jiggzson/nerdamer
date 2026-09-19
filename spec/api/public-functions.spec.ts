import nerdamer from '../../src/index';
import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { mathFunctionRegistry } from '../../src/core/dispatch';

describe('Public function API', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/27
	it('exposes TeX conversion through the current public API', () => {
		expect(nerdamer.convertToTeX('x+1')).toEqual('x+1');
		expect(nerdamer.convertToTeX('1/3', { decimal: true, precision: 5 })).toEqual('0.33333');
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/93
	it('calls functions registered through the public API', () => {
		const name = 'audit_legacy_93';

		try {
			nerdamer.setFunction(name, ['x'], 'x^2');
			expect(nerdamer(`${name}(4)`).text()).toEqual('16');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/114
	it('returns chainable expressions from solveFor', () => {
		const equation = nerdamer('x+3=33');

		expect(Equation.isEquation(equation)).toBe(true);
		if (Equation.isEquation(equation)) {
			const solution = equation.solveFor('x').at(0);

			expect(Expression.isExpression(solution)).toBe(true);
			if (Expression.isExpression(solution)) {
				expect(solution.div(2).eq(15)).toBe(true);
			}
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/214
	it('accepts the solveeqs array signature through root and parser dispatch', () => {
		const equations = ['x+y=1', '2*x=6', '4*z+y=6'];
		const rootResult = nerdamer.solveeqs(equations);
		const parserResult = nerdamer('solveeqs([x+y=1,2*x=6,4*z+y=6])');

		expect(rootResult.text()).toEqual('[{x => 3, y => -2, z => 2}]');
		expect(parserResult.text()).toEqual(rootResult.text());
	});

	// Regression: https://github.com/together-science/nerdamer-prime/issues/27
	it('exposes absolute value on Expression instances', () => {
		expect(nerdamer('x-2').abs().text()).toEqual('abs(-2+x)');
	});
});
