import { Expression } from '../../src/core/classes/expression/Expression';
import { evaluate } from '../../src/core/classes/parser/scripting/evaluate';
import { UnsupportedOperationError } from '../../src/core/errors';

describe('scripting evaluate error propagation', () => {
	// Unsupported evaluations preserve the original parser value.
	it('returns its input for unsupported evaluation', () => {
		const input = Expression.Variable('x');
		const original = input.evaluate;
		input.evaluate = () => { throw new UnsupportedOperationError('unsupported'); };
		try {
			expect(evaluate(() => input)).toBe(input);
		} finally {
			input.evaluate = original;
		}
	});

	it('propagates unexpected evaluation errors', () => {
		const input = Expression.Variable('x');
		const original = input.evaluate;
		input.evaluate = () => { throw new TypeError('unexpected'); };
		try {
			expect(() => evaluate(() => input)).toThrow(TypeError);
		} finally {
			input.evaluate = original;
		}
	});
});
