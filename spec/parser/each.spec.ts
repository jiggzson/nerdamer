import { Collection } from '../../src/core/classes/collection/Collection';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Parser } from '../../src/core/classes/parser/Parser';

describe('Parser each', () => {
	it('iterates supported parser containers', () => {
		const collection = 'script_each_collection';
		const item = 'script_each_item';
		const total = 'script_each_total';
		delete Parser.KNOWN_VALUES[collection];
		delete Parser.KNOWN_VALUES[item];
		delete Parser.KNOWN_VALUES[total];
		Parser.KNOWN_VALUES[collection] = new Collection([
			Expression.create(1),
			Expression.create(2),
			Expression.create(3),
		]);

		try {
			expect(
				Parser.parse(
					`let(${total},0,block(each([1,2,3],${item},${total}:${total}+${item}),${total}))`
				).text()
			).toEqual('6');
			expect(
				Parser.parse(
					`let(${total},0,block(each({1,2,3},${item},${total}:${total}+${item}),${total}))`
				).text()
			).toEqual('6');
			expect(
				Parser.parse(
					`let(${total},0,block(each({a=>1,b=>2},${item},${total}:${total}+${item}),${total}))`
				).text()
			).toEqual('3');
			expect(
				Parser.parse(
					`let(${total},0,block(each(${collection},${item},${total}:${total}+${item}),${total}))`
				).text()
			).toEqual('6');
		} finally {
			delete Parser.KNOWN_VALUES[collection];
			delete Parser.KNOWN_VALUES[item];
			delete Parser.KNOWN_VALUES[total];
		}
	});

	it('traverses matrices in row-major order', () => {
		const item = 'script_each_matrix_item';
		const total = 'script_each_matrix_total';
		delete Parser.KNOWN_VALUES[item];
		delete Parser.KNOWN_VALUES[total];

		try {
			const result = Parser.parse(
				`let(${total},0,block(each(matrix([1,2],[3,4]),${item},${total}:10*${total}+${item}),${total}))`
			);

			expect(result.text()).toEqual('1234');
		} finally {
			delete Parser.KNOWN_VALUES[item];
			delete Parser.KNOWN_VALUES[total];
		}
	});

	it('restores an existing iteration variable after traversal', () => {
		const item = 'script_each_existing_item';
		const total = 'script_each_existing_total';
		delete Parser.KNOWN_VALUES[item];
		delete Parser.KNOWN_VALUES[total];
		Parser.KNOWN_VALUES[item] = Expression.create(99);

		try {
			const result = Parser.parse(
				`let(${total},0,block(each([1,2,3],${item},${total}:${total}+${item}),${total}))`
			);

			expect(result.text()).toEqual('6');
			expect(Parser.parse(item).text()).toEqual('99');
		} finally {
			delete Parser.KNOWN_VALUES[item];
			delete Parser.KNOWN_VALUES[total];
		}
	});
});
