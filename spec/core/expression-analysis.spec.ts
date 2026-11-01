import '../helpers/registerNerdamerFunctions';
import { Parser } from '../../src/core/classes/parser/Parser';

import { Expression } from '../../src/core/classes/expression/Expression';
import { requireVariableName } from '../../src/core/classes/expression/utils';
import { UnexpectedInputError } from '../../src/core/errors';
import { prepareSolverInputs } from '../../src/solve/utils';

describe('Expression analysis', () => {
	it('should accurately extract variables', () => {
		expect((Parser.parse('a^x-6*y') as Expression).variables().sort()).toEqual(['a', 'x', 'y']);
		expect((Parser.parse('cos(x*y)') as Expression).variables().sort()).toEqual(['x', 'y']);
		expect((Parser.parse('4+5') as Expression).variables().sort()).toEqual([]);
	});


	it('should be able to find variables', () => {
		expect((Parser.parse('x') as Expression).hasVariable('x')).toBe(true);
		expect((Parser.parse('9') as Expression).hasVariable('x')).toBe(false);
		expect((Parser.parse('cos(x)') as Expression).hasVariable('x')).toBe(true);
		expect((Parser.parse('cos(x+a)') as Expression).hasVariable('a')).toBe(true);
		expect((Parser.parse('cos(9)-1') as Expression).hasVariable('a')).toBe(false);
		expect((Parser.parse('7^a*y-1') as Expression).hasVariable('a')).toBe(true);
		expect((Parser.parse('7^cos(a)') as Expression).hasVariable('a')).toBe(true);
		expect((Parser.parse('6*(4-x)^b') as Expression).hasVariable('a')).toBe(false);
		expect((Parser.parse('x*y*z-7*a*b') as Expression).hasVariable('b')).toBe(true);
		expect((Parser.parse('x*y*z-7*a*b') as Expression).hasVariable('t')).toBe(false);
		expect((Parser.parse('7*x*y*z-3*a*b') as Expression).hasVariable('a')).toBe(true);
	});


	it('should be able to detect functions', () => {
		expect((Parser.parse('cos(x)') as Expression).hasFunction('cos')).toBe(true);
		expect((Parser.parse('sin(cos(x))') as Expression).hasFunction('cos')).toBe(false);
		expect((Parser.parse('sin(cos(x))') as Expression).hasFunction('cos', true)).toBe(true);
		expect((Parser.parse('cos(x+a)^sin(x)') as Expression).hasFunction('sin')).toBe(false);
		expect((Parser.parse('cos(x+a)^sin(x)') as Expression).hasFunction('sin', true)).toBe(true);
		expect((Parser.parse('cos(x)*sin(x)') as Expression).hasFunction('sin')).toBe(true);
		expect((Parser.parse('7^a*y-1') as Expression).hasFunction('sin')).toBe(false);
		expect((Parser.parse('7^cos(a)') as Expression).hasFunction('cos')).toBe(false);
		expect((Parser.parse('(1+cos(x))^2') as Expression).hasFunction('cos')).toBe(true);
		expect((Parser.parse('cos(a)-cos(x)') as Expression).hasFunction('cos')).toBe(true);
		expect((Parser.parse('cos(x)-cos(x)') as Expression).hasFunction('cos')).toBe(false);
	});

});

describe('Expression names', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/676
	it('does not interpret letters in function names as variables', () => {
		expect(Expression.create('sin(x)').variables()).toEqual(['x']);
	});
});

describe('shared variable-name validation', () => {
	it('retains the existing default VAR acceptance behavior', () => {
		expect(requireVariableName(Expression.create('x'))).toBe('x');
		expect(requireVariableName(Expression.create('2*x'))).toBe('x');
		expect(requireVariableName(Expression.create('x^2'))).toBe('x');
	});

	it('rejects decorated or nonvariable inputs when a plain variable is required', () => {
		expect(requireVariableName(Expression.create('x'), true)).toBe('x');
		for (const source of ['2*x', 'x^2', 'x^-1', 'x+y', '2']) {
			expect(() => requireVariableName(Expression.create(source), true)).toThrow(UnexpectedInputError);
		}
	});

	it('enforces plain solver variables through the shared core validator', () => {
		expect(prepareSolverInputs('x^2-1', 'x').x).toBe('x');
		for (const source of ['2*x', 'x^2', 'x+y', '2']) {
			expect(() => prepareSolverInputs('x^2-1', source)).toThrow(UnexpectedInputError);
		}
	});
});
