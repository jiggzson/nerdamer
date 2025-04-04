/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict";

const { Parser: parser } = require('../output/core/classes/parser/Parser');
const { Converter } = require('../output/core/output/Converter');

const TeXConverter = new Converter('TeX');
const textConverter = new Converter('text');

function _(e, options) {
    return TeXConverter.convert(parser.parse(e), options);
}

function __(e, options) {
    return textConverter.convert(parser.parse(e), options);
}

describe('Expand', () => {
    const options = { convertRoots: false };

    it('should generate TeX correctly', () => {
        expect(_('1/2')).toEqual('\\frac{1}{2}');
        expect(_('x^-2')).toEqual('\\frac{1}{x^{2}}');
        expect(_('2*a/b')).toEqual('\\frac{2 \\cdot a}{b}');
        expect(_('(x+1)/(x+2)')).toEqual('\\frac{x+1}{x+2}');
        expect(_('(x+1)^(1/4)/(x+2)', options)).toEqual('\\frac{\\left(x+1\\right)^{\\frac{1}{4}}}{x+2}');
        expect(_('(3/5)(x+1)^(1/4)/(x+2)', options)).toEqual('\\frac{3 \\cdot \\left(x+1\\right)^{\\frac{1}{4}}}{5 \\cdot x+2}');
        expect(_('(4/5)^(x+1)^x')).toEqual('\\left(\\frac{4}{5}\\right)^{\\left(x+1\\right)^{x}}');
        expect(_('(((4+a)^(x+1)^x)/(x+1))^a/(x-1)')).toEqual('\\frac{\\frac{\\left(\\left(a+4\\right)^{\\left(x+1\\right)^{x}}\\right)^{a}}{\\left(x+1\\right)^{a}}}{x-1}');
        expect(_('3/2*cos((x-2)^2/b)^x')).toEqual('\\frac{3 \\cdot \\left(\\cos\\left(\\frac{\\left(x-2\\right)^{2}}{b}\\right)\\right)^{x}}{2}');
        expect(_('(x*y/(a*b))^(1/x)', options)).toEqual('\\frac{x^{\\frac{1}{x}} \\cdot y^{\\frac{1}{x}}}{\\left(a \\cdot b\\right)^{\\frac{1}{x}}}');
    });

    it('should set roots correctly for TeX', () => {
        expect(_('(x^(1/a)+5)^(1/3)')).toEqual('\\sqrt[3]{\\sqrt[a]{x}+5}');
        expect(_('sqrt((x^(1/a)+5))')).toEqual('\\sqrt{\\sqrt[a]{x}+5}');
        expect(_('sqrt((x^(1/a)+5))^x')).toEqual('\\left(\\sqrt[a]{x}+5\\right)^{\\frac{x}{2}}');
    });

    it('convert text correctly', () => {
        expect(__('1/2')).toEqual('1/2');
        expect(__('x^-2')).toEqual('1/x^2');
        expect(__('2*a/b')).toEqual('2*a/b');
        expect(__('(x+1)/(x+2)')).toEqual('(x+1)/(x+2)');
        expect(__('(x+1)^(1/4)/(x+2)')).toEqual('(x+1)^(1/4)/(x+2)');
        expect(__('(3/5)(x+1)^(1/4)/(x+2)')).toEqual('3*(x+1)^(1/4)/(5*(x+2))');
        expect(__('(4/5)^(x+1)^x')).toEqual('(4/5)^(x+1)^x');
        expect(__('(((4+a)^(x+1)^x)/(x+1))^a/(x-1)')).toEqual('((a+4)^(x+1)^x)^a/(x+1)^a/(x-1)');
        expect(__('3/2*cos((x-2)^2/b)^x')).toEqual('3*(cos((x-2)^2/b))^x/2');
        expect(__('(x*y/(a*b))^(1/x)')).toEqual('x^(1/x)*y^(1/x)/(a*b)^(1/x)');
    });

    it('should set roots correctly for text', () => {
        expect(__('(x^(1/a)+5)^(1/3)')).toEqual('(x^(1/a)+5)^(1/3)');
        expect(__('sqrt((x^(1/a)+5))')).toEqual('sqrt(x^(1/a)+5)');
        expect(__('sqrt((x^(1/a)+5))^x')).toEqual('(x^(1/a)+5)^x/2');
    });
});