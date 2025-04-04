import {
    cos, sin, tan, sec, csc, cot, acos, asin, atan, atan2,
    cosh, sinh, tanh, sech, csch, coth, acosh, asinh, atanh, asech, acsch, acoth
} from "../math/trig";
import { expand } from "./functions/expand/expand";
import { subst } from "./functions/subst";
import { hypot } from "../math/geometry";
import { diff } from "../calculus/derivative";
import { matrix, sqrt, factorial, abs, erf, erfc, log, gamma } from "./functions/math";
import { imagPart, realPart, polarForm, rectForm, arg } from "./functions/complex";
import { imatrix } from "./classes/matrix/utils";
// import { sin } from "../math/functions/trig/sin";
// import { tan } from "../math/functions/trig/tan";

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const mathFunctions: { [functionName: string]: [Function, minArgs: number, maxArgs: number, maxPrecision?: number] } = {
    cos: [cos, 1, 1],
    sin: [sin, 1, 1],
    tan: [tan, 1, 1],
    sec: [sec, 1, 1],
    csc: [csc, 1, 1],
    cot: [cot, 1, 1],
    acos: [acos, 1, 1],
    asin: [asin, 1, 1],
    atan: [atan, 1, 1],
    atan2: [atan2, 2, 2],
    cosh: [cosh, 1, 1],
    sinh: [sinh, 1, 1],
    tanh: [tanh, 1, 1],
    sech: [sech, 1, 1],
    csch: [csch, 1, 1],
    coth: [coth, 1, 1],
    acosh: [acosh, 1, 1],
    asinh: [asinh, 1, 1],
    atanh: [atanh, 1, 1],
    asech: [asech, 1, 1],
    acsch: [acsch, 1, 1],
    acoth: [acoth, 1, 1],
    abs: [abs, 1, 1],
    sqrt: [sqrt, 1, 1],
    subst: [subst, 3, 3],
    log: [log, 1, 1],
    erf: [erf, 1, 1],
    erfc: [erfc, 1, 1],
    gamma: [gamma, 1, 1],
    hypot: [hypot, 2, 2],
    fact: [factorial, 1, 1],
    factorial: [factorial, 1, 1],
    expand: [expand, 1, 1],
    imagpart: [imagPart, 1, 1],
    realpart: [realPart, 1, 1],
    polarform: [polarForm, 1, 1],
    rectform: [rectForm, 1, 1],
    arg: [arg, 1, 1],

    // Matrices and Vector
    matrix: [matrix, 1, -1],
    imatrix: [imatrix, 1, 1],

    // Calculus
    diff: [diff, 1, 3]
}