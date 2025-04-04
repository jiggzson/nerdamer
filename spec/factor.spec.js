/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict";

const { Parser: parser } = require('../output/core/classes/parser/Parser');
const { sumFactor } = require('../output/core/functions/factor/factor');

describe('Factor', () => {
    it('should sumFactor correctly', () => {
        expect(sumFactor(parser.parse('x')).text()).toEqual('x');
        expect(sumFactor(parser.parse('x+x^2')).text()).toEqual('x*(1+x)');
        expect(sumFactor(parser.parse('x+x^2+1')).text()).toEqual('1+x+x^2');
        expect(sumFactor(parser.parse('3*(a+a^6)')).text()).toEqual('3*a*(1+a^5)');
        expect(sumFactor(parser.parse('a*x^6')).text()).toEqual('a*x^6');
        expect(sumFactor(parser.parse('2')).text()).toEqual('2');
    });
});
