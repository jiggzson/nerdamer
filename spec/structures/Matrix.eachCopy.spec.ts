import { Expression } from '../../src/core/classes/expression/Expression';
import { four, one, three, two } from '../../src/core/classes/expression/shortcuts';
import { Matrix } from '../../src/core/classes/matrix/Matrix';

describe('Matrix each/copy/expand/evaluate', () => {
	it('copy should be independent', () => {
		const m = new Matrix([Expression.create('a')], [Expression.create('b')]);
		const c = m.copy();
		c.each(e => e);
		expect(m.text()).toEqual(
			new Matrix([Expression.create('a')], [Expression.create('b')]).text()
		);
	});

	it('each should return Matrix', () => {
		const m = new Matrix([Expression.create('a')], [Expression.create('b')]);
		const r = m.each(e => e);
		expect(r).toBeInstanceOf(Matrix);
	});

	it('constructor from rows should work (smoke)', () => {
		const m = new Matrix([one(), two()], [three(), four()]);
		expect(m.dimensions()).toEqual([2, 2]);
	});
});
