/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */

const { scientificToDecimal } = require('../output/core/functions/string');

describe('Scientific number strings', () => {
    it('should convert correctly', ()=> {
        expect(scientificToDecimal('45998787.78e3')).toBe('45998787780');
        expect(scientificToDecimal('45998787.78e2')).toBe('4599878778');
        expect(scientificToDecimal('45998787.78e1')).toBe('459987877.8');
        expect(scientificToDecimal('45998787.78e0')).toBe('45998787.78');
        expect(scientificToDecimal('45998787.78e-3')).toBe('45998.78778');
        expect(scientificToDecimal('45998787.78e-5')).toBe('459.9878778');
        expect(scientificToDecimal('45998787.78e-10')).toBe('0.004599878778');
        expect(scientificToDecimal('3.4028236692093846346e+38')).toBe('340282366920938463460000000000000000000');
        expect(scientificToDecimal('5e-3')).toBe('0.005');
        expect(scientificToDecimal('.5e-3')).toBe('0.0005');
        expect(scientificToDecimal('-.5e-3')).toBe('-0.0005');
        expect(scientificToDecimal('-45998787.78e3')).toBe('-45998787780');
        expect(scientificToDecimal('-45998787.78e2')).toBe('-4599878778');
        expect(scientificToDecimal('-45998787.78e1')).toBe('-459987877.8');
        expect(scientificToDecimal('-45998787.78e0')).toBe('-45998787.78');
        expect(scientificToDecimal('-45998787.78e-3')).toBe('-45998.78778');
        expect(scientificToDecimal('-45998787.78e-5')).toBe('-459.9878778');
        expect(scientificToDecimal('-45998787.78e-10')).toBe('-0.004599878778');
    });
});
