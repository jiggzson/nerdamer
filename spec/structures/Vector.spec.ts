import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';

import type { Expression } from '../../src/core/classes/expression/Expression';

const pop = (v: Vector, i?: number) => {
	const e = v.pop(i);
	return (e as Expression).text();
};

describe('Vectors', () => {
	it('should pop', () => {
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]), 0)).toEqual('3*a^2');
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]))).toEqual('6');
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]), -1)).toEqual('6');
		expect(pop(new Vector(['3*a^2', 2, 3, 4, 5, 6]), -2)).toEqual('5');
		// The Vector should be mutated
		const v = new Vector(['a', 2, 3, 4, 5, 6]);
		v.pop(-3);
		expect(v.text()).toEqual('[a, 2, 3, 5, 6]');
	});

	describe('getters & setters', () => {
		it('should get elements using bracket notation', () => {
			expect(Parser.parse('[a, b, -4, 5][2]').text()).toEqual('-4');
		});

		it('should set elements using bracket notation', () => {
			Parser.parse('V: [a, b, c]');
			expect(Parser.parse('V[0]: y').text()).toEqual('[y, b, c]');
		});
		it('should respect brackets in functions', () => {
			expect(Parser.parse('cos(8*[1,2][1]+5)').text()).toEqual('cos(21)');
		});
	});

	describe('multiplication', () => {
		expect(Parser.parse('5*[1,2]*[x,y]').text()).toEqual('[5*x, 10*y]');
		// expect(()=>{Parser.parse('[a,b]*[1,2,3]')}).toThrow();
	});
});
