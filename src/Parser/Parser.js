import {Collection} from './Collection';
import {Slice} from './Slice';
import {Token} from './Token';
import {Trig} from '../Functions/Trig';
import {TrigHyperbolic} from '../Functions/Trig.hyperbolic';
import {bigConvert, Symbol, symfunction} from '../Types/Symbol';
import {Settings} from '../Settings';
import {RPN} from './RPN';
import {allNumbers, block, format, isArray, isSymbol, validateName} from '../Core/Utils';
import {Groups} from '../Types/Groups';
import {LaTeX} from '../LaTeX/LaTeX';
import {Vector} from '../Types/Vector';
import {err, NerdamerValueError} from '../Core/Errors';
import {
    abs,
    add,
    arg,
    cbrt,
    conjugate,
    divide,
    imagpart,
    log, mod,
    multiply,
    nthroot, pow,
    rationalize, realpart,
    round, sqrt, subtract
} from '../Functions/Core';
import {expand} from '../Functions/Core/math/expand';
import {OperatorDescriptor} from '../Providers/OperatorDictionary';
import {ParseDeps} from './Parser';

//Uses modified Shunting-yard algorithm. http://en.wikipedia.org/wiki/Shunting-yard_algorithm
export class Parser {
    // exports for back compatibility
    classes = {
        Collection,
        Slice,
        Token
    };
    trig = Trig;
    trigh = TrigHyperbolic;
    error = err;
    symfunction = symfunction;

    // dependencies
    /** @property {Tokenizer} tokenizer */
    tokenizer
    /** @property {OperatorDictionary} operators */
    operators;
    /** @property {FunctionProvider} functionProvider */
    functionProvider;
    /** @property {VariableDictionary} variables */
    variables;
    bin = {};

    constructor(tokenizer, operators, functionProvider, variables, peekers, units) {
        this.tokenizer = tokenizer;
        this.operators = operators;
        this.functionProvider = functionProvider;
        this.variables = variables;
        this.peekers = peekers;
        this.units = units;

        operators.injectOperatorsDeps({
            registerOperator: (name, operation) => this.setAction(name, operation)
        });
    }

    getAction(name) {
        // return this.actions[name];
        return this[name];
    }
    setAction(name, func) {
        // this.actions[name] = func;
        this[name] = func;
    }

    setOperator(operator, action = undefined, shift = undefined) {
        this.operators.setOperator(operator, action, shift)
    }

    //delay setting of constants until Settings is ready
    initConstants() {
        this.variables.setConstant('E', new Symbol(Settings.E));
        this.variables.setConstant('PI', new Symbol(Settings.PI));
    }

    parse(e, substitutions = {}) {
        let tokens = this.tokenizer.tokenize(e, true);

        let rpn = this.toRPN(tokens);
        return this.parseRPN(rpn, substitutions);
    }


    /**
     * Tokenizes the string
     * @param {String} e
     * @returns {Token[]}
     */
    tokenize(e) {
        return this.tokenizer.tokenize(e, false);
    }

    /**
     * Puts token array in Reverse Polish Notation
     * @param {Token[]} tokens
     * @returns {Token[]}
     */
    toRPN(tokens) {
        return RPN.TokensToRPN(tokens);
    }

    /**
     * Parses the tokens
     * @param {Token[]} rpn
     * @param {object} substitutions
     * @returns {Symbol}
     */
    parseRPN(rpn, substitutions) {
        let rpnDeps = {
            callfunction: (...args) => this.callfunction(...args),
            getAction: (action) => {
                return this.getAction(action).bind(this)
            }
        };
        let rpnParser = new RPN(rpnDeps, this.variables, this.peekers);
        return rpnParser.parseRPN(rpn, substitutions);
    }

    /**
     * This method is supposed to behave similarly to the override method but it does not override
     * the existing function rather it only extends it
     * @param {String} what
     * @param {Function} with_what
     * @param {boolean} force_call
     */
    extend(what, with_what, force_call) {
        let extended = this.getAction(what);
        if (typeof extended === 'function' && typeof with_what === 'function') {
            let f = extended;
            this.setAction(what, (a, b) => {
                if (isSymbol(a) && isSymbol(b) && !force_call) {
                    return f.call(this, a, b);
                }
                else {
                    return with_what.call(this, a, b, f);
                }
            });
        }
    }

    /**
     * This method gives the ability to override operators with new methods.
     * @param {String} which
     * @param {Function} with_what
     */
    override(which, with_what) {
        if (!this.bin[which]) {
            this.bin[which] = [];
        }
        this.bin[which].push(this[which]);
        this[which] = with_what;
    }

    /**
     * Restores a previously overridden operator
     * @param {String} what
     */
    restore(what) {
        if (this[what]) {
            this[what] = this.bin[what].pop();
        }
    }

    clean(symbol) {
        // handle functions with numeric values
        // handle denominator within denominator
        // handle trig simplifications
        let g = symbol.group, retval;
        //Now let's get to work
        if (g === Groups.CP) {
            let num = symbol.getNum(),
                den = symbol.getDenom() || new Symbol(1),
                p = Number(symbol.power),
                factor = new Symbol(1);
            if (Math.abs(p) === 1) {
                den.each(x => {
                    if (x.group === Groups.CB) {
                        factor = multiply(factor, this.clean(x.getDenom()));
                    }
                    else if (x.power.lessThan(0)) {
                        factor = multiply(factor, this.clean(x.clone().toUnitMultiplier()));
                    }
                });

                let new_den = new Symbol(0);
                //now divide out the factor and add to new den
                den.each(function (x) {
                    new_den = add(divide(x, factor.clone()), new_den);
                });

                factor.invert(); //invert so it can be added to the top
                let new_num;
                if (num.isComposite()) {
                    new_num = new Symbol(0);
                    num.each(x => {
                        new_num = add(multiply(this.clean(x), factor.clone()), new_num);
                    });
                }
                else
                    new_num = multiply(factor, num);

                retval = divide(new_num, new_den);
            }
        }
        else if (g === Groups.CB) {
            retval = new Symbol(1);
            symbol.each(x => {
                retval = multiply(retval, this.clean(x));
            });
        }
        else if (g === Groups.FN) {
            if (symbol.args.length === 1 && symbol.args[0].isConstant())
                retval = block('PARSE2NUMBER', () => {
                    return this.parse(symbol);
                }, true);
        }

        if (!retval)
            retval = symbol;

        return retval;
    }


    /**
     * An internal function call for the Parser. This will either trigger a real
     * function call if it can do so or just return a symbolic representation of the
     * function using symfunction.
     * @param {String} fn_name
     * @param {Array} args
     * @param {int} allowed_args
     * @returns {Symbol}
     */
    callfunction(fn_name, args, allowed_args = undefined) {
        let fn_settings = this.functionProvider.getFunctionDescriptor(fn_name);

        if (!fn_settings)
            err('Nerdamer currently does not support the function ' + fn_name);

        let num_allowed_args = fn_settings[1] || allowed_args, //get the number of allowed arguments
            fn = fn_settings[0], //get the mapped function
            retval;
        //We want to be able to call apply on the arguments or create a symfunction. Both require
        //an array so make sure to wrap the argument in an array.
        if (!(args instanceof Array))
            args = args !== undefined ? [args] : [];

        if (num_allowed_args !== -1) {
            let is_array = isArray(num_allowed_args),
                min_args = is_array ? num_allowed_args[0] : num_allowed_args,
                max_args = is_array ? num_allowed_args[1] : num_allowed_args,
                num_args = args.length;

            let error_msg = fn_name + ' requires a {0} of {1} arguments. {2} provided!';

            if (num_args < min_args)
                err(format(error_msg, 'minimum', min_args, num_args));
            if (num_args > max_args)
                err(format(error_msg, 'maximum', max_args, num_args));
        }

        /*
         * The following are very important to the how nerdamer constructs functions!
         * Assumption 1 - if fn is undefined then handling of the function is purely numeric. This
         *     enables us to reuse Math, Math2, ..., any function from Settings.FUNCTIONS_MODULES entry
         * Assumption 2 - if fn is defined then that function takes care of EVERYTHING including symbolics
         * Assumption 3 - if the user calls symbolics on a function that returns a numeric value then
         *     they are expecting a symbolic output.
         */
        //check if arguments are all numers
        let numericArgs = allNumbers(args);
        //Big number support. Check if Big number is requested and the arguments are all numeric and, not imaginary
        //            if (Settings.USE_BIG && numericArgs) {
        //                retval = Big[fn_name].apply(undefined, args);
        //            }
        //            else {
        if (!fn) {
            //Remember assumption 1. No function defined so it MUST be numeric in nature
            fn = this.functionProvider.findFunction(fn_name);
            if (Settings.PARSE2NUMBER && numericArgs)
                retval = bigConvert(fn.apply(fn, args));
            else
                retval = symfunction(fn_name, args);
        }
        else {
            //Remember assumption 2. The function is defined so it MUST handle all aspects including numeric values
            let thisArg = fn_settings[2] || {};
            thisArg.parser = this;
            retval = fn.apply(thisArg, args);
        }
        //            }

        return retval;
    };

    //TODO: Utilize the function below instead of the linked function
    getFunction(name) {
        return this.functionProvider.getFunctionDescriptors(name)[0];
    }



    /**
     * TODO: Switch to Parser.tokenize for this method
     * Reads a string into an array of Symbols and operators
     * @param {String} expression_string
     * @returns {Array}
     */
    toObject(expression_string) {
        let objectify = (tokens) => {
            let output = [];
            for (let i = 0, l = tokens.length; i < l; i++) {
                let token = tokens[i];
                let v = token.value;
                if (token.type === Token.VARIABLE_OR_LITERAL) {
                    output.push(new Symbol(v));
                }
                else if (token.type === Token.FUNCTION) {
                    //jump ahead since the next object are the arguments
                    i++;
                    //create a symbolic function and stick it on output
                    let f = symfunction(v, objectify(tokens[i]));
                    f.isConversion = true;
                    output.push(f);
                }
                else if (token.type === Token.OPERATOR) {
                    output.push(v);
                }
                else {
                    output.push(objectify(token));
                }
            }

            return output;
        };

        return objectify(this.tokenize(expression_string));
    }

    // private
    remove_redundant_powers = function (arr) {
        // The filtered array
        let narr = [];

        while (arr.length) {
            // Remove the element from the front
            let e = arr.shift();
            let next = arr[0];
            let next_is_array = isArray(next);
            let next_is_minus = next === '-';

            // Remove redundant plusses
            if (e === '^') {
                if (next === '+') {
                    arr.shift();
                }
                else if (next_is_array && next[0] === '+') {
                    next.shift();
                }

                // Remove redundant parentheses
                if (next_is_array && next.length === 1) {
                    arr.unshift(arr.shift()[0]);
                }
            }

            // Check if it's a negative power
            if (e === '^' && (next_is_array && next[0] === '-' || next_is_minus)) {
                // If so:
                // - Remove it from the new array, place a one and a division sign in that array and put it back
                let last = narr.pop();
                // Check if it's something multiplied by
                let before = narr[narr.length - 1];
                let before_last = '1';

                if (before === '*') {
                    narr.pop();
                    // For simplicity we just pop it.
                    before_last = narr.pop();
                }
                // Implied multiplication
                else if (isArray(before)) {
                    before_last = narr.pop();
                }

                narr.push(before_last, '/', last, e);

                // Remove the negative sign from the power
                if (next_is_array) {
                    next.shift();
                }
                else {
                    arr.shift();
                }

                // Remove it from the array so we don't end up with redundant parentheses if we can
                if (next_is_array && next.length === 1) {
                    narr.push(arr.shift()[0]);
                }
            }
            else {
                narr.push(e);
            }
        }

        return narr;
    }


    // A helper method for toTeX
    // private
    chunkAtCommas(arr) {
        let chunks = [[]];
        for (let j = 0, k = 0, l = arr.length; j < l; j++) {
            if (arr[j] === ',') {
                k++;
                chunks[k] = [];
            }
            else {
                chunks[k].push(arr[j]);
            }
        }
        return chunks;
    }


    // Helper method for toTeX
    // private
    rem_brackets(str) {
        return str.replace(/^\\left\((.+)\\right\)$/g, function (str, a) {
            if (a) {
                return a;
            }
            return str;
        })
    }


    /**
     * Convert expression or object to LaTeX
     * @param {string} expression_or_obj
     * @param {ConvertToLaTeXOptions} opt
     * @returns {string}
     */
    toTeX(expression_or_obj, opt) {
        opt = opt || {};
        // Add decimal option as per issue #579. Consider passing an object to Latex.latex as option instead of string
        let decimals = opt.decimals === true ? 'decimals' : undefined;

        let obj = typeof expression_or_obj === 'string' ? this.toObject(expression_or_obj) : expression_or_obj,
            TeX = [],
            cdot = typeof opt.cdot === 'undefined' ? '\\cdot' : opt.cdot; //set omit cdot to true by default

        // Remove negative powers as per issue #570
        obj = this.remove_redundant_powers(obj);

        if (isArray(obj)) {
            let nobj = [], a, b;
            //first handle ^
            for (let i = 0; i < obj.length; i++) {
                a = obj[i];

                if (obj[i + 1] === '^') {
                    b = obj[i + 2];
                    nobj.push(LaTeX.braces(this.toTeX([a])) + '^' + LaTeX.braces(this.toTeX([b])));
                    i += 2;
                }
                else {
                    nobj.push(a);
                }
            }
            obj = nobj;
        }

        for (let i = 0, l = obj.length; i < l; i++) {
            let e = obj[i];

            // Convert * to cdot
            if (e === '*') {
                e = cdot;
            }

            if (isSymbol(e)) {
                if (e.group === Groups.FN) {
                    let fname = e.fname, f;

                    if (fname === Settings.SQRT)
                        f = '\\sqrt' + LaTeX.braces(this.toTeX(e.args));
                    else if (fname === Settings.ABS)
                        f = LaTeX.brackets(this.toTeX(e.args), 'abs');
                    else if (fname === Settings.PARENTHESIS)
                        f = LaTeX.brackets(this.toTeX(e.args), 'parens');
                    else if (fname === Settings.LOG10) {
                        f = '\\' + Settings.LOG10_LATEX + '\\left( ' + this.toTeX(e.args) + '\\right)';
                    }
                    else if (fname === 'integrate') {
                        /* Retrive [Expression, x] */
                        let chunks = this.chunkAtCommas(e.args);
                        /* Build TeX */
                        let expr = LaTeX.braces(this.toTeX(chunks[0])),
                            dx = this.toTeX(chunks[1]);
                        f = '\\int ' + expr + '\\, d' + dx;
                    }
                    else if (fname === 'defint') {
                        let chunks = this.chunkAtCommas(e.args),
                            expr = LaTeX.braces(this.toTeX(chunks[0])),
                            dx = this.toTeX(chunks[3]),
                            lb = this.toTeX(chunks[1]),
                            ub = this.toTeX(chunks[2]);
                        f = '\\int\\limits_{' + lb + '}^{' + ub + '} ' + expr + '\\, d' + dx;

                    }
                    else if (fname === 'diff') {
                        let chunks = this.chunkAtCommas(e.args);
                        let dx = '', expr = LaTeX.braces(this.toTeX(chunks[0]));
                        /* Handle cases: one argument provided, we need to guess the variable, and assume n = 1 */
                        if (chunks.length === 1) {
                            let vars = [];
                            for (let j = 0; j < chunks[0].length; j++) {
                                if (chunks[0][j].group === 3) {
                                    vars.push(chunks[0][j].value);
                                }
                            }
                            vars.sort();
                            dx = vars.length > 0 ? ('\\frac{d}{d ' + vars[0] + '}') : '\\frac{d}{d x}';
                        }
                        /* If two arguments, we have expression and variable, we assume n = 1 */
                        else if (chunks.length === 2) {
                            dx = '\\frac{d}{d ' + chunks[1] + '}';
                        }
                        /* If we have more than 2 arguments, we assume we've got everything */
                        else {
                            dx = '\\frac{d^{' + chunks[2] + '}}{d ' + this.toTeX(chunks[1]) + '^{' + chunks[2] + '}}';
                        }

                        f = dx + '\\left(' + expr + '\\right)';

                    }
                    else if (fname === 'sum' || fname === 'product') {
                        // Split e.args into 4 parts based on locations of , symbols.
                        let argSplit = [[], [], [], []], j = 0, i;
                        for (i = 0; i < e.args.length; i++) {
                            if (e.args[i] === ',') {
                                j++;
                                continue;
                            }
                            argSplit[j].push(e.args[i]);
                        }
                        // Then build TeX string.
                        f = (fname === 'sum' ? '\\sum_' : '\\prod_') + LaTeX.braces(this.toTeX(argSplit[1]) + ' = ' + this.toTeX(argSplit[2]));
                        f += '^' + LaTeX.braces(this.toTeX(argSplit[3])) + LaTeX.braces(this.toTeX(argSplit[0]));
                    }
                    else if (fname === 'limit') {
                        let args = this.chunkAtCommas(e.args).map(x => {
                            if (Array.isArray(x))
                                return this.toTeX(x.join(''));
                            return this.toTeX(String(x));
                        });
                        f = '\\lim_' + LaTeX.braces(args[1] + '\\to ' + args[2]) + ' ' + LaTeX.braces(args[0]);
                    }
                    else if (fname === Settings.FACTORIAL || fname === Settings.DOUBLEFACTORIAL)
                        f = this.toTeX(e.args) + (fname === Settings.FACTORIAL ? '!' : '!!');
                    else {

                        f = LaTeX.latex(e, decimals);
                        //f = '\\mathrm'+LaTeX.braces(fname.replace(/_/g, '\\_')) + LaTeX.brackets(this.toTeX(e.args), 'parens');
                    }

                    TeX.push(f);
                }
                else {
                    TeX.push(LaTeX.latex(e, decimals));
                }
            }
            else if (isArray(e)) {
                TeX.push(LaTeX.brackets(this.toTeX(e)));
            }
            else {
                if (e === '/')
                    TeX.push(LaTeX.frac(this.rem_brackets(TeX.pop()), this.rem_brackets(this.toTeX([obj[++i]]))));
                else
                    TeX.push(e);
            }
        }

        return TeX.join(' ');
    };


    isOperator(name) {
        return this.operators.isOperator()
    }

    getOperatorsClass() {
        return this.operators;
    }

    getBrackets() {
        return this.operators.getBrackets();
    }

    get functions() {
        return this.getFunctions();
    }
    getFunctions() {
        return this.functionProvider.getFunctionDescriptors()
    }

    getFunctionProvider() {
        return this.functionProvider
    }


    // Gets called when the parser finds the , operator.
    // Commas return a Collector object which is roughly an array
    comma(a, b) {
        if (!(a instanceof Collection))
            a = Collection.create(a);
        a.append(b);
        return a;
    }

    // Used to slice elements from arrays
    slice(a, b) {
        return new Slice(a, b);
    }

    // The equality setter
    equals(a, b) {
        // Equality can only be set for group S so complain it's not
        if (a.group !== Groups.S && !a.isLinear()) {
            err('Cannot set equality for ' + a.toString());
        }
        this.variables.setVar(a.value, b.clone());
        return b;
    }

    // Percent
    percent(a) {
        return divide(a, new Symbol(100));
    }

    // Set variable
    assign(a, b) {
        if (a instanceof Collection && b instanceof Collection) {
            a.elements.map((x, i) => {
                return this.assign(x, b.elements[i]);
            });
            return Vector.fromArray(b.elements);
        }
        if (a.parent) {
            // It's referring to the parent instead. The current item can be discarded
            let e = a.parent;
            e.elements[e.getter] = b;
            delete e.getter;
            return e;
        }

        if (a.group !== Groups.S) {
            throw new NerdamerValueError('Cannot complete operation. Incorrect LH value for ' + a);
        }

        this.variables.setVar(a.value, b);
        return b;
    }

    function_assign(a, b) {
        let f = a.elements.pop();
        return this.setFunction(f, a.elements, b);
    }

    // Function to quickly convert bools to Symbols
    bool2Symbol(x) {
        return new Symbol(x === true ? 1 : 0);
    }

    //check for equality
    eq(a, b) {
        return this.bool2Symbol(a.equals(b));
    }

    //checks for greater than
    gt(a, b) {
        return this.bool2Symbol(a.gt(b));
    }

    //checks for greater than equal
    gte(a, b) {
        return this.bool2Symbol(a.gte(b));
    }

    //checks for less than
    lt(a, b) {
        return this.bool2Symbol(a.lt(b));
    }

    //checks for less than equal
    lte(a, b) {
        return this.bool2Symbol(a.lte(b));
    }

    // wraps the factorial
    factorial(a) {
        return symfunction(Settings.FACTORIAL, [a]);
    }

    // wraps the double factorial
    dfactorial(a) {
        return symfunction(Settings.DOUBLEFACTORIAL, [a]);
    }


    //Link the functions to the parse so they're available outside of the library.
    //This is strictly for convenience and may be deprecated.
    expand(symbol, opt = undefined) {
        return expand(symbol, opt);
    }

    round(x, s) {
        return round(x, s);
    }

    cbrt(symbol) {
        return cbrt(symbol);
    }

    abs(symbol) {
        return abs(symbol);
    }

    log(symbol, base) {
        return log(symbol, base);
    }

    rationalize(symbol) {
        return rationalize(symbol);
    }

    nthroot(num, p, prec, asbig) {
        return nthroot(num, p, prec, asbig);
    }

    arg(symbol) {
        return arg(symbol);
    }

    conjugate(symbol) {
        return conjugate(symbol);
    }

    imagpart(symbol) {
        return imagpart(symbol);
    }

    realpart(symbol) {
        return realpart(symbol);
    }

    sqrt(symbol) {
        return sqrt(symbol);
    }

    multiply(a, b) {
        return multiply(a, b);
    }

    divide(a, b) {
        return divide(a, b);
    }

    subtract(a, b) {
        return subtract(a, b);
    }

    add(a, b) {
        return add(a, b);
    }

    pow(a, b) {
        return pow(a, b);
    }

    mod(symbol1, symbol2) {
        return mod(symbol1, symbol2);
    }

    tree(expression) {
        let tokens = this.tokenize(expression)
        tokens = this.toRPN(tokens)

        return this.tokenizer.tree(tokens);
    }

    setFunction(name, params_array, body) {
        validateName(name);
        if (!this.variables.isReserved(name)) {
            params_array = params_array || this.parse(body).variables();
            // The function gets set to PARSER.mapped function which is just
            // a generic function call.

            //The loader for functions which are not part of Math2
            const mapped_function = function () {
                let subs = {},
                    params = this.params;

                for (let i = 0; i < params.length; i++) {
                    subs[params[i]] = String(arguments[i]);
                }

                return this.parser.parse(this.body, subs);
            }

            this.functionProvider.setFunctionDescriptor(
                name,
                [mapped_function, params_array.length, {
                    name: name,
                    params: params_array,
                    body: body
                }]
            );
            return body;
        }
        return null;
    };

}

// type ParseDepsType = {
//     parser: Parser | null;
// }
/**
 *
 * @type {{parser: Parser}}
 */
export const ParseDeps = {
    parser: null
};

/**
 *
 * @param {string | Symbol} e
 * @param {object} substitutions
 * @return {*}
 */
export function parse(e, substitutions = {}) {
    return ParseDeps.parser.parse(e, substitutions);
}

/**
 * As the name states. It forces evaluation of the expression
 * @param {string} expression
 * @param {Symbol} o
 * @deprecated use Utils.evaluate instead
 */
export function evaluate(expression, o = undefined) {
    return block('PARSE2NUMBER', function () {
        return parse(expression, o);
    }, true);
}