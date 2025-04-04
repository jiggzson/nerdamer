import { Parser } from "./core/classes/parser/Parser";
import { Expression } from "./core/classes/parser/operations";
import { Polynomial } from "./core/classes/polynomial/Polynomial";
import { Rational } from "./core/classes/parser/operations";
import { Matrix } from "./core/classes/matrix/Matrix";
import { Vector } from "./core/classes/vector/Vector";
import { Collection } from "./core/classes/collection/Collection";
import { build } from "./core/classes/expression/utils";
import * as errors from "./core/errors";

import { Converter } from "./core/output/Converter";
import {
    cos, sin, tan, acos, asin, atan, sec, csc, cot, asec, acsc, acot,
    cosh, sinh, tanh, acosh, asinh, atanh, sech, csch, coth, asech, acsch, acoth
} from "./math/trig";
import packageInfo from "../package.json"
import { OptionsObject, SupportedInputType } from "./core/classes/parser/types";

const latexConverter = new Converter();
const textConverter = new Converter('text');

export function nerdamer(e: SupportedInputType) {
    return Parser.parse(e);
}

nerdamer.convertToLaTeX = function (e: Expression | string) {
    return latexConverter.convert(e);
}

nerdamer.convertToText = function (e: Expression | string) {
    return textConverter.convert(e);
}

nerdamer.convertFromLaTeX = function (TeX: string) {
    return latexConverter.fromTeX(TeX);
}

nerdamer.version = function () {
    return packageInfo.version;
}

nerdamer.set = function (settings: OptionsObject) {
    Parser.set(settings);
}

nerdamer.errors = errors;

nerdamer.buildFunction = build;

nerdamer.classes = {
    Expression: Expression,
    Rational: Rational,
    Polynomial: Polynomial,
    Matrix: {
        Matrix
    },
    Vector: Vector,
    Collection: Collection,
    Converter: Converter,
    static: {
        Parser: Parser
    }
}

// Trig functions
nerdamer.cos = cos;
nerdamer.sin = sin;
nerdamer.tan = tan;
nerdamer.acos = acos;
nerdamer.asin = asin;
nerdamer.atan = atan;
nerdamer.sec = sec;
nerdamer.csc = csc;
nerdamer.cot = cot;
nerdamer.asec = asec;
nerdamer.acsc = acsc;
nerdamer.acot = acot;

// Hyperbolic trig
nerdamer.cosh = cosh;
nerdamer.sinh = sinh;
nerdamer.tanh = tanh;
nerdamer.acosh = acosh;
nerdamer.asinh = asinh;
nerdamer.atanh = atanh;
nerdamer.sech = sech;
nerdamer.csch = csch;
nerdamer.coth = coth;
nerdamer.asech = asech;
nerdamer.acsch = acsch;
nerdamer.acoth = acoth;

module.exports = nerdamer;