/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
const { GCD, sign, simplifyRatio, factorial } = require("../output/core/functions/bigint");

describe('BigInt GCD', () => {
    it('should calculate the gcd correctly', () => {
        expect(GCD(15n, 21n, 45n)).toBe(3n);
        expect(GCD(7n, 21n, 45n)).toBe(1n);
    });
});

describe('BigInt sign', () => {
    it('should calculate the sign correctly', () => {
        expect(sign(-3445n)).toBe(-1);
        expect(sign(11n)).toBe(1);
        expect(sign(0n)).toBe(0);
    });
});
describe('BigInt simplifyRatio', () => {
    it('should simplify correctly', () => {
        expect(simplifyRatio(45n, 15n)).toEqual([3n, 1n]);
        expect(simplifyRatio(7n, 3n)).toEqual([7n, 3n]);
        expect(simplifyRatio(111n, 296n)).toEqual([3n, 8n]);
    });
});
describe('BigInt factorial', ()=>{
    it('should calculate correctly', ()=>{
        expect(factorial(40)).toEqual('815915283247897734345611269596115894272000000000');
        expect(factorial(1)).toEqual('1');
        expect(factorial(2)).toEqual('2');
        expect(factorial(5)).toEqual('120');
    });
});