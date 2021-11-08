import {isInt} from '../../../Core/Utils';
import {Symbol, symfunction} from '../../../Types/Symbol';
import {Groups} from '../../../Types/Groups';
import {add, multiply, pow} from '../index';
import {parse} from '../../../Parser/Parser';

/**
 * Expands a symbol
 * @param symbol
 */
// Old expand
export function expand(symbol, opt = undefined) {
    if (Array.isArray(symbol)) {
        return symbol.map(function (x) {
            return expand(x, opt);
        });
    }
    opt = opt || {};
    //deal with parenthesis
    if (symbol.group === Groups.FN && symbol.fname === '') {
        var f = expand(symbol.args[0], opt);
        var x = expand(pow(f, parse(symbol.power)), opt);
        return multiply(parse(symbol.multiplier), x).distributeMultiplier();
    }
    // We can expand these groups so no need to waste time. Just return and be done.
    if ([Groups.N, Groups.P, Groups.S].indexOf(symbol.group) !== -1) {
        return symbol; //nothing to do
    }

    var original = symbol.clone();

    // Set up a try-catch block. If anything goes wrong then we simply return the original symbol
    try {
        // Store the power and multiplier
        var m = symbol.multiplier.toString();
        var p = Number(symbol.power);
        var retval = symbol;

        // Handle (a+b)^2 | (x+x^2)^2
        if (symbol.isComposite() && isInt(symbol.power) && symbol.power > 0) {
            var n = p - 1;
            // Strip the expression of it's multiplier and power. We'll call it f. The power will be p and the multiplier m.
            var f = new Symbol(0);

            symbol.each(function (x) {
                f = add(f, expand(parse(x), opt));
            });

            var expanded = parse(f);

            for (var i = 0; i < n; i++) {
                expanded = mix(expanded, f, opt);
            }

            retval = multiply(parse(m), expanded).distributeMultiplier();
        }
        else if (symbol.group === Groups.FN && opt.expand_functions === true) {
            var args = [];
            // Expand function the arguments
            symbol.args.forEach(function (x) {
                args.push(expand(x, opt));
            });
            // Put back the power and multiplier
            retval = pow(symfunction(symbol.fname, args), parse(symbol.power));
            retval = multiply(retval, parse(symbol.multiplier));
        }
        else if (symbol.isComposite() && isInt(symbol.power) && symbol.power < 0 && opt.expand_denominator === true) {
            // Invert it. Expand it and then re-invert it.
            symbol = symbol.invert();
            retval = expand(symbol, opt);
            retval.invert();
        }
        else if (symbol.group === Groups.CB) {
            var rank = function (s) {
                switch(s.group) {
                    case Groups.CP:
                        return 0;
                    case Groups.PL:
                        return 1;
                    case Groups.CB:
                        return 2;
                    case Groups.FN:
                        return 3;
                    default:
                        return 4;
                }
            };
            // Consider (a+b)(c+d). The result will be (a*c+a*d)+(b*c+b*d).
            // We start by moving collecting the symbols. We want others>FN>CB>PL>CP
            var symbols = symbol.collectSymbols().sort(function (a, b) {
                return rank(b) - rank(a);
            })
                // Distribute the power to each symbol and expand
                .map(function (s) {
                    var x = pow(s, parse(p));
                    var e = expand(x, opt);
                    return e;
                });

            var f = symbols.pop();

            // If the first symbols isn't a composite then we're done
            if (f.isComposite() && f.isLinear()) {
                symbols.forEach(function (s) {
                    f = mix(f, s, opt);
                });

                // If f is of group PL or CP then we can expand some more
                if (f.isComposite()) {
                    if (f.power > 1) {
                        f = expand(pow(f, parse(f.power)), opt);
                    }
                    // Put back the multiplier
                    retval = multiply(parse(m), f).distributeMultiplier();
                }
                else {
                    // Everything is expanded at this point so if it's still a CB
                    // then just return the symbol
                    retval = f;
                }
            }
            else {
                // Just multiply back in the expanded form of each
                retval = f;
                symbols.forEach(function (s) {
                    retval = multiply(retval, s);
                });
                // Put back the multiplier
                retval = multiply(retval, parse(m)).distributeMultiplier();
            }

            // TODO: This exists solely as a quick fix for sqrt(11)*sqrt(33) not simplifying.
            if (retval.group === Groups.CB) {
                retval = parse(retval);
            }
        }
        else {
            // Otherwise just return the expression
            retval = symbol;
        }
        // Final cleanup and return
        return retval;
    }
    catch(e) {
        return original;
    }
}

/**
 * A wrapper for the expand function
 * @param {Symbol} symbol
 * @returns {Symbol}
 */
export function expandall(symbol, opt) {
    opt = opt || {
        expand_denominator: true,
        expand_functions: true
    };
    return expand(symbol, opt);
}

/**
 * Used to multiply two expression in expanded form
 * @param {Symbol} a
 * @param {Symbol} b
 */
function mix(a, b, opt) {
    // Flip them if b is a CP or PL and a is not
    if (b.isComposite() && !a.isComposite() || b.isLinear() && !a.isLinear()) {
        [a, b] = [b, a];
    }
    // A temporary variable to hold the expanded terms
    var t = new Symbol(0);
    if (a.isLinear()) {
        a.each(function (x) {
            // If b is not a PL or a CP then simply multiply it
            if (!b.isComposite()) {
                var term = multiply(parse(x), parse(b));
                t = add(t, expand(term, opt));
            }
            // Otherwise multiply out each term.
            else if (b.isLinear()) {
                b.each(function (y) {
                    var term = multiply(parse(x), parse(y));
                    var expanded = expand(parse(term), opt);
                    t = add(t, expanded);
                }, true);
            }
            else {
                t = add(t, multiply(x, parse(b)));
            }
        }, true);
    }
    else {
        // Just multiply them together
        t = multiply(a, b);
    }

    // The expanded function is now t
    return t;
}
