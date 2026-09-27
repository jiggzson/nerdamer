import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';
import {
	RETURN,
	ReturnSignal,
	functionBoundary,
	parserReturnBoundary,
} from '../../src/core/classes/parser/scripting/controlFlow';
import { mathFunctionRegistry } from '../../src/core/dispatch';
import { loadParserFunctions } from '../../src/core/parserFunctions';

loadParserFunctions();

/** Regression coverage for issue #310 return-scope semantics. */
describe('Scripting return scope', () => {
	const knownNames = [
		'return_scope_after',
		'return_scope_loop_after',
		'return_scope_each_after',
		'return_scope_for_index',
		'return_scope_issue_k',
	];
	const functionNames = [
		'return_scope_identity',
		'return_scope_outer',
		'return_scope_inner',
		'return_scope_nested_let',
		'return_scope_if',
		'return_scope_for',
		'return_scope_while',
		'return_scope_each',
		'return_scope_expression',
		'return_scope_vector',
		'return_scope_matrix',
		'return_scope_dictionary',
	];

	afterEach(() => {
		for (const name of knownNames) delete Parser.KNOWN_VALUES[name];
		for (const name of functionNames) delete mathFunctionRegistry[name];
	});

	it('RETURN carries its value as a ReturnSignal', () => {
		const value = Expression.create(7);
		try {
			RETURN(value);
			throw new Error('RETURN did not transfer control');
		} catch (error) {
			expect(ReturnSignal.isReturnSignal(error)).toBe(true);
			if (ReturnSignal.isReturnSignal(error)) expect(error.value).toBe(value);
		}
	});

	it('functionBoundary consumes return and exposes its value', () => {
		expect(functionBoundary(() => RETURN(Expression.create(7))).text()).toEqual('7');
	});

	it('the outer parser return boundary consumes return', () => {
		expect(parserReturnBoundary(() => RETURN(Expression.create(7))).text()).toEqual('7');
	});

	it('a direct top-level return escapes Parser.parse as a ReturnSignal', () => {
		try {
			Parser.parse('return(7)');
			throw new Error('direct top-level return did not escape Parser.parse');
		} catch (error) {
			expect(ReturnSignal.isReturnSignal(error)).toBe(true);
			if (ReturnSignal.isReturnSignal(error)) expect(error.value.text()).toEqual('7');
		}
	});

	it('block consumes a top-level return', () => {
		expect(Parser.parse('block(return(7))').text()).toEqual('7');
	});

	it('let consumes a top-level return and restores the local', () => {
		expect(Parser.parse('let(x,3,return(x))').text()).toEqual('3');
		expect(Parser.parse('x').text()).toEqual('x');
	});

	it('a return owned by block stops later statements in that block', () => {
		Parser.KNOWN_VALUES.return_scope_after = Expression.create(0);
		const result = Parser.parse('block(return_scope_after:1,return(7),return_scope_after:2,9)');
		expect(result.text()).toEqual('7');
		expect(Parser.parse('return_scope_after').text()).toEqual('1');
	});

	it('let consumes return in its body and restores an existing local', () => {
		Parser.KNOWN_VALUES.return_scope_after = Expression.create(19);
		const result = Parser.parse('let(return_scope_after,3,block(return(return_scope_after),return_scope_after:4))');
		expect(result.text()).toEqual('3');
		expect(Parser.parse('return_scope_after').text()).toEqual('19');
	});

	it('nested let scopes consume the innermost return and restore both locals', () => {
		Parser.KNOWN_VALUES.return_scope_after = Expression.create(23);
		const result = Parser.parse('let(a,2,let(return_scope_after,5,return(a+return_scope_after)))');
		expect(result.text()).toEqual('7');
		expect(Parser.parse('return_scope_after').text()).toEqual('23');
		expect(Parser.parse('a').text()).toEqual('a');
	});

	it('return inside top-level let does not stop the surrounding block', () => {
		Parser.KNOWN_VALUES.return_scope_issue_k = Expression.create(2);
		Parser.KNOWN_VALUES.return_scope_after = Expression.create(0);
		const result = Parser.parse('block(let(x,3,return(return_scope_issue_k*x)),return_scope_after:9)');
		expect(result.text()).toEqual('9');
		expect(Parser.parse('return_scope_after').text()).toEqual('9');
		expect(Parser.parse('x').text()).toEqual('x');
	});

	it('return inside a top-level true if branch does not stop the surrounding block', () => {
		expect(Parser.parse('block(if(1,return(7),8),9)').text()).toEqual('9');
	});

	it('return inside a top-level false if branch does not stop the surrounding block', () => {
		expect(Parser.parse('block(if(0,8,return(7)),9)').text()).toEqual('9');
	});

	it('return exits a top-level for without stopping the surrounding block', () => {
		Parser.KNOWN_VALUES.return_scope_loop_after = Expression.create(0);
		const result = Parser.parse('block(for(return_scope_for_index:0,return_scope_for_index<3,return_scope_for_index:return_scope_for_index+1,block(return_scope_loop_after:return_scope_loop_after+1,return(return_scope_for_index))),return_scope_loop_after:99)');
		expect(result.text()).toEqual('99');
		expect(Parser.parse('return_scope_for_index').text()).toEqual('0');
		expect(Parser.parse('return_scope_loop_after').text()).toEqual('99');
	});

	it('return exits a top-level while without stopping the surrounding block', () => {
		Parser.KNOWN_VALUES.return_scope_loop_after = Expression.create(0);
		const result = Parser.parse('block(while(1,block(return_scope_loop_after:return_scope_loop_after+1,return(7))),return_scope_loop_after:99)');
		expect(result.text()).toEqual('99');
		expect(Parser.parse('return_scope_loop_after').text()).toEqual('99');
	});

	it('return exits top-level each without stopping the surrounding block and restores the iterator', () => {
		Parser.KNOWN_VALUES.return_scope_each_after = Expression.create(0);
		const result = Parser.parse('block(each([2,4,6],x,block(return_scope_each_after:return_scope_each_after+1,return(x))),return_scope_each_after:99)');
		expect(result.text()).toEqual('99');
		expect(Parser.parse('return_scope_each_after').text()).toEqual('99');
		expect(Parser.parse('x').text()).toEqual('x');
	});

	it('a user-defined function consumes return and caller execution continues', () => {
		Parser.KNOWN_VALUES.return_scope_after = Expression.create(0);
		Parser.parse('return_scope_identity(x):=block(return(x+1),99)');
		const result = Parser.parse('block(return_scope_after:return_scope_identity(2),return_scope_after:return_scope_after+10,return_scope_after)');
		expect(result.text()).toEqual('13');
		expect(Parser.parse('return_scope_after').text()).toEqual('13');
	});

	it('an inner function return does not return from its caller', () => {
		Parser.parse('return_scope_inner(x):=return(x+1)');
		Parser.parse('return_scope_outer(x):=block(y:return_scope_inner(x),return(y+10),999)');
		expect(Parser.parse('return_scope_outer(2)').text()).toEqual('13');
	});

	it('return crosses nested let scopes only as far as the user-defined function boundary', () => {
		Parser.parse('return_scope_nested_let(x):=let(a,x+1,let(b,a+1,block(return(a+b),999)))');
		expect(Parser.parse('return_scope_nested_let(2)').text()).toEqual('7');
		expect(Parser.parse('a').text()).toEqual('a');
		expect(Parser.parse('b').text()).toEqual('b');
	});

	it('return inside if exits its user-defined function', () => {
		Parser.parse('return_scope_if(x):=block(if(x,return(7),return(8)),99)');
		expect(Parser.parse('return_scope_if(1)').text()).toEqual('7');
		expect(Parser.parse('return_scope_if(0)').text()).toEqual('8');
	});

	it('return inside for exits its user-defined function', () => {
		Parser.parse('return_scope_for():=block(for(return_scope_for_index:0,return_scope_for_index<3,return_scope_for_index:return_scope_for_index+1,return(return_scope_for_index)),99)');
		expect(Parser.parse('return_scope_for()').text()).toEqual('0');
	});

	it('return inside while exits its user-defined function', () => {
		Parser.parse('return_scope_while():=block(while(1,return(7)),99)');
		expect(Parser.parse('return_scope_while()').text()).toEqual('7');
	});

	it('return inside each exits its user-defined function', () => {
		Parser.parse('return_scope_each():=block(each([2,4,6],x,return(x)),99)');
		expect(Parser.parse('return_scope_each()').text()).toEqual('2');
		expect(Parser.parse('x').text()).toEqual('x');
	});

	it('return preserves a symbolic expression value', () => {
		Parser.parse('return_scope_expression(x):=return(x^2+1)');
		expect(Parser.parse('return_scope_expression(t)').text()).toEqual('1+t^2');
	});

	it('return preserves a Vector value', () => {
		Parser.parse('return_scope_vector():=return([1,x,3])');
		expect(Parser.parse('return_scope_vector()').text()).toEqual('[1, x, 3]');
	});

	it('return preserves a Matrix value', () => {
		Parser.parse('return_scope_matrix():=return(matrix([1,2],[3,4]))');
		expect(Parser.parse('return_scope_matrix()').text()).toEqual('matrix([1, 2], [3, 4])');
	});

	it('return preserves a Dictionary value', () => {
		Parser.parse('return_scope_dictionary():=return(pfactord(12))');
		expect(Parser.parse('return_scope_dictionary()').text()).toEqual(Parser.parse('pfactord(12)').text());
	});
});
