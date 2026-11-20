import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import { scopedBlock } from '../../src/core/Settings';
import nerdamer from '../../src/index';

describe('Gamma at a substituted half-integer', () => {
	// Reference values from mpmath at 20 digits.
	it.each([
		['gamma(x)', '1.5', '0.88622692545275801365'],
		['gamma(x)-2', '0.5', '-0.2275461490944839727'],
		['gamma(x)', '-1/2', '-3.5449077018110320546'],
		['gamma(x)', '7/2', '3.3233509704478425512'],
		['gamma(x)', '21/2', '1133278.3889487855673'],
		['factorial(x)', '0.5', '0.88622692545275801365'],
	])('evaluates %s at x = %s to a number', (source, x, expected) => {
		const result = nerdamer(source).evaluate({ x });
		expect(Expression.isExpression(result) && result.isNUM()).toBe(true);
		expect(result.text()).toBe(expected);
	});

	it('evaluates through the parser under EVALUATE', () => {
		const rpn = Parser.toRPN(Parser.tokenize('gamma(x)'));
		const result = scopedBlock('EVALUATE', true, () =>
			Parser.parseRPN(rpn, { x: Expression.create('1.5') })
		) as Expression;
		expect(result.text()).toBe('0.88622692545275801365');
	});

	it.each([
		['gamma(1/2)', 'pi^(1/2)'],
		['gamma(3/2)', '(1/2)*pi^(1/2)'],
		['gamma(-1/2)', '-2*pi^(1/2)'],
		// sqrt(pi) built as a power combines with other powers.
		['gamma(1/2)^2', 'pi'],
	])('keeps the exact form of %s', (source, expected) => {
		expect(nerdamer(source).text()).toBe(expected);
	});
});
