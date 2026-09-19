import nerdamer from '../../src/index';
import { Expression } from '../../src/core/classes/expression/Expression';
import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { Parser } from '../../src/core/classes/parser/Parser';
import { Vector } from '../../src/core/classes/vector/Vector';

describe('Symbolic structured access', () => {
	// Regression: https://github.com/jiggzson/nerdamer/issues/408
	it('sums vector elements through a symbolic iterator index', () => {
		const vectorName = 'legacy408v';

		try {
			nerdamer.setVar(vectorName, '[4,1,6,3,1]');
			expect(nerdamer(`sum(${vectorName}[i],i,1,3)`).text()).toEqual('10');
		} finally {
			nerdamer.setVar(vectorName, 'delete');
		}
	});

	it('preserves an unresolved single-index access in a Vector carrier', () => {
		const access = Parser.parse('V[i]');

		expect(Vector.isVector(access)).toBe(true);
		if (!Vector.isVector(access)) {
			throw new Error('Expected symbolic Vector access.');
		}
		expect(access.text()).toBe('V[i]');
	});

	it('normalizes symbolic Vector access before scalar functions and operators', () => {
		const absolute = Parser.parse('abs(V[i])');
		const shifted = Parser.parse('V[i]+2');

		expect(Expression.isExpression(absolute)).toBe(true);
		expect(absolute.text()).toBe('abs(V[i])');
		expect(Expression.isExpression(shifted)).toBe(true);
		expect(shifted.text()).toContain('V[i]');
	});

	it('resolves a previously parsed symbolic Vector access after the target is defined', () => {
		const access = Parser.parse('V[i]');

		if (!Vector.isVector(access)) {
			throw new Error('Expected symbolic Vector access.');
		}

		try {
			nerdamer.setVar('V', '[4,1,6,3,1]');
			expect(access.evaluate({ i: 2 }).text()).toBe('6');
		} finally {
			nerdamer.setVar('V', 'delete');
		}
	});

	// Regression: https://github.com/jiggzson/nerdamer/issues/408
	it('sums Vector elements through a symbolic iterator index', () => {
		const vectorName = 'legacy408v';

		try {
			nerdamer.setVar(vectorName, '[4,1,6,3,1]');
			expect(nerdamer(`sum(${vectorName}[i],i,1,3)`).text()).toBe('10');
			expect(nerdamer(`product(${vectorName}[i],i,1,3)`).text()).toBe('18');
		} finally {
			nerdamer.setVar(vectorName, 'delete');
		}
	});

	it('preserves and later resolves two-index symbolic Matrix access', () => {
		const access = Parser.parse('M[i,j]');

		expect(Matrix.isMatrix(access)).toBe(true);
		if (!Matrix.isMatrix(access)) {
			throw new Error('Expected symbolic Matrix access.');
		}
		expect(access.text()).toBe('M[i, j]');

		try {
			nerdamer.setVar('M', 'matrix([1,2],[3,4])');
			expect(access.evaluate({ i: 1, j: 0 }).text()).toBe('3');
			expect(Parser.parse('abs(M[i,j])').text()).toBe('abs(M[i, j])');
		} finally {
			nerdamer.setVar('M', 'delete');
		}
	});

	it('preserves bracket intent when an index resolves before its target', () => {
		const access = Parser.parse('V[i]');

		if (!Vector.isVector(access)) {
			throw new Error('Expected symbolic Vector access.');
		}

		const partial = access.evaluate({ i: 2 });
		if (!Expression.isExpression(partial)) {
			throw new Error('Expected partially resolved symbolic access to normalize to an Expression.');
		}
		expect(partial.text()).toBe('V[2]');

		const absolute = Parser.parse('abs(V[i])');
		if (!Expression.isExpression(absolute)) {
			throw new Error('Expected scalar function access to be an Expression.');
		}
		expect(absolute.evaluate({ i: 2 }).text()).toBe('abs(V[2])');

		try {
			nerdamer.setVar('V', '[4,1,6,3,1]');
			expect(partial.evaluate().text()).toBe('6');
		} finally {
			nerdamer.setVar('V', 'delete');
		}
	});

	it('resolves computed Vector and mixed Matrix symbolic indices', () => {
		try {
			nerdamer.setVar('V', '[4,1,6,3,1]');
			nerdamer.setVar('M', 'matrix([1,2],[3,4])');

			const computedVector = Parser.parse('V[i+1]');
			if (!Vector.isVector(computedVector)) {
				throw new Error('Expected symbolic Vector access.');
			}
			expect(computedVector.evaluate({ i: 1 }).text()).toBe('6');

			const shifted = Parser.parse('2+V[i]');
			if (!Expression.isExpression(shifted)) {
				throw new Error('Expected composed symbolic access to be an Expression.');
			}
			expect(shifted.evaluate({ i: 2 }).text()).toBe('8');

			const mixedMatrix = Parser.parse('M[i,1]');
			if (!Matrix.isMatrix(mixedMatrix)) {
				throw new Error('Expected symbolic Matrix access.');
			}
			expect(mixedMatrix.evaluate({ i: 1 }).text()).toBe('4');
		} finally {
			nerdamer.setVar('V', 'delete');
			nerdamer.setVar('M', 'delete');
		}
	});

	it('resolves symbolic access from structured call-scoped values', () => {
		const vector = new Vector([4, 1, 6, 3]);
		const matrix = new Matrix([1, 2], [3, 4]);
		const vectorAccess = Parser.parse('V[i+1]');
		const matrixAccess = Parser.parse('M[i,j]');

		if (!Vector.isVector(vectorAccess)) {
			throw new Error('Expected symbolic Vector access.');
		}
		if (!Matrix.isMatrix(matrixAccess)) {
			throw new Error('Expected symbolic Matrix access.');
		}

		expect(vectorAccess.evaluate({ V: vector, i: 1 }).text()).toBe('6');
		expect(matrixAccess.evaluate({ M: matrix, i: 1, j: 0 }).text()).toBe('3');
		expect(vector.text()).toBe('[4, 1, 6, 3]');
		expect(matrix.text()).toBe('matrix([1, 2], [3, 4])');
	});

	it('rejects symbolic accesses whose arity does not match the structured target', () => {
		try {
			nerdamer.setVar('V', '[4,1,6,3,1]');
			nerdamer.setVar('M', 'matrix([1,2],[3,4])');

			expect(() => Parser.parse('V[i,j]')).toThrow();
			expect(() => Parser.parse('M[i]')).toThrow();
			expect(() => Parser.parse('M[i,j,k]')).toThrow();
			expect(() => Parser.parse('A[i,j,k]')).toThrow();
		} finally {
			nerdamer.setVar('V', 'delete');
			nerdamer.setVar('M', 'delete');
		}
	});
});
