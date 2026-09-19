import { Dictionary } from '../../src/core/classes/dictionary/Dictionary';
import { Parser } from '../../src/core/classes/parser/Parser';

beforeEach(() => {
	// Clear known values between tests
	for (const key of Object.keys(Parser.KNOWN_VALUES)) {
		delete Parser.KNOWN_VALUES[key];
	}
});

describe('Dictionary', () => {
	describe('construction and parsing', () => {
		it('should parse a dictionary literal', () => {
			const result = Parser.parse('{x => 1, y => 2, z => 3}');
			expect(Dictionary.isDictionary(result)).toBe(true);
		});

		it('should produce correct text output', () => {
			expect(Parser.parse('{x => 1, y => 2}').text()).toEqual('{x => 1, y => 2}');
		});

		it('should parse symbolic values', () => {
			expect(Parser.parse('{a => x+1, b => x^2}').text()).toEqual('{a => 1+x, b => x^2}');
		});

		it('should still parse curly braces as ValuesSet when no => is used', () => {
			const result = Parser.parse('{1, 2, 3}');
			expect(Dictionary.isDictionary(result)).toBe(false);
		});
	});

	describe('getter (bracket indexing)', () => {
		it('should access a value by key', () => {
			Parser.parse('d: {x => 1, y => 2, z => 3}');
			expect(Parser.parse('d[x]').text()).toEqual('1');
		});

		it('should access a symbolic value by key', () => {
			Parser.parse('d: {a => x+1, b => x^2}');
			expect(Parser.parse('d[b]').text()).toEqual('x^2');
		});

		it('should access from an inline dictionary', () => {
			expect(Parser.parse('{a => 5, b => 10}[b]').text()).toEqual('10');
		});
	});

	describe('setter (bracket assignment)', () => {
		it('should set a value by key', () => {
			Parser.parse('d: {x => 1, y => 2}');
			expect(Parser.parse('d[y]: 10').text()).toEqual('{x => 1, y => 10}');
		});

		it('should add a new key', () => {
			Parser.parse('d: {x => 1}');
			expect(Parser.parse('d[z]: 99').text()).toEqual('{x => 1, z => 99}');
		});
	});

	describe('element-wise arithmetic', () => {
		it('should add a scalar', () => {
			expect(Parser.parse('{a => 1, b => 2}+3').text()).toEqual('{a => 4, b => 5}');
		});

		it('should subtract a scalar', () => {
			expect(Parser.parse('{a => 10, b => 20}-5').text()).toEqual('{a => 5, b => 15}');
		});

		it('should multiply by a scalar', () => {
			expect(Parser.parse('{a => 2, b => 3}*4').text()).toEqual('{a => 8, b => 12}');
		});

		it('should divide by a scalar', () => {
			expect(Parser.parse('{a => 10, b => 20}/5').text()).toEqual('{a => 2, b => 4}');
		});
	});

	describe('equality', () => {
		it('should detect equal dictionaries', () => {
			Parser.parse('d1: {x => 1, y => 2}');
			Parser.parse('d2: {x => 1, y => 2}');
			expect(Parser.parse('d1 == d2').text()).toEqual('1');
		});

		it('should detect unequal dictionaries', () => {
			Parser.parse('d1: {x => 1, y => 2}');
			Parser.parse('d2: {x => 1, y => 3}');
			expect(Parser.parse('d1 == d2').text()).toEqual('0');
		});
	});

	describe('copy', () => {
		it('should produce an independent copy', () => {
			Parser.parse('d: {x => 1, y => 2}');
			const original = Parser.KNOWN_VALUES['d'] as Dictionary;
			const copy = original.copy();
			copy.set('x', Parser.parse('999'));
			expect(original.__get__('x').text()).toEqual('1');
		});
	});

	describe('class methods', () => {
		it('should report correct count', () => {
			const d = Parser.parse('{a => 1, b => 2, c => 3}') as Dictionary;
			expect(d.count()).toEqual(3);
		});

		it('should return keys', () => {
			const d = Parser.parse('{a => 1, b => 2}') as Dictionary;
			expect(d.keys()).toEqual(['a', 'b']);
		});

		it('should check key existence', () => {
			const d = Parser.parse('{a => 1, b => 2}') as Dictionary;
			expect(d.has('a')).toBe(true);
			expect(d.has('c')).toBe(false);
		});

		it('should delete a key', () => {
			const d = Parser.parse('{a => 1, b => 2, c => 3}') as Dictionary;
			d.delete('b');
			expect(d.count()).toEqual(2);
			expect(d.has('b')).toBe(false);
		});

		it('should report dimensions', () => {
			const d = Parser.parse('{a => 1, b => 2}') as Dictionary;
			expect(d.dimensions()).toEqual([2]);
		});

		it('should evaluate values', () => {
			const d = Parser.parse('{a => 2+3, b => 4*2}') as Dictionary;
			const evaluated = d.evaluate();
			expect(evaluated.__get__('a').text()).toEqual('5');
			expect(evaluated.__get__('b').text()).toEqual('8');
		});
	});
});
