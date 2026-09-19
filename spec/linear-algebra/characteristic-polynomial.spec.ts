import { Matrix } from '../../src/core/classes/matrix/Matrix';
import { characteristicPolynomial } from '../../src/core/classes/matrix/functions';
import { Polynomial } from '../../src/core/classes/polynomial/Polynomial';
import { UnsupportedOperationError } from '../../src/core/errors';

describe('Characteristic polynomial', () => {
	it('computes a monic exact polynomial for a numeric matrix', () => {
		const M = new Matrix([2, 0], [0, 3]);
		const polynomial = characteristicPolynomial(M, 'x');

		expect(Polynomial.isPolynomial(polynomial)).toBe(true);
		expect(polynomial.variables).toEqual(['x']);
		expect(polynomial.getExpression().eq('x^2-5*x+6')).toBe(true);
		expect(M.text()).toEqual('matrix([2, 0], [0, 3])');
	});

	it('preserves symbolic matrix entries as polynomial coefficients', () => {
		const M = new Matrix(['a', 'b'], ['c', 'd']);
		const polynomial = characteristicPolynomial(M, 't');

		expect(polynomial.getExpression().eq('t^2-(a+d)*t+a*d-b*c')).toBe(true);
		expect(polynomial.variables).toEqual(['t']);
	});

	it('preserves algebraic multiplicity for repeated eigenvalues', () => {
		const M = new Matrix([2, 1], [0, 2]);
		const polynomial = characteristicPolynomial(M, 'z');

		expect(polynomial.getExpression().eq('z^2-4*z+4')).toBe(true);
	});

	it('returns one for the empty matrix', () => {
		const polynomial = characteristicPolynomial(new Matrix([]), 'x');

		expect(polynomial.getExpression().eq('1')).toBe(true);
	});

	it('rejects rectangular matrices', () => {
		const M = new Matrix([1, 2, 3], [4, 5, 6]);

		expect(() => characteristicPolynomial(M, 'x')).toThrow(UnsupportedOperationError);
	});
});
