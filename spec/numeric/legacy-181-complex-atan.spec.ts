import nerdamer from '../../src/index';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Expression } from '../../src/core/classes/expression/Expression';

describe('legacy #181 complex arctangent', () => {
	// The complex arctangent has singularities at i and -i.
	it('keeps both singular points symbolic before evaluation', () => {
		expect(nerdamer('atan(i)').text()).toBe('atan(i)');
		expect(nerdamer('atan(-i)').text()).toBe('atan(-i)');
	});

	it('does not produce a finite numerical value at either singularity', () => {
		expect(() => Parser.evaluate('atan(i)')).toThrow();
		expect(() => Parser.evaluate('atan(-i)')).toThrow();
	});

	it('evaluates a nonsingular imaginary input', () => {
		const result = Parser.evaluate('atan(2*i)');
		expect(Expression.isExpression(result) && result.isComplex()).toBe(true);
	});
});
