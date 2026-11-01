import * as factorModule from '../../../src/algebra/factor/factor';
import { squareFreeLogarithmicData, algebraicLogarithmicArgument } from '../../../src/calculus/integrate/algorithms/algebraicResidues';
import { hermiteReduce } from '../../../src/calculus/integrate/algorithms/hermiteReduction';
import { isExpectedError, rethrowUnexpected } from '../../../src/calculus/integrate/algorithms/rationalErrors';
import {
	rationalIntegralData, tryIntegrateRational, verifyLogarithmicDerivative,
} from '../../../src/calculus/integrate/algorithms/rationalIntegration';
import { ResiduePolynomialRing } from '../../../src/calculus/integrate/algorithms/residueArithmetic';
import { Expression } from '../../../src/core/classes/expression/Expression';
import { Polynomial } from '../../../src/core/classes/polynomial/Polynomial';
import { PolynomialError, UnsupportedOperationError } from '../../../src/core/errors';
import '../../../src/index';

describe('Rational integration exception boundaries', () => {
	afterEach(() => jest.restoreAllMocks());

	it('classifies only declared unsupported polynomial/domain exceptions', () => {
		expect(isExpectedError(new PolynomialError('non-polynomial'))).toBe(true);
		expect(isExpectedError(new UnsupportedOperationError('unsupported domain'))).toBe(true);
		expect(isExpectedError(new TypeError('programming error'))).toBe(false);
		expect(isExpectedError(new RangeError('resource limit'))).toBe(false);
		expect(isExpectedError(new Error('polynomial iteration limit'))).toBe(false);
	});

	it('allows expected errors to retain the caller-owned fallback', () => {
		expect(rethrowUnexpected(new PolynomialError('non-polynomial'))).toBeUndefined();
		expect(rethrowUnexpected(new UnsupportedOperationError('unsupported domain'))).toBeUndefined();
	});

	it('rethrows an unexpected error without converting its type or message', () => {
		const unexpected = new TypeError('unexpected rational failure');
		expect(() => rethrowUnexpected(unexpected)).toThrow(unexpected);
	});

	it('propagates unexpected errors from Hermite polynomial construction', () => {
		const unexpected = new TypeError('Hermite constructor failure');
		jest.spyOn(Polynomial.prototype, 'toArray').mockImplementation(() => {
			throw unexpected;
		});
		expect(() => hermiteReduce(Expression.create('1'), Expression.create('x^2+1'), 'x'))
			.toThrow(unexpected);
	});

	it('preserves supported declines for expected Hermite polynomial errors', () => {
		jest.spyOn(Polynomial.prototype, 'toArray').mockImplementation(() => {
			throw new PolynomialError('not an exact polynomial');
		});
		expect(hermiteReduce(Expression.create('1'), Expression.create('x^2+1'), 'x').type)
			.toBe('unsupported');
	});

	it('propagates unexpected errors from residue factor assembly', () => {
		const unexpected = new Error('unexpected residue factor failure');
		const factor = jest.spyOn(factorModule, 'polyFactorExpressions').mockImplementation(() => {
			throw unexpected;
		});
		expect(() => rationalIntegralData(Expression.create('1'), Expression.create('x^2+1'), 'x'))
			.toThrow(unexpected);
		expect(factor).toHaveBeenCalled();
	});

	it('propagates unexpected quotient-ring errors rather than declining a valid argument', () => {
		const residues = squareFreeLogarithmicData(
			Expression.create('1'), Expression.create('x^2+1'), 'x'
		);
		expect(residues.type).toBe('residues');
		const unexpected = new RangeError('unexpected quotient-ring failure');
		const inverse = jest.spyOn(ResiduePolynomialRing.prototype, 'invert')
			.mockImplementation(() => {
				throw unexpected;
			});
		expect(() => algebraicLogarithmicArgument(residues, Expression.create('1+4*z^2'), 'x'))
			.toThrow(unexpected);
		expect(inverse).toHaveBeenCalled();
	});

	it('propagates unexpected quotient-ring errors during formal verification', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^2+1');
		const data = rationalIntegralData(numerator, denominator, 'x', [Expression.create('1+4*z^2')]);
		expect(data.type).toBe('assembled');
		const unexpected = new TypeError('unexpected trace reduction failure');
		const reduce = jest.spyOn(ResiduePolynomialRing.prototype, 'reduce')
			.mockImplementation(() => {
				throw unexpected;
			});
		expect(() => verifyLogarithmicDerivative(data, numerator, denominator, 'x'))
			.toThrow(unexpected);
		expect(reduce).toHaveBeenCalled();
	});

	it('declines assembly when factoring reports an unsupported polynomial', () => {
		jest.spyOn(factorModule, 'polyFactorExpressions').mockImplementation(() => {
			throw new PolynomialError('unsupported residue factor');
		});
		const data = rationalIntegralData(Expression.create('1'), Expression.create('x^2+1'), 'x');
		expect(data.type).toBe('unsupported');
	});

	it('declines a quotient-ring argument with unsupported coefficients', () => {
		const residues = squareFreeLogarithmicData(
			Expression.create('1'), Expression.create('x^2+1'), 'x'
		);
		jest.spyOn(ResiduePolynomialRing.prototype, 'invert').mockImplementation(() => {
			throw new PolynomialError('non-exact coefficient');
		});
		expect(algebraicLogarithmicArgument(residues, Expression.create('1+4*z^2'), 'x').type)
			.toBe('unsupported');
	});

	it('does not verify logarithmic data when quotient-ring arithmetic is unsupported', () => {
		const numerator = Expression.create('1');
		const denominator = Expression.create('x^2+1');
		const data = rationalIntegralData(numerator, denominator, 'x', [Expression.create('1+4*z^2')]);
		expect(data.type).toBe('assembled');
		jest.spyOn(ResiduePolynomialRing.prototype, 'reduce').mockImplementation(() => {
			throw new PolynomialError('non-exact trace coefficient');
		});
		expect(verifyLogarithmicDerivative(data, numerator, denominator, 'x')).toBe(false);
	});

	it('does not hide unexpected errors from recursive polynomial integration', () => {
		const unexpected = new RangeError('recursive integrator failed');
		const integrate = jest.fn((): Expression => {
			throw unexpected;
		});
		expect(() => tryIntegrateRational(Expression.create('(x^3+1)/(x^2+1)'),
			'x', 0, integrate)).toThrow(unexpected);
		expect(integrate).toHaveBeenCalled();
	});
});
