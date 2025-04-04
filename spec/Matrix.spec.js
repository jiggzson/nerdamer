/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict";

const { Parser: parser } = require('../output/core/classes/parser/Parser');

describe('Subst', () => {
    it('should parse matrices', () => {
        expect(parser.parse('matrix([1, 0, 1, 0], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])').text())
            .toEqual('matrix([1, 0, 1, 0], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])');
    });

    it('should correctly calculate determinants', () => {
        expect(parser.parse('matrix([1, 0, 1, 0], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])').determinant().text()).toEqual('0')
        expect(parser.parse('matrix([1, 0, 1, x], [-4, 1, 2, 1], [-5, -4, 1, 2], [0, -5, 0, 1])').determinant().text()).toEqual('-30*x')
    })
});