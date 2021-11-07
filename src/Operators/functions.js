import {Settings} from '../Settings';
import {err} from '../Core/Errors';
import {Trig} from '../Core/Trig';
import {TrigHyperbolic as Trigh} from '../Core/Trig.hyperbolic';
import {
    abs, arg, cbrt, conjugate, contains, continued_fraction, cross, degrees, determinant, difference,
    dot, exp, factorial, IF, imagpart, imatrix, intersection, intersects, invert, is_subset, log, matget,
    matgetcol, matgetrow, matrix, matset, matsetcol, matsetrow, max, min, mod, nthroot, parens, pfactor, polarform,
    radians, rationalize, realpart, rectform, round, scientific, set, sign, sinc, size, sort, sqrt, transpose, union,
    vecget, vector, vectrim, print, is_in
} from '../Core/functions';
import {expandall} from '../Core/functions/math/expand';

export class FunctionProvider {
    functions = {
        'cos': [Trig.cos, 1],
        'sin': [Trig.sin, 1],
        'tan': [Trig.tan, 1],
        'sec': [Trig.sec, 1],
        'csc': [Trig.csc, 1],
        'cot': [Trig.cot, 1],
        'acos': [Trig.acos, 1],
        'asin': [Trig.asin, 1],
        'atan': [Trig.atan, 1],
        'arccos': [Trig.acos, 1],
        'arcsin': [Trig.asin, 1],
        'arctan': [Trig.atan, 1],
        'asec': [Trig.asec, 1],
        'acsc': [Trig.acsc, 1],
        'acot': [Trig.acot, 1],
        'atan2': [Trig.atan2, 2],
        'acoth': [Trigh.acoth, 1],
        'asech': [Trigh.asech, 1],
        'acsch': [Trigh.acsch, 1],
        'sinh': [Trigh.sinh, 1],
        'cosh': [Trigh.cosh, 1],
        'tanh': [Trigh.tanh, 1],
        'asinh': [Trigh.asinh, 1],
        'sech': [Trigh.sech, 1],
        'csch': [Trigh.csch, 1],
        'coth': [Trigh.coth, 1],
        'acosh': [Trigh.acosh, 1],
        'atanh': [Trigh.atanh, 1],
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

    getFunctionDescriptor(name) {
        return this.functions[name];
    }

    /**
     * Searches for function in FUNCTION_MODULES by name, throws error was not found
     * @param name
     * @return {(...args: any) => any}
     * @throws
     */
    findFunction(name) {
        let modules = Settings.FUNCTION_MODULES;
        const l = modules.length;

        for (let i = 0; i < l; i++) {
            let module = modules[i];
            if (name in module) {
                return module[name];
            }
        }

        err(`The function ${name} is undefined!`);
    }

    getFunctionDescriptors() {
        return this.functions;
    }

    setFunctionDescriptor(name, descriptor) {
        this.functions[name] = descriptor;
    }

    removeFunctionDescriptor(name) {
        delete this.functions[name];
    }
}

export function createFunctions() {
    return {
        'cos': [Trig.cos, 1],
        'sin': [Trig.sin, 1],
        'tan': [Trig.tan, 1],
        'sec': [Trig.sec, 1],
        'csc': [Trig.csc, 1],
        'cot': [Trig.cot, 1],
        'acos': [Trig.acos, 1],
        'asin': [Trig.asin, 1],
        'atan': [Trig.atan, 1],
        'arccos': [Trig.acos, 1],
        'arcsin': [Trig.asin, 1],
        'arctan': [Trig.atan, 1],
        'asec': [Trig.asec, 1],
        'acsc': [Trig.acsc, 1],
        'acot': [Trig.acot, 1],
        'atan2': [Trig.atan2, 2],
        'acoth': [Trigh.acoth, 1],
        'asech': [Trigh.asech, 1],
        'acsch': [Trigh.acsch, 1],
        'sinh': [Trigh.sinh, 1],
        'cosh': [Trigh.cosh, 1],
        'tanh': [Trigh.tanh, 1],
        'asinh': [Trigh.asinh, 1],
        'sech': [Trigh.sech, 1],
        'csch': [Trigh.csch, 1],
        'coth': [Trigh.coth, 1],
        'acosh': [Trigh.acosh, 1],
        'atanh': [Trigh.atanh, 1],
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
export function findFunction(fname) {
    var fmodules = Settings.FUNCTION_MODULES,
        l = fmodules.length;
    for (var i = 0; i < l; i++) {
        var fmodule = fmodules[i];
        if (fname in fmodule)
            return fmodule[fname];
    }
    err('The function ' + fname + ' is undefined!');
}
