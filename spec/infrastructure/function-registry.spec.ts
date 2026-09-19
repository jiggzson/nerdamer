'use strict';

describe('function registry', () => {
	it('provides built-in implementations through the normal dispatch table', () => {
		jest.isolateModules(() => {
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');
			const { DOUBLE_FACTORIAL, FACTORIAL } = jest.requireActual<
				typeof import('../../src/core/classes/parser/constants')
			>('../../src/core/classes/parser/constants');

			expect(mathFunctionRegistry.sin.fn).toBeDefined();
			expect(mathFunctionRegistry.expand.fn).toBeDefined();
			expect(mathFunctionRegistry.diff.fn).toBeDefined();
			expect(mathFunctionRegistry.solve.fn).toBeDefined();
			expect(mathFunctionRegistry[FACTORIAL].fn).toBeDefined();
			expect(mathFunctionRegistry[DOUBLE_FACTORIAL].fn).toBeDefined();
		});
	});

	it('keeps parser scripting in the same dispatch table', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');

			expect(mathFunctionRegistry.block.fn).toBeDefined();
			expect(mathFunctionRegistry.if.fn).toBeDefined();
			expect(mathFunctionRegistry.and.deferArguments).toBe(true);
			expect(mathFunctionRegistry.or.deferArguments).toBe(true);
			expect(mathFunctionRegistry.not.fn).toBeDefined();
			expect(mathFunctionRegistry.xor.fn).toBeDefined();
			expect(mathFunctionRegistry.iferror.deferArguments).toBe(true);
			expect(mathFunctionRegistry.iserror.deferArguments).toBe(true);
			expect(Parser.parse('if(1,5,6)').text()).toEqual('5');
			expect(Parser.parse('block(return(7),9)').text()).toEqual('7');
		});
	});

	it('evaluates the and truth table', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('and(1,1)').text()).toEqual('1');
			expect(Parser.parse('and(1,0)').text()).toEqual('0');
			expect(Parser.parse('and(0,1)').text()).toEqual('0');
			expect(Parser.parse('and(0,0)').text()).toEqual('0');
		});
	});

	it('evaluates the or truth table', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('or(1,1)').text()).toEqual('1');
			expect(Parser.parse('or(1,0)').text()).toEqual('1');
			expect(Parser.parse('or(0,1)').text()).toEqual('1');
			expect(Parser.parse('or(0,0)').text()).toEqual('0');
		});
	});

	it('evaluates the not truth table', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('not(1)').text()).toEqual('0');
			expect(Parser.parse('not(0)').text()).toEqual('1');
		});
	});

	it('evaluates the xor truth table', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('xor(1,1)').text()).toEqual('0');
			expect(Parser.parse('xor(1,0)').text()).toEqual('1');
			expect(Parser.parse('xor(0,1)').text()).toEqual('1');
			expect(Parser.parse('xor(0,0)').text()).toEqual('0');
		});
	});

	it('uses nonzero truth semantics and supports variadic boolean arguments', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('and(2,-3,4)').text()).toEqual('1');
			expect(Parser.parse('and(2,0,-3)').text()).toEqual('0');
			expect(Parser.parse('or(0,0,-4)').text()).toEqual('1');
			expect(Parser.parse('not(-4)').text()).toEqual('0');
			expect(Parser.parse('xor(1,2,3)').text()).toEqual('1');
			expect(Parser.parse('xor(1,2,3,4)').text()).toEqual('0');
		});
	});

	it('short-circuits boolean and/or evaluation', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('and(0,break())').text()).toEqual('0');
			expect(Parser.parse('or(1,break())').text()).toEqual('1');
			expect(() => Parser.parse('and(1,break())')).toThrow();
			expect(() => Parser.parse('or(0,break())')).toThrow();
		});
	});

	it('returns the original value or fallback from iferror', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('iferror(5,0/0)').text()).toEqual('5');
			expect(Parser.parse('iferror(0/0,7)').text()).toEqual('7');
			expect(() => Parser.parse('iferror(0/0,0/0)')).toThrow();
		});
	});

	it('reports whether deferred evaluation throws with iserror', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			expect(Parser.parse('iserror(5)').text()).toEqual('0');
			expect(Parser.parse('iserror(0/0)').text()).toEqual('1');
		});
	});

	it('does not treat return control flow as a catchable error', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);
			const { mathFunctionRegistry } = jest.requireActual<
				typeof import('../../src/core/dispatch')
			>('../../src/core/dispatch');

			const iferrorFunction = 'script_iferror_return';
			const iserrorFunction = 'script_iserror_return';
			delete mathFunctionRegistry[iferrorFunction];
			delete mathFunctionRegistry[iserrorFunction];

			try {
				Parser.parse(`${iferrorFunction}():=iferror(return(5),7)`);
				Parser.parse(`${iserrorFunction}():=iserror(return(6))`);

				expect(Parser.parse(`${iferrorFunction}()`).text()).toEqual('5');
				expect(Parser.parse(`${iserrorFunction}()`).text()).toEqual('6');
			} finally {
				delete mathFunctionRegistry[iferrorFunction];
				delete mathFunctionRegistry[iserrorFunction];
			}
		});
	});

	it('does not treat break and continue as catchable errors', () => {
		jest.isolateModules(() => {
			const { Parser } = jest.requireActual<typeof import('../../src/api/parser')>(
				'../../src/api/parser'
			);

			const breakValue = 'script_iferror_break';
			const continueValue = 'script_iferror_continue';
			const breakResult = Parser.parse(
				`let(${breakValue},0,block(while(1,block(${breakValue}:1,iferror(break(),${breakValue}:99))),${breakValue}))`
			);
			const continueResult = Parser.parse(
				`let(${continueValue},0,block(for(${continueValue}:0,1-${continueValue},${continueValue}:${continueValue}+1,iferror(continue(),${continueValue}:99)),${continueValue}))`
			);

			expect(breakResult.text()).toEqual('1');
			expect(continueResult.text()).toEqual('1');
		});
	});

	it('keeps calculus chain methods on the full package boundary', () => {
		jest.isolateModules(() => {
			const { Expression } = jest.requireActual<
				typeof import('../../src/core/classes/expression/Expression')
			>('../../src/core/classes/expression/Expression');
			const { diff } = jest.requireActual<typeof import('../../src/api/calculus')>(
				'../../src/api/calculus'
			);

			expect('diff' in Expression.prototype).toBe(false);
			expect(diff('x^2', 'x').text()).toEqual('2*x');
		});
	});
});
