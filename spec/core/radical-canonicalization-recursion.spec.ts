import '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { canonicalizeRadicals } from '../../src/core/classes/parser/operations/multiply';

describe('recursive radical canonicalization', () => {
	// Canonicalization must preserve expression value across container nodes.
	it.each([
		'x*2^(-1/2)',
		'x+2^(-1/2)',
		'(x+1)^(1/2)',
		'sin(2^(-1/2))',
		'2*x+3^(-1/2)',
	])('preserves %s', input => {
		const expression = Expression.create(input);
		const normalized = canonicalizeRadicals(expression);
		expect(normalized.eq(expression)).toBe(true);
	});

});
