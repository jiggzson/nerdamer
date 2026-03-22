import { Equation } from '../../src/core/classes/equation/Equation';
import { Expression } from '../../src/core/classes/expression/Expression';
import { one } from '../../src/core/classes/expression/shortcuts';

describe('Equation', () => {
	it('should construct and stringify (smoke)', () => {
		const e = new Equation(Expression.create('x'), one());
		expect(typeof e.text()).toBe('string');
	});

	it('should report as Equation via duck typing', () => {
		const e = new Equation(Expression.create('x'), one());
		expect(Equation.isEquation(e)).toBe(true);
	});
});
