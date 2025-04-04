/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict"

const { Rational } = require("../output/core/classes/rational/Rational");

describe('Rational Addition and Subtraction', () => {
    it('should preserve integers when adding', () => {
        expect(new Rational('5').plus(new Rational('2')).text()).toEqual('7');
    });
    it('should preserve decimals when adding', () => {
        expect(new Rational('0.5').plus(new Rational('2')).text()).toEqual('2.5');
    });
    it('should preserve fractions when adding', () => {
        expect(new Rational('1').div(new Rational('2')).plus(new Rational('2')).text()).toEqual('5/2');
    });
    it('should add scientific notation correctly', () => {
        expect(new Rational('1e-3').plus(new Rational('0.001')).text()).toEqual('0.002');
    });

    // Boolean test
    it('should preserve integers when adding', () => {
        expect(new Rational('1').plus(new Rational('2')).isInteger()).toBe(true);
    });
    it('should preserve decimals when adding', () => {
        let result = new Rational('5.2').minus(new Rational('.2'));
        expect(result.isInteger()).toBe(true);
        expect(result.asDecimal).toBe(true);
    });
});

describe('Rational Division and Multiplication', () => {
    it('should preserve fractions when dividing', () => {
        expect(new Rational('1').div(new Rational('2')).text()).toEqual('1/2');
        expect(new Rational('3').div(new Rational('2')).div(new Rational('4')).text()).toEqual('3/8');
    });
    it('should preserve fractions when dividing', () => {
        expect(new Rational('3').div(new Rational('2')).times(new Rational('4').div(new Rational('7'))).text()).toEqual('6/7');
        expect(new Rational('3').div(new Rational('2')).times(new Rational('7')).text()).toEqual('21/2');
    });
    it('should divide scientific notation correctly', () => {
        expect(new Rational('2e-3').div(new Rational('0.001')).text()).toEqual('2.0');
    });

    it('should correctly convert back to integers', () => {
        expect(new Rational('3').div(new Rational('2')).times(new Rational('4').div(new Rational('3'))).isInteger()).toBe(true);
    });
    it('should preserve decimals when dividing', () => {
        expect(new Rational('3.0').div(new Rational('5')).asDecimal).toBe(true);
    });
    it('should convert scientific numbers to decimals after dividing', () => {
        expect(new Rational('3.0').div(new Rational('5')).asDecimal).toBe(true);
    });
});
describe('Rational mod', () => {
    it('should calculate correctly', () => {
        expect(new Rational('3/2').mod('5/6').text()).toEqual('2/3');
        expect(new Rational('3/2').mod('3/64').text()).toEqual('0');
    });
});

describe('Rational Scientific Notation', () => {
    it('should recognize scientific notation', () => {
        expect(new Rational('4.22e+1').text()).toEqual('42.2');
        expect(new Rational('4e1').text()).toEqual('40.0');
        expect(new Rational('4.22e-1').text()).toEqual('0.422');
        expect(new Rational('-4.22e+1').text()).toEqual('-42.2');
    });
});

describe('Rational Output', () => {
    it('should print decimals correctly', () => {
        expect(new Rational('3.0').times(new Rational('5')).text()).toEqual('15.0');
    });
});

describe('Type Conversions', () => {
    it('should convert types correctly', () => {
        expect(new Rational('1.0').asDecimal).toBe(true);
        expect(new Rational('1').isInteger()).toBe(true);
        expect(new Rational('0.5').asDecimal).toBe(true);
        expect(new Rational('1').div('2').isInteger()).toBe(false);
        expect(new Rational('1.0').div('2').isInteger()).toBe(false);
        expect(new Rational('1.0').div('2').div('0.5').asDecimal).toBe(true);
        expect(new Rational('1').div('2').times('2').isInteger()).toBe(true);
        // expect(new Rational('2e-3').div(new Rational('0.001')).asDecimal).toBe(true);
    });
});

describe('Rational equality', () => {
    it('should be correct for less than', ()=>{
        expect(new Rational('4').div('5').lt(new Rational('7').div('8'))).toBe(true);
        expect(new Rational('4').lt(new Rational('7'))).toBe(true);
        expect(new Rational('4').div('0.1').lt(new Rational('7'))).toBe(false);
        expect(new Rational('3.3').lt(new Rational('3.2'))).toBe(false);
        expect(new Rational('3.3').lt(new Rational('3.1'))).toBe(false);
        expect(new Rational('-3.3').lt(new Rational('3.1'))).toBe(true);
        expect(new Rational('0').lt(new Rational('3.1'))).toBe(true);
        expect(new Rational('-0.2').lt(new Rational('-0.3'))).toBe(false);
        expect(new Rational('-0.9').lt(new Rational('-0.3'))).toBe(true);
    });
    it('should be correct for less than or equal', ()=>{
        expect(new Rational('4').div('5').lte(new Rational('7').div('8'))).toBe(true);
        expect(new Rational('14').div('16').lte(new Rational('7').div('8'))).toBe(true);
        expect(new Rational('14').lte(new Rational('28'))).toBe(true);
        expect(new Rational('7.0').lte(new Rational('7'))).toBe(true);
        expect(new Rational('7.00000000000000001').lte(new Rational('7'))).toBe(false);
        expect(new Rational('-0.1').lte(new Rational('-0.1'))).toBe(true);
        expect(new Rational('0.1').lte(new Rational('-0.1'))).toBe(false);
        expect(new Rational('-0.2').lte(new Rational('-0.1'))).toBe(true);
    });
    it('should be correct for equal', ()=>{
        expect(new Rational('4').div('5').eq(new Rational('7').div('8'))).toBe(false);
        expect(new Rational('14').div('16').eq(new Rational('7').div('8'))).toBe(true);
        expect(new Rational('14').eq(new Rational('28'))).toBe(false);
        expect(new Rational('7.0').eq(new Rational('7'))).toBe(true);
        expect(new Rational('7.00000000000000001').eq(new Rational('7'))).toBe(false);
        expect(new Rational('-0.1').eq(new Rational('-0.1'))).toBe(true);
        expect(new Rational('0.1').eq(new Rational('-0.1'))).toBe(false);
        expect(new Rational('-0.2').eq(new Rational('-0.1'))).toBe(false);
        expect(new Rational('0.0').eq(new Rational('0'))).toBe(true);
        expect(new Rational('0.0').eq(new Rational('-0'))).toBe(true);
    });
    it('should be correct for greater than', ()=>{
        expect(new Rational('4').div('5').gt(new Rational('7').div('8'))).toBe(false);
        expect(new Rational('14').div('16').gt(new Rational('7').div('8'))).toBe(false);
        expect(new Rational('14').gt(new Rational('28'))).toBe(false);
        expect(new Rational('7.0').gt(new Rational('7'))).toBe(false);
        expect(new Rational('7.00000000000000001').gt(new Rational('7'))).toBe(true);
        expect(new Rational('-0.1').gt(new Rational('-0.1'))).toBe(false);
        expect(new Rational('0.1').gt(new Rational('-0.1'))).toBe(true);
        expect(new Rational('-0.2').gt(new Rational('-0.1'))).toBe(false);
    });
    it('should be correct for greater than or equal', ()=>{
        expect(new Rational('4').div('5').gte(new Rational('7').div('8'))).toBe(false);
        expect(new Rational('14').div('16').gte(new Rational('7').div('8'))).toBe(true);
        expect(new Rational('14').gte(new Rational('28'))).toBe(false);
        expect(new Rational('7.0').gte(new Rational('7'))).toBe(true);
        expect(new Rational('7.00000000000000001').gte(new Rational('7'))).toBe(true);
        expect(new Rational('-0.1').gte(new Rational('-0.1'))).toBe(true);
        expect(new Rational('0.1').gte(new Rational('-0.1'))).toBe(true);
        expect(new Rational('0.1').gte(new Rational('0'))).toBe(true);
        expect(new Rational('-0.2').gte(new Rational('-0.1'))).toBe(false);
    });
});