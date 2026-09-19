'use strict';

import { Rational } from '../../src/core/classes/rational/Rational';
import { DivisionByZeroError, ZeroToZeroPowerError } from '../../src/core/errors';

describe('Rational powers', () => {
	it('raises negative integer powers exactly without mutating the operands', () => {
		const base = Rational.create('-2/3');
		const exponent = Rational.create('-3');
		const result = base.pow(exponent);

		expect(result.text()).toEqual('-27/8');
		expect(base.text()).toEqual('-2/3');
		expect(exponent.text()).toEqual('-3');
	});

	it('preserves decimal provenance according to the power path', () => {
		const approximateIrrational = Rational.create('2').pow('1/2');
		const exactNumericalRoot = Rational.create('4').pow('1/2');
		const decimalNumericalRoot = Rational.create('4.0').pow('1/2');
		const decimalBase = Rational.create('2.0').pow('2');
		const decimalIntegerExponent = Rational.create('2').pow(Rational.create('2.0'));

		expect(approximateIrrational.asDecimal).toBe(true);
		expect(approximateIrrational.text()).not.toContain('/');
		expect(exactNumericalRoot.asDecimal).toBe(false);
		expect(exactNumericalRoot.text()).toEqual('2');
		expect(decimalNumericalRoot.asDecimal).toBe(true);
		expect(decimalNumericalRoot.text()).toEqual('2.0');
		expect(decimalBase.text()).toEqual('4.0');
		expect(decimalIntegerExponent.text()).toEqual('4');
	});

	it('rejects zero to the zero power', () => {
		expect(() => Rational.create('0').pow('0')).toThrow(ZeroToZeroPowerError);
	});

	it('rejects zero to a negative integer power as division by zero', () => {
		expect(() => Rational.create('0').pow('-2')).toThrow(DivisionByZeroError);
	});
});
