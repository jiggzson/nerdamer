import {Groups} from './Groups';
import {expand} from './functions/math/expand';
import {add, arg, divide, multiply, sqrt, subtract} from './functions';
import {Symbol} from './Symbol';
import {evaluate, format, isSymbol} from './Utils';
import {Settings} from '../Settings';
import {Vector} from '../Parser/Vector';
import {parse} from './parse';
import {Math2} from './Math2';

/**
 * TODO: Pick a more descriptive name and better description
 * Breaks a function down into it's parts wrt to a variable, mainly coefficients
 * Example a*x^2+b wrt x
 * @param {Symbol} fn
 * @param {String} wrt
 * @param {boolean} as_obj
 */
export function decompose_fn(fn, wrt, as_obj) {
    wrt = String(wrt); //convert to string
    let ax, a, x, b;
    if (fn.group === Groups.CP) {
        let t = expand(fn.clone()).stripVar(wrt);
        ax = subtract(fn.clone(), t.clone());
        b = t;
    }
    else {
        ax = fn.clone();
    }
    a = ax.stripVar(wrt);
    x = divide(ax.clone(), a.clone());
    b = b || new Symbol(0);
    if (as_obj)
        return {
            a: a,
            x: x,
            ax: ax,
            b: b
        };
    return [a, x, ax, b];
}

/**
 * Returns the coefficients of a symbol given a variable. Given ax^2+b^x+c, it divides
 * each nth term by x^n.
 * @param {Symbol} symbol
 * @param {Symbol} wrt
 */
export function getCoeffs(symbol, wrt, info) {
    let coeffs = [];
    //we loop through the symbols and stick them in their respective
    //containers e.g. y*x^2 goes to index 2
    symbol.each(function (term) {
        let coeff, p;

        if (term.contains(wrt)) {
            //we want only the coefficient which in this case will be everything but the variable
            //e.g. a*b*x -> a*b if the variable to solve for is x
            coeff = term.stripVar(wrt);
            let x = divide(term.clone(), coeff.clone());
            p = x.power.toDecimal();
        }
        else {
            coeff = term;
            p = 0;
        }
        let e = coeffs[p];
        //if it exists just add it to it
        coeffs[p] = e ? add(e, coeff) : coeff;

    }, true);

    for (let i = 0; i < coeffs.length; i++)
        if (!coeffs[i])
            coeffs[i] = new Symbol(0);
    //fill the holes
    return coeffs;
}

/**
 * Checks to see if a number or Symbol is a fraction
 * @param {Number|Symbol} num
 * @returns {boolean}
 */
export function isFraction(num) {
    if (isSymbol(num))
        return isFraction(num.multiplier.toDecimal());
    return (num % 1 !== 0);
}

/**
 * @param {Number|Symbol} obj
 * @returns {boolean}
 */
export function isNegative(obj) {
    if (isSymbol(obj)) {
        obj = obj.multiplier;
    }
    return obj.lessThan(0);
}

/**
 * Checks to see if a symbol is in group N
 * @param {Symbol} symbol
 */
export function isNumericSymbol(symbol) {
    return symbol.group === Groups.N || symbol.group === Groups.P;
}


/**
 * Gets nth roots of a number
 * @param {Symbol} symbol
 * @returns {Vector}
 */
export function nroots(symbol) {
    var a, b;

    if (symbol.group === Groups.FN && symbol.fname === '') {
        a = Symbol.unwrapPARENS(parse(symbol).toLinear());
        b = parse(symbol.power);
    }
    else if (symbol.group === Groups.P) {
        a = parse(symbol.value);
        b = parse(symbol.power);
    }

    if (a && b && (a.group === Groups.N) && b.group === Groups.N && a.multiplier.isNegative()) {
        let _roots = [];

        var parts = Symbol.toPolarFormArray(evaluate(symbol));
        var r = parts[0];

        //var r = parse(a).abs().toString();

        //https://en.wikipedia.org/wiki/De_Moivre%27s_formula
        var x = arg(a);
        var n = b.multiplier.den.toString();
        var p = b.multiplier.num.toString();

        var formula = '(({0})^({1})*(cos({3})+({2})*sin({3})))^({4})';

        for (var i = 0; i < n; i++) {
            var t = evaluate(parse(format("(({0})+2*pi*({1}))/({2})", x, i, n))).multiplier.toDecimal();
            _roots.push(evaluate(parse(format(formula, r, n, Settings.IMAGINARY, t, p))));
        }
        return Vector.fromArray(_roots);
    }
    else if (symbol.isConstant(true, true)) {
        var sign = symbol.sign();
        var x = evaluate(symbol.abs());
        var root = sqrt(x);

        var _roots = [root.clone(), root.negate()];

        if (sign < 0)
            _roots = _roots.map(function (x) {
                return multiply(x, Symbol.imaginary());
            });

    }
    else {
        _roots = [parse(symbol)];
    }

    return Vector.fromArray(_roots);
}

/**
 * Convert number from scientific format to decimal format
 * @param value
 */
export function scientificToDecimal(value) {
    return Math2.scientificToDecimal(value);
}


