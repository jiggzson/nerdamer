'use strict';

import { Rational } from '../../src/core/classes/rational/Rational';

describe('Rational Addition and Subtraction', () => {
	it('should preserve integers when adding', () => {
		expect(Rational.create('5').plus(Rational.create('2')).text()).toEqual('7');
	});
	it('should preserve decimals when adding', () => {
		expect(Rational.create('0.5').plus(Rational.create('2')).text()).toEqual('2.5');
	});
	it('should preserve fractions when adding', () => {
		expect(
			Rational.create('1').div(Rational.create('2')).plus(Rational.create('2')).text()
		).toEqual('5/2');
	});
	it('should add scientific notation correctly', () => {
		expect(Rational.create('1e-3').plus(Rational.create('0.001')).text()).toEqual('0.002');
	});

	// Boolean test
	it('should preserve integers when adding', () => {
		expect(Rational.create('1').plus(Rational.create('2')).isInteger()).toBe(true);
	});
	it('should preserve decimals when adding', () => {
		const result = Rational.create('5.2').minus(Rational.create('.2'));
		expect(result.isInteger()).toBe(true);
		expect(result.asDecimal).toBe(true);
	});
});

describe('Rational Division and Multiplication', () => {
	it('should preserve fractions when dividing', () => {
		expect(Rational.create('1').div(Rational.create('2')).text()).toEqual('1/2');
		expect(
			Rational.create('3').div(Rational.create('2')).div(Rational.create('4')).text()
		).toEqual('3/8');
	});
	it('should preserve fractions when dividing', () => {
		expect(
			Rational.create('3')
				.div(Rational.create('2'))
				.times(Rational.create('4').div(Rational.create('7')))
				.text()
		).toEqual('6/7');
		expect(
			Rational.create('3').div(Rational.create('2')).times(Rational.create('7')).text()
		).toEqual('21/2');
	});
	it('should divide scientific notation correctly', () => {
		expect(Rational.create('2e-3').div(Rational.create('0.001')).text()).toEqual('2.0');
	});

	it('should correctly convert back to integers', () => {
		expect(
			Rational.create('3')
				.div(Rational.create('2'))
				.times(Rational.create('4').div(Rational.create('3')))
				.isInteger()
		).toBe(true);
	});
	it('should preserve decimals when dividing', () => {
		expect(Rational.create('3.0').div(Rational.create('5')).asDecimal).toBe(true);
	});
	it('should convert scientific numbers to decimals after dividing', () => {
		expect(Rational.create('3.0').div(Rational.create('5')).asDecimal).toBe(true);
	});
});
describe('Rational mod', () => {
	it('should calculate correctly', () => {
		expect(Rational.create('3/2').mod('5/6').text()).toEqual('2/3');
		expect(Rational.create('3/2').mod('3/64').text()).toEqual('0');
	});
});

describe('Rational Scientific Notation', () => {
	it('should recognize scientific notation', () => {
		expect(Rational.create('4.22e+1').text()).toEqual('42.2');
		expect(Rational.create('4e1').text()).toEqual('40.0');
		expect(Rational.create('4.22e-1').text()).toEqual('0.422');
		expect(Rational.create('-4.22e+1').text()).toEqual('-42.2');
	});
});

describe('Rational Output', () => {
	it('should print decimals correctly', () => {
		expect(Rational.create('3.0').times(Rational.create('5')).text()).toEqual('15.0');
	});
});

describe('Type Conversions', () => {
	it('should convert types correctly', () => {
		expect(Rational.create('1.0').asDecimal).toBe(true);
		expect(Rational.create('1').isInteger()).toBe(true);
		expect(Rational.create('0.5').asDecimal).toBe(true);
		expect(Rational.create('1').div('2').isInteger()).toBe(false);
		expect(Rational.create('1.0').div('2').isInteger()).toBe(false);
		expect(Rational.create('1.0').div('2').div('0.5').asDecimal).toBe(true);
		expect(Rational.create('1').div('2').times('2').isInteger()).toBe(true);
		// expect(Rational.create('2e-3').div(Rational.create('0.001')).asDecimal).toBe(true);
	});
});

describe('Rational equality', () => {
	it('should be correct for less than', () => {
		expect(Rational.create('4').div('5').lt(Rational.create('7').div('8'))).toBe(true);
		expect(Rational.create('4').lt(Rational.create('7'))).toBe(true);
		expect(Rational.create('4').div('0.1').lt(Rational.create('7'))).toBe(false);
		expect(Rational.create('3.3').lt(Rational.create('3.2'))).toBe(false);
		expect(Rational.create('3.3').lt(Rational.create('3.1'))).toBe(false);
		expect(Rational.create('-3.3').lt(Rational.create('3.1'))).toBe(true);
		expect(Rational.create('0').lt(Rational.create('3.1'))).toBe(true);
		expect(Rational.create('-0.2').lt(Rational.create('-0.3'))).toBe(false);
		expect(Rational.create('-0.9').lt(Rational.create('-0.3'))).toBe(true);
	});
	it('should be correct for less than or equal', () => {
		expect(Rational.create('4').div('5').lte(Rational.create('7').div('8'))).toBe(true);
		expect(Rational.create('14').div('16').lte(Rational.create('7').div('8'))).toBe(true);
		expect(Rational.create('14').lte(Rational.create('28'))).toBe(true);
		expect(Rational.create('7.0').lte(Rational.create('7'))).toBe(true);
		expect(Rational.create('7.00000000000000001').lte(Rational.create('7'))).toBe(false);
		expect(Rational.create('-0.1').lte(Rational.create('-0.1'))).toBe(true);
		expect(Rational.create('0.1').lte(Rational.create('-0.1'))).toBe(false);
		expect(Rational.create('-0.2').lte(Rational.create('-0.1'))).toBe(true);
	});
	it('should be correct for equal', () => {
		expect(Rational.create('4').div('5').eq(Rational.create('7').div('8'))).toBe(false);
		expect(Rational.create('14').div('16').eq(Rational.create('7').div('8'))).toBe(true);
		expect(Rational.create('14').eq(Rational.create('28'))).toBe(false);
		expect(Rational.create('7.0').eq(Rational.create('7'))).toBe(true);
		expect(Rational.create('7.00000000000000001').eq(Rational.create('7'))).toBe(false);
		expect(Rational.create('-0.1').eq(Rational.create('-0.1'))).toBe(true);
		expect(Rational.create('0.1').eq(Rational.create('-0.1'))).toBe(false);
		expect(Rational.create('-0.2').eq(Rational.create('-0.1'))).toBe(false);
		expect(Rational.create('0.0').eq(Rational.create('0'))).toBe(true);
		expect(Rational.create('0.0').eq(Rational.create('-0'))).toBe(true);
	});
	it('should be correct for greater than', () => {
		expect(Rational.create('4').div('5').gt(Rational.create('7').div('8'))).toBe(false);
		expect(Rational.create('14').div('16').gt(Rational.create('7').div('8'))).toBe(false);
		expect(Rational.create('14').gt(Rational.create('28'))).toBe(false);
		expect(Rational.create('7.0').gt(Rational.create('7'))).toBe(false);
		expect(Rational.create('7.00000000000000001').gt(Rational.create('7'))).toBe(true);
		expect(Rational.create('-0.1').gt(Rational.create('-0.1'))).toBe(false);
		expect(Rational.create('0.1').gt(Rational.create('-0.1'))).toBe(true);
		expect(Rational.create('-0.2').gt(Rational.create('-0.1'))).toBe(false);
	});
	it('should be correct for greater than or equal', () => {
		expect(Rational.create('4').div('5').gte(Rational.create('7').div('8'))).toBe(false);
		expect(Rational.create('14').div('16').gte(Rational.create('7').div('8'))).toBe(true);
		expect(Rational.create('14').gte(Rational.create('28'))).toBe(false);
		expect(Rational.create('7.0').gte(Rational.create('7'))).toBe(true);
		expect(Rational.create('7.00000000000000001').gte(Rational.create('7'))).toBe(true);
		expect(Rational.create('-0.1').gte(Rational.create('-0.1'))).toBe(true);
		expect(Rational.create('0.1').gte(Rational.create('-0.1'))).toBe(true);
		expect(Rational.create('0.1').gte(Rational.create('0'))).toBe(true);
		expect(Rational.create('-0.2').gte(Rational.create('-0.1'))).toBe(false);
	});
});
