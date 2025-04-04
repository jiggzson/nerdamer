/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict";

const { Parser: parser } = require('../output/core/classes/parser/Parser');
const { uSub, uUnSub, fnUSub } = require('../output/core/functions/subst');

describe('Subst', () => {
    it('should perform substitutions correctly', () => {
        expect(parser.parse('1').subst('1', 'u').text()).toEqual('1');
        expect(parser.parse('cos(x+1)^x').subst('x', 'u').text()).toEqual('cos(1+u)^u');
        expect(parser.parse('x+1').subst('x+1', 'u').text()).toEqual('u');
        expect(parser.parse('cos(x)+b+a').subst('cos(x)+b', 't').text()).toEqual('a+t');
        expect(parser.parse('2*(x+y+1+t)^6').subst('x+1', 'u').text()).toEqual('2*(y+t+u)^6');
        expect(parser.parse('-x-1').subst('x+1', 't').text()).toEqual('-t');
        expect(parser.parse('2*(a+1)^2*(t+b)^x').subst('a+1', 'u').text()).toEqual('2*u^2*(t+b)^x');
        expect(parser.parse('2*(a+1)^2*(a+1)^x').subst('a+1', 'u').text()).toEqual('2*u^(2+x)');
        expect(parser.parse('2*(a*t+a)^3').subst('a*t', 'u').text()).toEqual('2*(a+u)^3');
        expect(parser.parse('2*((a+t)^2+(x+1))^3').subst('a+t', 'u').text()).toEqual('2*(x+u^2+1)^3');
        expect(parser.parse('8*(a*t)^x').subst('a*t', 'u').text()).toEqual('8*u^x');
        expect(parser.parse('2*((a*t)^x*(x*y)^2)^3').subst('a*t', 'u').text()).toEqual('2*x^6*y^6*u^(3*x)');
        expect(parser.parse('2*cos(x)^2').subst('cos(x)', 'u').text()).toEqual('2*u^2');
        expect(parser.parse('2*cos(cos(x))^2').subst('cos(x)', 'u').text()).toEqual('2*cos(u)^2');
        expect(parser.parse('2*cos(3-cos(x))^2').subst('cos(x)', 'u').text()).toEqual('2*cos(3-u)^2');
    });

    it('should perform u-substitutions correctly', () => {
        // Setup the parameters for the tests
        const value = parser.parse('cos(x)');
        const expr = parser.parse('cos(x)^2+cos(x)+1+x^x');
        const [subbed, map] = uSub(expr, value);
        const [subbed2] = uSub(subbed, parser.parse('x^x'), map);
        const finalExpr = uUnSub(subbed2, map);

        expect(subbed.text()).toEqual('u0+u0^2+x^x+1');
        expect(subbed2.text()).toEqual('u1+u0+u0^2+1');
        expect(finalExpr.eq(expr)).toBe(true);
    });

    it('should perform functions substitutions correctly', () => {
        expect(fnUSub(parser.parse('cos(x)^2+sqrt(x)+cos(x)+sin(x)+x-5*cos(x^2)'))[0].text()).toEqual('u0+u0^2+x+x^(1/2)+u1-5*u2')
    });
});
