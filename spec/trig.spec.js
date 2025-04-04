/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

/*global describe, it, require, expect */

const { Parser: parser } = require("../output/core/classes/parser/Parser");

describe("Trig", () => {
  it("should provide the correct value for cos in all quadrants", () => {
    expect(parser.parse("cos(atan(6/11))").text()).toEqual("11*157^(-1/2)");
    expect(parser.parse("cos(-atan(6/11))").text()).toEqual("11*157^(-1/2)");
    expect(parser.parse("cos(-acos(6/11))").text()).toEqual("6/11");
    expect(parser.parse("cos(acos(6/11))").text()).toEqual("6/11");
    expect(parser.parse("cos(asin(6/11))").text()).toEqual("(1/11)*85^(1/2)");
    expect(parser.parse("cos(-asin(6/11))").text()).toEqual("(1/11)*85^(1/2)");
    expect(parser.parse("cos(0)").text()).toEqual("1");
    expect(parser.parse("cos(pi/6)").text()).toEqual("(1/2)*3^(1/2)");
    expect(parser.parse("cos(5*pi/6)").text()).toEqual("(-1/2)*3^(1/2)");
    expect(parser.parse("cos(7*pi/6)").text()).toEqual("(-1/2)*3^(1/2)");
    expect(parser.parse("cos(-17*pi/6)").text()).toEqual("(-1/2)*3^(1/2)");
    expect(parser.parse("cos(pi/4)").text()).toEqual("2^(-1/2)");
    expect(parser.parse("cos(3*pi/4)").text()).toEqual("-2^(-1/2)");
    expect(parser.parse("cos(5*pi/4)").text()).toEqual("-2^(-1/2)");
    expect(parser.parse("cos(-pi/4)").text()).toEqual("2^(-1/2)");
    expect(parser.parse("cos(pi/3)").text()).toEqual("1/2");
    expect(parser.parse("cos(2*pi/3)").text()).toEqual("-1/2");
    expect(parser.parse("cos(4*pi/3)").text()).toEqual("-1/2");
    expect(parser.parse("cos(-2*pi/3)").text()).toEqual("-1/2");
    expect(parser.parse("cos(pi/2)").text()).toEqual("0");
    expect(parser.parse("cos(-pi/2)").text()).toEqual("0");
    expect(parser.parse("cos(-3*pi/2)").text()).toEqual("0");
    expect(parser.parse("cos(3*pi/2)").text()).toEqual("0");
    expect(parser.parse("cos(pi)").text()).toEqual("-1");
    expect(parser.parse("cos(32*pi)").text()).toEqual("1");
    expect(parser.parse("cos(33*pi)").text()).toEqual("-1");
    expect(parser.evaluate("cos(2)").text()).toEqual("-0.416146836547142387");
    expect(parser.evaluate("cos(-2)").text()).toEqual("-0.416146836547142387");
  });

  it("should provide the correct value for sin in all quadrants", () => {
    expect(parser.parse("sin(atan(6/11))").text()).toEqual("6*157^(-1/2)");
    expect(parser.parse("sin(-atan(6/11))").text()).toEqual("-6*157^(-1/2)");
    expect(parser.parse("sin(-asin(6/11))").text()).toEqual("-6/11");
    expect(parser.parse("sin(asin(6/11))").text()).toEqual("6/11");
    expect(parser.parse("sin(acos(6/11))").text()).toEqual("(1/11)*85^(1/2)");
    expect(parser.parse("sin(-acos(6/11))").text()).toEqual("(-1/11)*85^(1/2)");
    expect(parser.parse("sin(0)").text()).toEqual("0");
    expect(parser.parse("sin(pi/6)").text()).toEqual("1/2");
    expect(parser.parse("sin(5*pi/6)").text()).toEqual("1/2");
    expect(parser.parse("sin(7*pi/6)").text()).toEqual("-1/2");
    expect(parser.parse("sin(-17*pi/6)").text()).toEqual("-1/2");
    expect(parser.parse("sin(pi/4)").text()).toEqual("2^(-1/2)");
    expect(parser.parse("sin(3*pi/4)").text()).toEqual("2^(-1/2)");
    expect(parser.parse("sin(5*pi/4)").text()).toEqual("-2^(-1/2)");
    expect(parser.parse("sin(-pi/4)").text()).toEqual("-2^(-1/2)");
    expect(parser.parse("sin(pi/3)").text()).toEqual("(1/2)*3^(1/2)");
    expect(parser.parse("sin(2*pi/3)").text()).toEqual("(1/2)*3^(1/2)");
    expect(parser.parse("sin(4*pi/3)").text()).toEqual("(-1/2)*3^(1/2)");
    expect(parser.parse("sin(-2*pi/3)").text()).toEqual("(-1/2)*3^(1/2)");
    expect(parser.parse("sin(pi/2)").text()).toEqual("1");
    expect(parser.parse("sin(-pi/2)").text()).toEqual("-1");
    expect(parser.parse("sin(-3*pi/2)").text()).toEqual("1");
    expect(parser.parse("sin(3*pi/2)").text()).toEqual("-1");
    expect(parser.parse("sin(pi)").text()).toEqual("0");
    expect(parser.parse("sin(32*pi)").text()).toEqual("0");
    expect(parser.parse("sin(33*pi)").text()).toEqual("0");
    expect(parser.evaluate("sin(2)").text()).toEqual("0.9092974268256816954");
    expect(parser.evaluate("sin(-2)").text()).toEqual("-0.9092974268256816954");
  });

  it("should provide the correct value for tan in all quadrants", () => {
    expect(() => {
      parser.parse("tan(pi/2)");
    }).toThrow();
    expect(() => {
      parser.parse("tan(3*pi/2)");
    }).toThrow();
    expect(() => {
      parser.parse("tan(-pi/2)");
    }).toThrow();
    expect(parser.parse("tan(0)").text()).toEqual("0");
    expect(parser.parse("tan(-atan(3/4))").text()).toEqual("-3/4");
    expect(parser.parse("tan(atan(3/4))").text()).toEqual("3/4");
    expect(parser.parse("tan(-asin(6/11))").text()).toEqual("-6*85^(-1/2)");
    expect(parser.parse("tan(asin(6/11))").text()).toEqual("6*85^(-1/2)");
    expect(parser.parse("tan(acos(6/11))").text()).toEqual("(1/6)*85^(1/2)");
    expect(parser.parse("tan(-acos(6/11))").text()).toEqual("(-1/6)*85^(1/2)");
    expect(parser.parse("tan(pi/6)").text()).toEqual("3^(-1/2)");
    expect(parser.parse("tan(5*pi/6)").text()).toEqual("-3^(-1/2)");
    expect(parser.parse("tan(7*pi/6)").text()).toEqual("3^(-1/2)");
    expect(parser.parse("tan(-17*pi/6)").text()).toEqual("3^(-1/2)");
    expect(parser.parse("tan(pi/4)").text()).toEqual("1");
    expect(parser.parse("tan(3*pi/4)").text()).toEqual("-1");
    expect(parser.parse("tan(5*pi/4)").text()).toEqual("1");
    expect(parser.parse("tan(-pi/4)").text()).toEqual("-1");
    expect(parser.parse("tan(pi/3)").text()).toEqual("3^(1/2)");
    expect(parser.parse("tan(2*pi/3)").text()).toEqual("-3^(1/2)");
    expect(parser.parse("tan(4*pi/3)").text()).toEqual("3^(1/2)");
    expect(parser.parse("tan(-2*pi/3)").text()).toEqual("3^(1/2)");
    expect(parser.parse("tan(pi)").text()).toEqual("0");
    expect(parser.parse("tan(32*pi)").text()).toEqual("0");
    expect(parser.parse("tan(33*pi)").text()).toEqual("0");
    expect(parser.evaluate("tan(2)").text()).toEqual("-2.1850398632615189916");
    expect(parser.evaluate("tan(-2)").text()).toEqual("2.1850398632615189916");
  });

  it("should provide the correct value for sec in all quadrants", () => {
    expect(() => {
      parser.parse("sec(pi/2)");
    }).toThrow();
    expect(() => {
      parser.parse("sec(3*pi/2)");
    }).toThrow();
    expect(parser.parse("sec(0)").text()).toEqual("1");
    expect(parser.parse("sec(pi/6)").text()).toEqual("2*3^(-1/2)");
    expect(parser.parse("sec(5*pi/6)").text()).toEqual("-2*3^(-1/2)");
    expect(parser.parse("sec(7*pi/6)").text()).toEqual("-2*3^(-1/2)");
    expect(parser.parse("sec(-17*pi/6)").text()).toEqual("-2*3^(-1/2)");
    expect(parser.parse("sec(pi/4)").text()).toEqual("2^(1/2)");
    expect(parser.parse("sec(3*pi/4)").text()).toEqual("-2^(1/2)");
    expect(parser.parse("sec(5*pi/4)").text()).toEqual("-2^(1/2)");
    expect(parser.parse("sec(-pi/4)").text()).toEqual("2^(1/2)");
    expect(parser.parse("sec(pi/3)").text()).toEqual("2");
    expect(parser.parse("sec(2*pi/3)").text()).toEqual("-2");
    expect(parser.parse("sec(4*pi/3)").text()).toEqual("-2");
    expect(parser.parse("sec(-2*pi/3)").text()).toEqual("-2");
    expect(parser.parse("sec(pi)").text()).toEqual("-1");
    expect(parser.parse("sec(32*pi)").text()).toEqual("1");
    expect(parser.parse("sec(33*pi)").text()).toEqual("-1");
  });

  it("should provide the correct value for csc in all quadrants", () => {
    expect(() => {
      parser.parse("csc(0)");
    }).toThrow();
    expect(() => {
      parser.parse("csc(pi)");
    }).toThrow();
    expect(() => {
      parser.parse("csc(32pi)");
    }).toThrow();
    expect(parser.parse("csc(pi/6)").text()).toEqual("2");
    expect(parser.parse("csc(5*pi/6)").text()).toEqual("2");
    expect(parser.parse("csc(7*pi/6)").text()).toEqual("-2");
    expect(parser.parse("csc(-17*pi/6)").text()).toEqual("-2");
    expect(parser.parse("csc(pi/4)").text()).toEqual("2^(1/2)");
    expect(parser.parse("csc(3*pi/4)").text()).toEqual("2^(1/2)");
    expect(parser.parse("csc(5*pi/4)").text()).toEqual("-2^(1/2)");
    expect(parser.parse("csc(-pi/4)").text()).toEqual("-2^(1/2)");
    expect(parser.parse("csc(pi/3)").text()).toEqual("2*3^(-1/2)");
    expect(parser.parse("csc(2*pi/3)").text()).toEqual("2*3^(-1/2)");
    expect(parser.parse("csc(4*pi/3)").text()).toEqual("-2*3^(-1/2)");
    expect(parser.parse("csc(-2*pi/3)").text()).toEqual("-2*3^(-1/2)");
  });

  it("should provide the correct value for cot in all quadrants", () => {
    expect(() => {
      parser.parse("cot(0)");
    }).toThrow();
    expect(() => {
      parser.parse("cot(pi)");
    }).toThrow();
    expect(() => {
      parser.parse("cot(32pi)");
    }).toThrow();
    expect(parser.parse("cot(pi/6)").text()).toEqual("3^(1/2)");
    expect(parser.parse("cot(5*pi/6)").text()).toEqual("-3^(1/2)");
    expect(parser.parse("cot(7*pi/6)").text()).toEqual("3^(1/2)");
    expect(parser.parse("cot(-17*pi/6)").text()).toEqual("3^(1/2)");
    expect(parser.parse("cot(pi/4)").text()).toEqual("1");
    expect(parser.parse("cot(3*pi/4)").text()).toEqual("-1");
    expect(parser.parse("cot(5*pi/4)").text()).toEqual("1");
    expect(parser.parse("cot(-pi/4)").text()).toEqual("-1");
    expect(parser.parse("cot(pi/3)").text()).toEqual("3^(-1/2)");
    expect(parser.parse("cot(2*pi/3)").text()).toEqual("-3^(-1/2)");
    expect(parser.parse("cot(4*pi/3)").text()).toEqual("3^(-1/2)");
    expect(parser.parse("cot(-2*pi/3)").text()).toEqual("3^(-1/2)");
  });

  it("should provide the correct value for acos in all quadrants", () => {
    expect(parser.parse("acos(0.5)").text()).toEqual("acos(0.5)");
    expect(parser.parse("acos(0)").text()).toEqual("(1/2)*pi");
    expect(parser.parse("acos(1/2)").text()).toEqual("(1/3)*pi");
    expect(parser.parse("acos(sqrt(2)/2)").text()).toEqual("(1/4)*pi");
    expect(parser.parse("acos(1/sqrt(2))").text()).toEqual("(1/4)*pi");
    expect(parser.parse("acos(sqrt(3)/2)").text()).toEqual("(1/6)*pi");
    expect(parser.parse("acos(-1/2)").text()).toEqual("(2/3)*pi");
    expect(parser.parse("acos(-sqrt(2)/2)").text()).toEqual("(3/4)*pi");
    expect(parser.parse("acos(-1/sqrt(2))").text()).toEqual("(3/4)*pi");
    expect(parser.parse("acos(-sqrt(3)/2)").text()).toEqual("(5/6)*pi");
    expect(parser.parse("acos(1)").text()).toEqual("0");
    expect(parser.parse("acos(-1)").text()).toEqual("pi");
  });

  it("should provide the correct value for asin in all quadrants", () => {
    expect(parser.parse("asin(0.5)").text()).toEqual("asin(0.5)");
    expect(parser.parse("asin(0)").text()).toEqual("0");
    expect(parser.parse("asin(1/2)").text()).toEqual("(1/6)*pi");
    expect(parser.parse("asin(sqrt(2)/2)").text()).toEqual("(1/4)*pi");
    expect(parser.parse("asin(1/sqrt(2))").text()).toEqual("(1/4)*pi");
    expect(parser.parse("asin(sqrt(3)/2)").text()).toEqual("(1/3)*pi");
    expect(parser.parse("asin(-1/2)").text()).toEqual("(-1/6)*pi");
    expect(parser.parse("asin(-sqrt(2)/2)").text()).toEqual("(-1/4)*pi");
    expect(parser.parse("asin(-1/sqrt(2))").text()).toEqual("(-1/4)*pi");
    expect(parser.parse("asin(-sqrt(3)/2)").text()).toEqual("(-1/3)*pi");
    expect(parser.parse("asin(1)").text()).toEqual("(1/2)*pi");
    expect(parser.parse("asin(-1)").text()).toEqual("(-1/2)*pi");
  });

  it("should calculate hyperbolic trig values correctly", () => {
    expect(parser.evaluate("cosh(5)").text()).toEqual("74.209948524787844444");
    expect(parser.evaluate("cosh(-5)").text()).toEqual("74.209948524787844444");
    expect(parser.evaluate("cosh(0)").text()).toEqual("1");
    expect(parser.evaluate("sinh(5)").text()).toEqual("74.203210577788758977");
    expect(parser.evaluate("sinh(-5)").text()).toEqual(
      "-74.203210577788758977"
    );
    expect(parser.evaluate("sinh(0)").text()).toEqual("0");
    expect(parser.evaluate("tanh(5)").text()).toEqual("0.99990920426259513121");
    expect(parser.evaluate("tanh(-5)").text()).toEqual(
      "-0.99990920426259513121"
    );
    expect(parser.evaluate("tanh(0)").text()).toEqual("0");
    expect(parser.evaluate("sech(5)").text()).toEqual(
      "0.013475282221304557306"
    );
    expect(parser.evaluate("sech(-5)").text()).toEqual(
      "0.013475282221304557306"
    );
    expect(parser.evaluate("sech(0)").text()).toEqual("1");
    expect(parser.evaluate("sech(1)").text()).toEqual("0.64805427366388539957");
    expect(() => {
      parser.evaluate("csch(0)");
    }).toThrow();
    expect(parser.evaluate("csch(5)").text()).toEqual(
      "0.013476505830589086655"
    );
    expect(parser.evaluate("csch(-5)").text()).toEqual(
      "-0.013476505830589086655"
    );
    expect(parser.evaluate("csch(1)").text()).toEqual("0.85091812823932154512");
    expect(parser.evaluate("coth(5)").text()).toEqual("1.0000908039820193755");
    expect(parser.evaluate("coth(-5)").text()).toEqual(
      "-1.0000908039820193755"
    );
    expect(() => {
      parser.evaluate("coth(0)");
    }).toThrow();
    expect(parser.evaluate("coth(1)").text()).toEqual("1.3130352854993313036");
    expect(parser.evaluate("acosh(5)").text()).toEqual("2.2924316695611776878");
    expect(parser.evaluate("acosh(-5)").text()).toEqual(
      "2.2924316695611776878+3.1415926535897932385*i"
    );
    expect(parser.evaluate("acosh(0)").text()).toEqual(
      "1.5707963267948966193*i"
    );
    expect(parser.evaluate("acosh(1)").text()).toEqual("0");
    expect(parser.evaluate("asinh(5)").text()).toEqual("2.3124383412727526203");
    expect(parser.evaluate("asinh(-5)").text()).toEqual(
      "-2.3124383412727526203"
    );
    expect(parser.evaluate("asinh(0)").text()).toEqual("0");
    expect(parser.evaluate("asinh(1)").text()).toEqual(
      "0.88137358701954302523"
    );
    expect(parser.evaluate("atanh(5)").text()).toEqual(
      "0.20273255405408219099+1.5707963267948966193*i"
    );
    expect(parser.evaluate("atanh(-5)").text()).toEqual(
      "-0.20273255405408219099+1.5707963267948966193*i"
    );
    expect(parser.evaluate("atanh(0)").text()).toEqual("0");
    expect(parser.evaluate("atanh(0.5)").text()).toEqual(
      "0.5493061443340548457"
    );
    expect(() => {
      parser.evaluate("atanh(1)");
    }).toThrow();
    expect(parser.evaluate("asech(5)").text()).toEqual(
      "1.3694384060045658278*i"
    );
    expect(parser.evaluate("asech(-5)").text()).toEqual(
      "1.7721542475852274107*i"
    );
    expect(() => {
      parser.evaluate("asech(0)");
    }).toThrow();
    expect(parser.evaluate("asech(0.5)").text()).toEqual(
      "1.3169578969248167086"
    );
    expect(parser.evaluate("asech(1)").text()).toEqual("0");

    expect(parser.evaluate("acsch(5)").text()).toEqual(
      "0.19869011034924140647"
    );
    expect(parser.evaluate("acsch(-5)").text()).toEqual(
      "-0.19869011034924140648"
    );
    expect(() => {
      parser.evaluate("acsch(0)");
    }).toThrow();
    expect(parser.evaluate("acsch(0.5)").text()).toEqual(
      "1.4436354751788103425"
    );
    expect(parser.evaluate("acsch(1)").text()).toEqual(
      "0.88137358701954302523"
    );
    expect(parser.evaluate("acoth(5)").text()).toEqual(
      "0.20273255405408219099"
    );
    expect(parser.evaluate("acoth(-5)").text()).toEqual(
      "-0.20273255405408219099"
    );
    expect(parser.evaluate("acoth(0)").text()).toEqual(
      "1.5707963267948966193*i"
    );
    expect(parser.evaluate("acoth(0.5)").text()).toEqual(
      "0.5493061443340548457+1.5707963267948966193*i"
    );
    expect(() => {
      parser.evaluate("acoth(1)");
    }).toThrow();
  });

  it("should provide the correct value for atan in all quadrants", () => {
    expect(parser.parse("atan(0.5)").text()).toEqual("atan(0.5)");
    expect(parser.parse("atan(0)").text()).toEqual("0");
    expect(parser.parse("atan(sqrt(3)/3)").text()).toEqual("(1/6)*pi");
    expect(parser.parse("atan(-sqrt(3)/3)").text()).toEqual("(-1/6)*pi");
    expect(parser.parse("atan(sqrt(3))").text()).toEqual("(1/3)*pi");
    expect(parser.parse("atan(-sqrt(3))").text()).toEqual("(-1/3)*pi");
    expect(parser.parse("atan(1)").text()).toEqual("(1/4)*pi");
    expect(parser.parse("atan(-1)").text()).toEqual("(-1/4)*pi");
  });

  it("should calculate atan2 correctly", () => {
    expect(parser.parse("atan2(-2, 123)").text()).toEqual("atan(-2/123)");
    expect(parser.parse("atan2(0, 123)").text()).toEqual("0");
    expect(parser.parse("atan2(0, -123)").text()).toEqual("pi");
    expect(parser.parse("atan2(1, 0)").text()).toEqual("(1/2)*pi");
    expect(parser.parse("atan2(-1, 0)").text()).toEqual("(-1/2)*pi");
    expect(parser.parse("atan2(-1, 1)").text()).toEqual("(-1/4)*pi");
    expect(parser.parse("atan2(1, -1)").text()).toEqual("(3/4)*pi");
    expect(parser.parse("atan2(-2, -2)").text()).toEqual("(-3/4)*pi");
    expect(parser.evaluate("atan2(-2, 123)").text()).toEqual(
      "-0.016258729805129587692"
    );
  });
});
