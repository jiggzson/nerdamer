import { Parser } from '../../src/core/classes/parser/Parser';
import { registerNerdamerFunctions } from '../../src/core/fullFunctions';

registerNerdamerFunctions();

describe('Dictionary each', () => {
	const names = [
		'dictionary_each_total',
		'dictionary_each_item',
		'dictionary_each_key',
		'dictionary_each_value',
		'dictionary_each_found',
	];

	afterEach(() => {
		for (const name of names) delete Parser.KNOWN_VALUES[name];
	});

	it('iterates dictionary values in insertion order with the existing three-argument form', () => {
		const result = Parser.parse(
			'let(dictionary_each_total,0,block(each({a=>1,b=>2,c=>3},dictionary_each_item,dictionary_each_total:10*dictionary_each_total+dictionary_each_item),dictionary_each_total))'
		);

		expect(result.text()).toEqual('123');
		expect(Parser.parse('dictionary_each_item').text()).toEqual('dictionary_each_item');
	});

	it('iterates dictionary keys and values together with the four-argument form', () => {
		const result = Parser.parse(
			'each({a=>1,b=>2},dictionary_each_key,dictionary_each_value,dictionary_each_key+dictionary_each_value)'
		);

		expect(result.text()).toEqual('2+b');
		expect(Parser.parse('dictionary_each_key').text()).toEqual('dictionary_each_key');
		expect(Parser.parse('dictionary_each_value').text()).toEqual('dictionary_each_value');
	});

	it('preserves dictionary insertion order in the four-argument form', () => {
		const result = Parser.parse(
			'let(dictionary_each_total,0,block(each({c=>3,a=>1,b=>2},dictionary_each_key,dictionary_each_value,dictionary_each_total:10*dictionary_each_total+dictionary_each_value),dictionary_each_total))'
		);

		expect(result.text()).toEqual('312');
	});

	it('restores existing key and value bindings after four-argument iteration', () => {
		Parser.parse('dictionary_each_key:41');
		Parser.parse('dictionary_each_value:42');

		const result = Parser.parse(
			'each({a=>1,b=>2},dictionary_each_key,dictionary_each_value,dictionary_each_value)'
		);

		expect(result.text()).toEqual('2');
		expect(Parser.parse('dictionary_each_key').text()).toEqual('41');
		expect(Parser.parse('dictionary_each_value').text()).toEqual('42');
	});

	it('restores existing key and value bindings when return exits four-argument iteration', () => {
		Parser.parse('dictionary_each_key:41');
		Parser.parse('dictionary_each_value:42');

		const result = Parser.parse(
			'each({a=>1,b=>2},dictionary_each_key,dictionary_each_value,return(dictionary_each_key))'
		);

		expect(result.text()).toEqual('a');
		expect(Parser.parse('dictionary_each_key').text()).toEqual('41');
		expect(Parser.parse('dictionary_each_value').text()).toEqual('42');
	});

	it('rejects the four-argument form for non-dictionary containers', () => {
		expect(() =>
			Parser.parse('each([1,2],dictionary_each_key,dictionary_each_value,dictionary_each_value)')
		).toThrow();
	});

	it('solveeqs exposes an underdetermined solution as a vector containing a dictionary with an identity entry', () => {
		const result = Parser.parse('solveeqs([x+y+z=6,x-y=2])');

		expect(result.text()).toEqual('[{x => 4+(-1/2)*z, y => 2+(-1/2)*z, z => z}]');
	});

	it('can recover the free-variable key from an underdetermined solveeqs dictionary', () => {
		const result = Parser.parse(
			'each(solveeqs([x+y+z=6,x-y=2])[0],dictionary_each_key,dictionary_each_value,if(dictionary_each_key==dictionary_each_value,return(dictionary_each_key)))'
		);

		expect(result.text()).toEqual('z');
		expect(Parser.parse('dictionary_each_key').text()).toEqual('dictionary_each_key');
		expect(Parser.parse('dictionary_each_value').text()).toEqual('dictionary_each_value');
	});
});
