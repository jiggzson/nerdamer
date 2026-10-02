import { Parser } from '../../src/core/classes/parser/Parser';
import { loadParserFunctions } from '../../src/core/parserFunctions';

loadParserFunctions();

describe('Dynamic indexed references', () => {
	it('resolves a dictionary index from the active parser scope', () => {
		const dictionary = 'script_dynamic_index_dictionary';
		const key = 'script_dynamic_index_key';
		delete Parser.KNOWN_VALUES[dictionary];
		delete Parser.KNOWN_VALUES[key];

		try {
			const result = Parser.parse(
				`block(${dictionary}:{x=>1},${key}:x,${dictionary}[${key}])`
			);

			expect(result.text()).toEqual('1');
		} finally {
			delete Parser.KNOWN_VALUES[dictionary];
			delete Parser.KNOWN_VALUES[key];
		}
	});

	it('preserves an unresolved dictionary index as its literal symbolic key', () => {
		const dictionary = 'script_literal_index_dictionary';
		delete Parser.KNOWN_VALUES[dictionary];

		try {
			const result = Parser.parse(`block(${dictionary}:{x=>5},${dictionary}[x])`);

			expect(result.text()).toEqual('5');
		} finally {
			delete Parser.KNOWN_VALUES[dictionary];
		}
	});

	it('resolves a dynamic dictionary index inside each', () => {
		const dictionary = 'script_each_index_dictionary';
		const key = 'script_each_index_key';
		const value = 'script_each_index_value';
		delete Parser.KNOWN_VALUES[dictionary];
		delete Parser.KNOWN_VALUES[key];
		delete Parser.KNOWN_VALUES[value];

		try {
			const result = Parser.parse(
				`block(${dictionary}:{x=>1,y=>2},each(${dictionary},${key},${value},${dictionary}[${key}]))`
			);

			expect(result.text()).toEqual('2');
		} finally {
			delete Parser.KNOWN_VALUES[dictionary];
			delete Parser.KNOWN_VALUES[key];
			delete Parser.KNOWN_VALUES[value];
		}
	});

	it('resolves a dynamic dictionary index for indexed assignment', () => {
		const dictionary = 'script_assignment_index_dictionary';
		const key = 'script_assignment_index_key';
		delete Parser.KNOWN_VALUES[dictionary];
		delete Parser.KNOWN_VALUES[key];

		try {
			const result = Parser.parse(
				`block(${dictionary}:{x=>1},${key}:x,${dictionary}[${key}]:2,${dictionary}[x])`
			);

			expect(result.text()).toEqual('2');
		} finally {
			delete Parser.KNOWN_VALUES[dictionary];
			delete Parser.KNOWN_VALUES[key];
		}
	});

	it('resolves a computed Vector index from the active parser scope', () => {
		const vector = 'script_computed_index_vector';
		const index = 'script_computed_index_value';
		delete Parser.KNOWN_VALUES[vector];
		delete Parser.KNOWN_VALUES[index];

		try {
			const result = Parser.parse(
				`block(${vector}:[4,1,6,3],${index}:1,${vector}[${index}+1])`
			);

			expect(result.text()).toEqual('6');
		} finally {
			delete Parser.KNOWN_VALUES[vector];
			delete Parser.KNOWN_VALUES[index];
		}
	});

	it('preserves the established return propagation in the reported regression', () => {
		const dictionary = 'script_return_index_dictionary';
		const key = 'script_return_index_key';
		const value = 'script_return_index_value';
		delete Parser.KNOWN_VALUES[dictionary];
		delete Parser.KNOWN_VALUES[key];
		delete Parser.KNOWN_VALUES[value];

		try {
			const result = Parser.parse(
				`block(${dictionary}:{x=>x,y=>2},each(${dictionary},${key},${value},if(${value}==${dictionary}[${key}],return(${key}),-1)))`
			);

			expect(result.text()).toEqual('x');
		} finally {
			delete Parser.KNOWN_VALUES[dictionary];
			delete Parser.KNOWN_VALUES[key];
			delete Parser.KNOWN_VALUES[value];
		}
	});
});
