import '../helpers/registerNerdamerFunctions';
import { Rational } from '../../src/core/classes/rational/Rational';
import {
	DivisionByZeroError,
	UnexpectedInputError,
	UnsupportedOperationError,
} from '../../src/core/errors';

describe('Rational edge cases', () => {
	it.each([
		['1.5/2'],
		['1/2.5'],
		['1e2/3'],
		['1/2/3'],
		['abc'],
		[''],
		['/2'],
		['1/'],
		['--1'],
		['Infinity'],
		['NaN'],
		['0x10'],
	])('rejects the malformed number %j', value => {
		expect(() => Rational.create(value)).toThrow(UnexpectedInputError);
	});

	it.each([
		[' 1', '1'],
		['+3', '3'],
		['1/-2', '-1/2'],
		['.5', '0.5'],
		['-.5', '-0.5'],
		['1E-3', '0.001'],
		['-1.5e-7', '-1.5e-7'],
	])('accepts %j as %s', (value, expected) => {
		expect(Rational.create(value).text()).toBe(expected);
	});

	it.each([
		['-8', '1/3'],
		['-8', '2/3'],
		['-1', '0.5'],
	])('refuses the complex power (%s)^(%s)', (base, exponent) => {
		expect(() => Rational.create(base).pow(exponent)).toThrow(UnsupportedOperationError);
	});

	it('treats zero to a negative fractional power as division by zero', () => {
		expect(() => Rational.create('0').pow('-1/2')).toThrow(DivisionByZeroError);
	});

	it('keeps real powers', () => {
		expect(Rational.create('8').pow('1/3').text()).toBe('2');
		expect(Rational.create('-8').pow('3').text()).toBe('-512');
		expect(Rational.create('0').pow('1/2').text()).toBe('0');
	});
});
