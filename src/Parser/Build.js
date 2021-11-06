import {Math2} from '../Core/Math2';
import {Frac} from '../Core/Frac';
import {block, even, inBrackets, isInt, nround} from '../Core/Utils';
import {Symbol} from '../Core/Symbol';
import {Groups} from '../Core/Groups';
import {parse} from '../Core/parse';

export const Build = {
    dependencies: {
        _rename: {
            'Math2.factorial': 'factorial'
        },
        factorial: {
            'Math2.gamma': Math2.gamma
        },
        gamma_incomplete: {
            'Math2.factorial': Math2.factorial
        },
        Li: {
            'Math2.Ei': Math2.Ei,
            'Math2.bigLog': Math2.bigLog,
            'Frac': Frac
        },
        Ci: {
            'Math2.factorial': Math2.factorial
        },
        Ei: {
            'Math2.factorial': Math2.factorial
        },
        Si: {
            'Math2.factorial': Math2.factorial
        },
        Shi: {
            'Math2.factorial': Math2.factorial
        },
        Chi: {
            'isInt': isInt,
            'nround': nround,
            'Math2.num_integrate': Math2.num_integrate
        },
        factor: {
            'Math2.ifactor': Math2.ifactor,
            'Symbol': Symbol
        },
        num_integrate: {
            'Math2.simpson': Math2.simpson,
            'nround': nround
        },
        fib: {
            'even': even
        }
    },
    /* Some functions need to be made numeric safe. Build checks if there's a
     * reformat option and calls that instead when compiling the function string.
     */
    reformat: {
        // this simply extends the build function
        diff: function (symbol, deps) {
            var v = symbol.args[1].toString();
            var f = 'var f = ' + Build.build(symbol.args[0].toString(), [v]) + ';';
            deps[1] += 'var diff = ' + Math2.diff.toString() + ';';
            deps[1] += f;

            return ['diff(f)(' + v + ')', deps];
        }
    },
    getProperName: function (f) {
        var map = {
            continued_fraction: 'continuedFraction'
        };
        return map[f] || f;
    },
    // assumes that dependences are at max 2 levels
    compileDependencies: function (f, deps) {
        // grab the predefined dependiences
        var dependencies = Build.dependencies[f];

        // the dependency string
        var dep_string = deps && deps[1] ? deps[1] : '';

        // the functions to be replaced
        var replacements = deps && deps[0] ? deps[0] : {};

        // loop through them and add them to the list
        for (var x in dependencies) {
            if (typeof dependencies[x] === 'object')
                continue; // skip object
            var components = x.split('.'); //Math.f becomes f
            // if the function isn't part of an object then reference the function itself
            dep_string += 'var ' + (components.length > 1 ? components[1] : components[0]) + '=' + dependencies[x] + ';';
            replacements[x] = components.pop();
        }

        return [replacements, dep_string];
    },
    getArgsDeps: function (symbol, dependencies) {
        var args = symbol.args;
        for (var i = 0; i < args.length; i++) {
            symbol.args[i].each(function (x) {
                if (x.group === Groups.FN)
                    dependencies = Build.compileDependencies(x.fname, dependencies);
            });
        }
        return dependencies;
    },
    build: function (symbol, arg_array) {
        symbol = block('PARSE2NUMBER', function () {
            return parse(symbol);
        }, true);
        var args = Build.$variables(symbol);
        var supplements = [];
        var dependencies = [];
        var ftext = function (symbol, xports) {
            //Fix for #545 - Parentheses confuse build.
            if (symbol.fname === '') {
                symbol = Symbol.unwrapPARENS(symbol);
            }
            xports = xports || [];
            var c = [],
                group = symbol.group,
                prefix = '';

            var ftext_complex = function (group) {
                    var d = group === Groups.CB ? '*' : '+',
                        cc = [];

                    for (var x in symbol.symbols) {
                        var sym = symbol.symbols[x],
                            ft = ftext(sym, xports)[0];
                        // wrap it in brackets if it's group PL or CP
                        if (sym.isComposite())
                            ft = inBrackets(ft);
                        cc.push(ft);
                    }
                    var retval = cc.join(d);
                    retval = retval && !symbol.multiplier.equals(1) ? inBrackets(retval) : retval;
                    return retval;
                },
                ftext_function = function (bn) {
                    var retval;
                    if (bn in Math)
                        retval = 'Math.' + bn;
                    else {
                        bn = Build.getProperName(bn);
                        if (supplements.indexOf(bn) === -1) { // make sure you're not adding the function twice
                            //Math2 functions aren't part of the standard javascript
                            //Math library and must be exported.
                            xports.push('var ' + bn + ' = ' + Math2[bn].toString() + '; ');
                            supplements.push(bn);
                        }
                        retval = bn;
                    }
                    retval = retval + inBrackets(symbol.args.map(function (x) {
                        return ftext(x, xports)[0];
                    }).join(','));

                    return retval;
                };

            // the multiplier
            if (group === Groups.N)
                c.push(symbol.multiplier.toDecimal());
            else if (symbol.multiplier.equals(-1))
                prefix = '-';
            else if (!symbol.multiplier.equals(1))
                c.push(symbol.multiplier.toDecimal());
            // the value
            var value;

            if (group === Groups.S || group === Groups.P)
                value = symbol.value;
            else if (group === Groups.FN) {
                dependencies = Build.compileDependencies(symbol.fname, dependencies);
                dependencies = Build.getArgsDeps(symbol, dependencies);
                if (Build.reformat[symbol.fname]) {
                    var components = Build.reformat[symbol.fname](symbol, dependencies);
                    dependencies = components[1];
                    value = components[0];
                }
                else {
                    value = ftext_function(symbol.fname);
                }

            }
            else if (group === Groups.EX) {
                var pg = symbol.previousGroup;
                if (pg === Groups.N || pg === Groups.S)
                    value = symbol.value;
                else if (pg === Groups.FN) {
                    value = ftext_function(symbol.fname);
                    dependencies = Build.compileDependencies(symbol.fname, dependencies);
                    dependencies = Build.getArgsDeps(symbol, dependencies);
                }
                else
                    value = ftext_complex(symbol.previousGroup);
            }
            else {
                value = ftext_complex(symbol.group);
            }

            if (symbol.group !== Groups.N && !symbol.power.equals(1)) {
                var pow = ftext(parse(symbol.power));
                xports.push(pow[1]);
                value = 'Math.pow' + inBrackets(value + ',' + pow[0]);
            }

            if (value)
                c.push(prefix + value);

            return [c.join('*'), xports.join('').replace(/\n+\s+/g, ' ')];
        };
        if (arg_array) {
            // Fix for issue #546
            // Disable argument checking since it's a bit presumptuous.
            // Consider f(x) = 5; If I explicitely pass in an argument array contain x
            // this check will fail and complain since the function doesn't contain x.
            /*
             for (var i = 0; i < args.length; i++) {
             var arg = args[i];
             if (arg_array.indexOf(arg) === -1)
             err(arg + ' not found in argument array');
             }
             */
            args = arg_array;
        }

        var f_array = ftext(symbol);

        // make all the substitutions;
        for (var x in dependencies[0]) {
            f_array[1] = f_array[1].replace('exports.', '');
            dependencies[1] = dependencies[1].replace('exports.', '');

            var alias = dependencies[0][x];
            f_array[1] = f_array[1].replace(x, alias);
            dependencies[1] = dependencies[1].replace(x, alias);
        }

        var f = new Function(args,  (dependencies[1] || '') + f_array[1] + ' return ' + f_array[0] + ';');

        return f;
    }
};
