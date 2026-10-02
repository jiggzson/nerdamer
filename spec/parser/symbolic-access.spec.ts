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

	it('defers scalar functions until symbolic Vector access resolves', () => {
		const vectorName = 'issue255v';

		try {
			nerdamer.setVar(vectorName, '[x^2,x-y]');
			const derivative = nerdamer(`diff(${vectorName}[k],x)`);

			expect(derivative.text()).toBe(`diff(${vectorName}[k], x)`);
			expect(derivative.evaluate({ k: 0 }).eq(Expression.create('2*x'))).toBe(true);
		} finally {
			nerdamer.setVar(vectorName, 'delete');
		}
	});

	// Regression: Nerdamer 2.0 issue #255
	it('evaluates differentiation inside a sum after indexed access resolves', () => {
		const vectorName = 'issue255sumv';

		try {
			const result = nerdamer(
				`${vectorName}:[x^2,x-y];sum(diff(${vectorName}[k],x),k,0,1)`
			);

			expect(result.text()).toBe('1+2*x');
		} finally {
			nerdamer.setVar(vectorName, 'delete');
		}
	});

	it('preserves an unresolved single-index access as an Expression', () => {
		const access = Parser.parse('V[i]');

		expect(Expression.isExpression(access)).toBe(true);
		expect(access.text()).toBe('V[i]');
	});

	it('keeps symbolic Vector access usable by scalar functions and operators', () => {
		const absolute = Parser.parse('abs(V[i])');
		const shifted = Parser.parse('V[i]+2');

		expect(Expression.isExpression(absolute)).toBe(true);
		expect(absolute.text()).toBe('abs(V[i])');
		expect(Expression.isExpression(shifted)).toBe(true);
		expect(shifted.text()).toContain('V[i]');
	});

	it('resolves a previously parsed symbolic Vector access after the target is defined', () => {
		const access = Parser.parse('V[i]');
		expect(Expression.isExpression(access)).toBe(true);

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

		expect(Expression.isExpression(access)).toBe(true);
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
		expect(Expression.isExpression(access)).toBe(true);

		const partial = access.evaluate({ i: 2 });
		expect(Expression.isExpression(partial)).toBe(true);
		expect(partial.text()).toBe('V[2]');

		const absolute = Parser.parse('abs(V[i])');
		expect(Expression.isExpression(absolute)).toBe(true);
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
			expect(Expression.isExpression(computedVector)).toBe(true);
			expect(computedVector.evaluate({ i: 1 }).text()).toBe('6');

			const shifted = Parser.parse('2+V[i]');
			expect(Expression.isExpression(shifted)).toBe(true);
			expect(shifted.evaluate({ i: 2 }).text()).toBe('8');

			const mixedMatrix = Parser.parse('M[i,1]');
			expect(Expression.isExpression(mixedMatrix)).toBe(true);
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

		expect(Expression.isExpression(vectorAccess)).toBe(true);
		expect(Expression.isExpression(matrixAccess)).toBe(true);

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
