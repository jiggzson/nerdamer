/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict";

const { Parser: parser } = require('../output/core/classes/parser/Parser');

describe('Expand', () => {
    it('should expand correctly', () => {
        expect(parser.parse('expand(2*x*(a+b)*(c+d))').text()).toEqual('2*x*a*c+2*x*a*d+2*x*b*c+2*x*b*d');
        expect(parser.parse('expand(2*x*(a+b)^3)').text()).toEqual('2*x*a^3+6*a^2*b*x+2*x*b^3+6*a*b^2*x');
        expect(parser.parse('expand(2*x*(a+b)^3)-(2*a^3*x+6*a^2*b*x+2*b^3*x+6*a*b^2*x)').text()).toEqual('0');
        expect(parser.parse('expand((x+1)^x+1)').text()).toEqual('1+(1+x)^x');
        expect(parser.parse('expand(x*((x+1)*(a+b)^3)^2)').text()).toEqual('x*b^6+6*a*b^5*x+15*a^2*b^4*x+20*a^3*b^3*x+15*a^4*b^2*x+6*a^5*b*x+x*a^6+2*b^6*x^2+b^6*x^3+12*a*b^5*x^2+6*a*b^5*x^3+30*a^2*b^4*x^2+15*a^2*b^4*x^3+40*a^3*b^3*x^2+20*a^3*b^3*x^3+30*a^4*b^2*x^2+15*a^4*b^2*x^3+12*a^5*b*x^2+6*a^5*b*x^3+2*a^6*x^2+a^6*x^3');
        expect(parser.parse('expand(3*cos((x+1)^2)^2)').text()).toEqual('3*cos(1+2*x+x^2)^2');
        expect(parser.parse('expand(((x+1)^2*x)^((x+1)^2))').text()).toEqual('x^(1+2*x+x^2)*(1+x)^(2+4*x+2*x^2)');
        expect(parser.parse('expand((a+b)*((c+d)^-1))').text()).toEqual('a*((c+d)^-1)+b*((c+d)^-1)');
        expect(parser.parse('expand((a+b)*((c+d)^-2))').text()).toEqual('a*((d^2+2*c*d+c^2)^-1)+b*((d^2+2*c*d+c^2)^-1)');
        expect(parser.parse('expand((x+1)^2*(x+2)*(a*b)^3*(2*c+5*e+3*x^y))').text()).toEqual('10*a^3*x*b^3*c+25*a^3*x*b^3*e+15*a^3*x^(1+y)*b^3+8*a^3*x^2*b^3*c+20*a^3*x^2*b^3*e+12*a^3*x^(2+y)*b^3+2*a^3*x^3*b^3*c+5*a^3*x^3*b^3*e+3*a^3*x^(3+y)*b^3+4*b^3*a^3*c+10*b^3*a^3*e+6*b^3*a^3*x^y');
        expect(parser.parse('expand(x+y*(x-a)^2)').text()).toEqual('y*a^2-2*x*a*y+y*x^2+x');
    });

    it('should expand square roots', () => {
        expect(parser.parse('expand((sqrt(7)+3*sqrt(2))*(sqrt(7)-3*sqrt(2)))').text()).toEqual('-11');
    });
});
