/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict"

const { equal, gt, gte, lt, lte } = require('../output/core/classes/parser/operations/compare');

describe('The equal function', () => {
    it('should test for equality of expressions', () => {
        expect(equal('x', 'x')).toBe(true);
        expect(equal('x+1', '1+x')).toBe(true);
        expect(equal('x+5', 'x-5')).toBe(false);
        expect(equal('x^x', 'x^x')).toBe(true);
        expect(equal('x*y', 'x*y')).toBe(true);
        expect(equal('x*y^2', 'x*y')).toBe(false);
        expect(equal('2*(x+1)', '(x+1)')).toBe(false);
        expect(equal('(a+x*y)^2', '(a+x*y)^2')).toBe(true);
        expect(equal('cos(pi)+1', '0')).toBe(true);
        expect(equal('x*x*x*x', 'x^4')).toBe(true);
        expect(equal('sqrt(3)/3', 'sqrt(3)*3^-1')).toBe(true);
    });

    it('should accurately test if an expression is greater than', () => {
        expect(gt('5', '4')).toBe(true);
        expect(gt('5', '-4')).toBe(true);
        expect(gt('-5', '-4')).toBe(false);
        expect(gt('-5', '-5')).toBe(false);
        expect(gt('x', '-4')).toBe(false);
        expect(gt('x+1', 'x')).toBe(true);
        expect(gt('sqrt(3)', 'sqrt(2)')).toBe(true);
    });

    it('should accurately test if an expression is greater than', () => {
        expect(gte('5', '4')).toBe(true);
        expect(gte('5', '-4')).toBe(true);
        expect(gte('-5', '-4')).toBe(false);
        expect(gte('-5', '-5')).toBe(true);
        expect(gte('x', '-4')).toBe(false);
        expect(gte('x+1', 'x')).toBe(true);
        expect(gte('x+1', 'x+1')).toBe(true);
        expect(gte('sqrt(3)', 'sqrt(2)')).toBe(true);
    });

    it('should accurately test if an expression is greater than', () => {
        expect(lt('5', '4')).toBe(false);
        expect(lt('5', '-4')).toBe(false);
        expect(lt('-5', '-4')).toBe(true);
        expect(lt('-5', '-5')).toBe(false);
        expect(lt('x', '-4')).toBe(false);
        expect(lt('x+1', 'x')).toBe(false);
        expect(lt('x-1', 'x')).toBe(true);
        expect(lt('sqrt(3)', 'sqrt(2)')).toBe(false);
    });

    it('should accurately test if an expression is greater than', () => {
        expect(lte('5', '4')).toBe(false);
        expect(lte('5', '-4')).toBe(false);
        expect(lte('-5', '-4')).toBe(true);
        expect(lte('-5', '-5')).toBe(true);
        expect(lte('x', '-4')).toBe(false);
        expect(lte('x+1', 'x')).toBe(false);
        expect(lte('x+1', 'x+1')).toBe(true);
        expect(lte('x-1', 'x')).toBe(true);
        expect(lte('sqrt(3)', 'sqrt(2)')).toBe(false);
    });
});