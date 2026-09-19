import nerdamer from '../../src/index';
import { Parser } from '../../src/core/classes/parser/Parser';
import { mathFunctionRegistry } from '../../src/core/dispatch';

describe('Semicolon statements', () => {
	it('evaluates root statements in order and returns the final result', () => {
		const name = 'semicolon_root_function';
		delete mathFunctionRegistry[name];

		try {
			const result = nerdamer(`${name}(x):=x^2+1; ${name}(12)`);

			expect(result.text()).toEqual('145');
		} finally {
			delete mathFunctionRegistry[name];
		}
	});

	it('unassigns a known value before evaluating the next statement', () => {
		const variable = 'semicolon_unassign_value';
		delete Parser.KNOWN_VALUES[variable];

		try {
			const result = nerdamer(`${variable}:5; unassign(${variable}); ${variable};`);

			expect(result.text()).toEqual(variable);
			expect(Parser.KNOWN_VALUES[variable]).toBeUndefined();
		} finally {
			delete Parser.KNOWN_VALUES[variable];
		}
	});

	it('keeps semicolon statements scoped inside block and nested control flow', () => {
		const name = 'semicolon_nested_function';
		const value = 'semicolon_nested_value';
		delete mathFunctionRegistry[name];
		delete Parser.KNOWN_VALUES[value];

		try {
			const result = nerdamer(`
				block(
					${name}(x):=x^2+1;
					${name}(12),
					${value}:4,
					if(${value}>3,
						return(8);
					),
					${name}(${value});
				)
			`);

			expect(result.text()).toEqual('8');
		} finally {
			delete mathFunctionRegistry[name];
			delete Parser.KNOWN_VALUES[value];
		}
	});

	it('allows a statement terminator immediately before a block comma', () => {
		const name = 'semicolon_before_comma_function';
		const value = 'semicolon_before_comma_value';
		delete mathFunctionRegistry[name];
		delete Parser.KNOWN_VALUES[value];

		try {
			const result = nerdamer(`
				block(
					${name}(x):=x^2+1;
					${name}(12);,
					${value}:4,
					if(${value}>30,
						return(8);
					),
					${name}(${value});
				)
			`);

			expect(result.text()).toEqual('17');
		} finally {
			delete mathFunctionRegistry[name];
			delete Parser.KNOWN_VALUES[value];
		}
	});

	it('allows a trailing semicolon without changing the result', () => {
		expect(nerdamer('2+3;').text()).toEqual('5');
		expect(nerdamer('block(2,3;)').text()).toEqual('3');
	});
});
