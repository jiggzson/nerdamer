import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Vector } from '../../src/core/classes/vector/Vector';

describe('structured evaluation substitutions', () => {
	it('forwards substitutions to Vector expression elements', () => {
		const vector = new Vector(['x+y', 'x*y']);

		const evaluated = vector.evaluate({ x: 2, y: 3 });

		expect(Vector.isVector(evaluated)).toBe(true);
		if (Vector.isVector(evaluated)) {
			expect(evaluated.text()).toEqual('[5, 6]');
		}
	});

	it('forwards substitutions to Matrix elements', () => {
		const matrix = new Matrix(['x+y', 'x*y'], ['x^2', 'y^2']);

		const evaluated = matrix.evaluate({ x: 2, y: 3 });

		expect(Matrix.isMatrix(evaluated)).toBe(true);
		if (Matrix.isMatrix(evaluated)) {
			expect(evaluated.get(0, 0).text()).toEqual('5');
			expect(evaluated.get(0, 1).text()).toEqual('6');
			expect(evaluated.get(1, 0).text()).toEqual('4');
			expect(evaluated.get(1, 1).text()).toEqual('9');
		}
	});
});
