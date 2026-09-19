import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser } from '../../src/core/classes/parser/Parser';
import { mathFunctionRegistry } from '../../src/core/dispatch';

describe('Nerdamer Scripting evaluate substitutions', () => {
	it('evaluates an expression with a substitution Dictionary', () => {
		expect(Parser.parse('evaluate(x+y,{x=>2,y=>3})').text()).toEqual('5');
	});

	it('evaluates Vector and Matrix values with one substitution Dictionary', () => {
		expect(Parser.parse('evaluate([x+y,x*y],{x=>2,y=>3})').text()).toEqual('[5, 6]');

		const matrix = Parser.parse(
			'evaluate(matrix([x+y,x*y],[x^2,y^2]),{x=>2,y=>3})'
		);
		expect(Matrix.isMatrix(matrix)).toBe(true);
		if (Matrix.isMatrix(matrix)) {
			expect(matrix.get(0, 0).text()).toEqual('5');
			expect(matrix.get(0, 1).text()).toEqual('6');
			expect(matrix.get(1, 0).text()).toEqual('4');
			expect(matrix.get(1, 1).text()).toEqual('9');
		}
	});

	it('allows computed Dictionary keys for reusable scripting helpers', () => {
		const name = 'script_evaluate_substitutions';
		delete mathFunctionRegistry[name];

		try {
			Parser.parse(
				`${name}(value,variables,point):=evaluate(value,{variables[0]=>point[0],variables[1]=>point[1]})`
			);

			expect(
				Parser.parse(`${name}([u+v,u*v],[u,v],[2,3])`).text()
			).toEqual('[5, 6]');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('rejects a non-Dictionary substitution argument', () => {
		expect(() => Parser.parse('evaluate(x+1,[2])')).toThrow();
	});
});
