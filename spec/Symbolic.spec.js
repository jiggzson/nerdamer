/* eslint-disable @typescript-eslint/no-require-imports */
/* global describe, it, expect, require */
"use strict";

const { Parser: parser } = require("../output/core/classes/parser/Parser");
const { contains } = require("../output/core/classes/expression/utils");

describe("Expression", () => {
  it("should test for polynomials correctly", () => {
    expect(parser.parse("3*x^2+5*x+1").isPolynomial()).toBe(true);
    expect(parser.parse("x*(3*x^2+5*x+1)").isPolynomial()).toBe(true);
    expect(parser.parse("a*b*(3*x^2+5*x+1)").isPolynomial()).toBe(true);
    expect(parser.parse("1/2*a*z*x^6+a*b^3+1").isPolynomial()).toBe(true);
    expect(parser.parse("1/2*a*z*x^6+a*b^y+1").isPolynomial()).toBe(false);
    expect(parser.parse("1/2*a*cos(x)*x^6+a*b^4+1").isPolynomial()).toBe(false);
    expect(parser.parse("(3*x^2+5*x+1)^-1").isPolynomial()).toBe(false);
    expect(parser.parse("1/x").isPolynomial()).toBe(false);
  });

  it("should detect products within products", () => {
    expect(contains(parser.parse("a*b"), parser.parse("1"))).toBe(true);
    expect(contains(parser.parse("a*b"), parser.parse("2"))).toBe(false);
    expect(contains(parser.parse("a*b"), parser.parse("e"))).toBe(false);
    expect(contains(parser.parse("a*b"), parser.parse("a"))).toBe(true);
    expect(contains(parser.parse("a*b*c"), parser.parse("a*c"))).toBe(true);
    expect(contains(parser.parse("a*b*c"), parser.parse("2*a*c"))).toBe(false);
    expect(contains(parser.parse("a*b*c"), parser.parse("2*a*e"))).toBe(false);
  });

  it("should separate variables correctly", () => {
    expect(parser.parse("5*x^2*a*b").separateVar("a", "b").toString()).toEqual(
      "5*x^2,a*b"
    );
    expect(parser.parse("5*x^2+x").separateVar("x").toString()).toEqual(
      "x+5*x^2,1"
    );
    expect(parser.parse("5*x^2").separateVar("x").toString()).toEqual("5,x^2");
    expect(parser.parse("5*x*b").separateVar("x").toString()).toEqual("5*b,x");
    expect(parser.parse("5*x^x").separateVar("x").toString()).toEqual("5,x^x");
    expect(parser.parse("5*b").separateVar("x").toString()).toEqual("5*b,1");
    expect(parser.parse("5").separateVar("x").toString()).toEqual("5,1");
  });

  it("should get the coefficients correctly", () => {
    expect(parser.parse("5*x^2+2*x-1").coeffs("x").text()).toEqual(
      "{ 0: -1, 1: 2, 2: 5 }"
    );
    expect(parser.parse("a*b*x^2+c*x-1+q").coeffs("x").text()).toEqual(
      "{ 0: -1+q, 1: c, 2: a*b }"
    );
    expect(
      parser.parse("a*b*x^2*y+c*x*y^4-y+q+9").coeffs("x", "y").text()
    ).toEqual("{ 2,1: a*b, 1,4: c, 0,1: -1, 0,0: 9+q }");
  });
});
