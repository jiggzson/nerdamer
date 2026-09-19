import { Parser } from '../../src/core/classes/parser/Parser';
import { DimensionError, UnexpectedInputError } from '../../src/core/errors';

describe('scripting evaluate variable and point vectors', () => {
	it('evaluates expressions with generic variable names', () => {
		expect(Parser.parse('evaluate(u+v,[u,v],[2,3])').text()).toEqual('5');
	});

	it('evaluates vectors and matrices with the same variable mapping', () => {
		expect(
			Parser.parse('evaluate([u+v,u*v],[u,v],[2,3])').text()
		).toEqual('[5, 6]');
		expect(
			Parser.parse(
				'evaluate(matrix([u+v,u*v],[u^2,v^2]),[u,v],[2,3])'
			).text()
		).toEqual('matrix([5, 6], [4, 9])');
	});

	it('rejects mismatched variable and point dimensions', () => {
		expect(() => Parser.parse('evaluate(u+v,[u,v],[2])')).toThrow(DimensionError);
	});

	it('requires plain variables in the variable vector', () => {
		expect(() => Parser.parse('evaluate(u+v,[u+1,v],[2,3])')).toThrow(
			UnexpectedInputError
		);
	});
});
