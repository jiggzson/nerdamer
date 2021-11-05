const {Settings} = require("../Settings");

function createFunctions(deps) {
    let {
        trig, trigh, exp, radians, degrees, print,
        min, max, sinc, sign, factorial, continued_fraction,
        round, scientific, mod, pfactor, vector, matrix,
        imatrix, parens, sqrt, nthroot, set, cbrt, log,
        expandall, abs, invert, determinant, size, transpose, dot,
        cross, vecget, vectrim, matget, matset, matgetrow, matsetrow,
        matgetcol, matsetcol, rationalize, IF, is_in, realpart,
        imagpart, conjugate, arg, polarform, rectform, sort, union,
        contains, intersection, difference, intersects, is_subset
    } = deps;

    return {
        'cos': [trig.cos, 1],
        'sin': [trig.sin, 1],
        'tan': [trig.tan, 1],
        'sec': [trig.sec, 1],
        'csc': [trig.csc, 1],
        'cot': [trig.cot, 1],
        'acos': [trig.acos, 1],
        'asin': [trig.asin, 1],
        'atan': [trig.atan, 1],
        'arccos': [trig.acos, 1],
        'arcsin': [trig.asin, 1],
        'arctan': [trig.atan, 1],
        'asec': [trig.asec, 1],
        'acsc': [trig.acsc, 1],
        'acot': [trig.acot, 1],
        'atan2': [trig.atan2, 2],
        'acoth': [trigh.acoth, 1],
        'asech': [trigh.asech, 1],
        'acsch': [trigh.acsch, 1],
        'sinh': [trigh.sinh, 1],
        'cosh': [trigh.cosh, 1],
        'tanh': [trigh.tanh, 1],
        'asinh': [trigh.asinh, 1],
        'sech': [trigh.sech, 1],
        'csch': [trigh.csch, 1],
        'coth': [trigh.coth, 1],
        'acosh': [trigh.acosh, 1],
        'atanh': [trigh.atanh, 1],
        'log10': [null, 1],
        'exp': [exp, 1],
        'radians': [radians, 1],
        'degrees': [degrees, 1],
        'min': [min, -1],
        'max': [max, -1],
        'erf': [null, 1],
        'floor': [null, 1],
        'ceil': [null, 1],
        'trunc': [null, 1],
        'Si': [null, 1],
        'step': [null, 1],
        'rect': [null, 1],
        'sinc': [sinc, 1],
        'tri': [null, 1],
        'sign': [sign, 1],
        'Ci': [null, 1],
        'Ei': [null, 1],
        'Shi': [null, 1],
        'Chi': [null, 1],
        'Li': [null, 1],
        'fib': [null, 1],
        'fact': [factorial, 1],
        'factorial': [factorial, 1],
        'continued_fraction': [continued_fraction, [1, 2]],
        'dfactorial': [null, 1],
        'gamma_incomplete': [null, [1, 2]],
        'round': [round, [1, 2]],
        'scientific': [scientific, [1, 2]],
        'mod': [mod, 2],
        'pfactor': [pfactor, 1],
        'vector': [vector, -1],
        'matrix': [matrix, -1],
        'Set': [set, -1],
        'imatrix': [imatrix, -1],
        'parens': [parens, -1],
        'sqrt': [sqrt, 1],
        'cbrt': [cbrt, 1],
        'nthroot': [nthroot, 2],
        'log': [log, [1, 2]],
        'expand': [expandall, 1],
        'abs': [abs, 1],
        'invert': [invert, 1],
        'determinant': [determinant, 1],
        'size': [size, 1],
        'transpose': [transpose, 1],
        'dot': [dot, 2],
        'cross': [cross, 2],
        'vecget': [vecget, 2],
        'vecset': [vecget, 3],
        'vectrim': [vectrim, [1, 2]],
        'matget': [matget, 3],
        'matset': [matset, 4],
        'matgetrow': [matgetrow, 2],
        'matsetrow': [matsetrow, 3],
        'matgetcol': [matgetcol, 2],
        'matsetcol': [matsetcol, 3],
        'rationalize': [rationalize, 1],
        'IF': [IF, 3],
        'is_in': [is_in, 2],
        //imaginary support
        'realpart': [realpart, 1],
        'imagpart': [imagpart, 1],
        'conjugate': [conjugate, 1],
        'arg': [arg, 1],
        'polarform': [polarform, 1],
        'rectform': [rectform, 1],
        'sort': [sort, [1, 2]],
        'integer_part': [null, 1],
        'union': [union, 2],
        'contains': [contains, 2],
        'intersection': [intersection, 2],
        'difference': [difference, 2],
        'intersects': [intersects, 2],
        'is_subset': [is_subset, 2],
        //system support
        'print': [print, -1]
    }
}

//this function is used to comb through the function modules and find a function given its name
function findFunction(fname) {
    var fmodules = Settings.FUNCTION_MODULES,
        l = fmodules.length;
    for (var i = 0; i < l; i++) {
        var fmodule = fmodules[i];
        if (fname in fmodule)
            return fmodule[fname];
    }
    err('The function ' + fname + ' is undefined!');
}

module.exports = {
    createFunctions: createFunctions,
    findFunction: findFunction
};