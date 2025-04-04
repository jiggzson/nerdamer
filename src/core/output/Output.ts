import { Parser } from "../classes/parser/operations";
import { Expression } from "../classes/parser/operations";
import { OptionsObject } from "../classes/parser/types";
import { SQRT, ABS, FACTORIAL, DOUBLE_FACTORIAL, WRAP } from "../classes/parser/constants";
import { COS, SIN, TAN } from "../../math/trig";
import { __ } from "../errors";

class TypedArray extends Array {
    type?: string;
}

export type FracArray = [string, string];

//The latex generator
export const Output = {
    parser: Parser.create(),
    space: '~',
    dot: ' \\cdot ',
    mode: '',
    modes: ['text', 'TeX'],
    left: '',
    right: '',
    setMode: function (mode: string) {
        if (!this.modes.includes(mode)) {
            throw new Error(__('unrecognizedMode', { mode: mode }));
        }
        // Set the mode
        this.mode = mode;
        if (mode === 'string') {
            this.dot = '*';
            this.left = '';
            this.right = '';
        }
        else {
            this.dot = ' \\cdot ';
            this.left = '\\left';
            this.right = '\\right';
        }
    },
    // grab a list of supported functions but remove the excluded ones found in exclFN

    /**
     * An overview:
     * This function first places the multiplier in numerator/denominator form. It then
     * combs through the remainder of the expression and collects terms. If the term has
     * a negative power then it gets places in the denominator. All else goes to the numerator.
     * Sum functions (GRP and CMP) are either fully in the numerator or the denominator.
     * To illustrate consider (1/2)*x+5*x^-2 which becomes x/2+5/x^2. The only expression
     * which would have symbolic functions in both numerator and denominator would be a CMB.
     * For example: (x+1)*(a+b)^-1
     * 
     * @param input 
     * @param options 
     * @returns 
     */
    stringify: function (input: Expression | Expression[], options?: OptionsObject) {

        if (Array.isArray(input)) {
            const OutputArray: string[] = [];
            for (let i = 0; i < input.length; i++) {
                const sym = input[i];
                OutputArray.push(this.stringify(sym, options));
            }
            return this.brackets(OutputArray.join(', '), 'square');
        }

        const decimal = !!options?.decimal;
        const hasPower = input.power;
        const power = input.getPower();
        const invert = power.getMultiplier().isNegative();
        const negative = input.getMultiplier().isNegative();
        const symbol = new Expression(input);

        symbol.multiplier = symbol.getMultiplier().abs();

        // if the user wants the result in decimal format then return it as such by placing it at the top part
        const m = symbol.getMultiplier();
        const mArray: FracArray = ['', ''];

        if (decimal) {
            // If it's as a decimal then the TeX goes only the to numerator with a blank denominator
            mArray[0] = symbol.getMultiplier().toDecimalString();
        }
        else {
            mArray[0] = String(m.numerator);
            mArray[1] = String(m.denominator);
        }

        // Get the value as a two part array
        const vArray: FracArray = this.value(symbol, invert, options, negative);

        let p;
        // Make it all positive since we know whether to push the power to the numerator or denominator already from the invert value.
        if (invert) {
            power.multiplier = power.getMultiplier().neg();
        }

        // If the power is one or if the power is zero and it's a number, then the power's empty
        // and we can just return a blank string. The exception is when explicit powers is passed in.
        if (power.isOne() || symbol.isNUM() && power.isZero()) {
            if (options?.explicitPowers && hasPower) {
                p = power.toString();
            }
            else {
                p = ''
            }
        }
        // Otherwise just get the latex representation of the power
        else {
            p = this.stringify(power, options);
        }

        // Use this array to specify if the power is getting attached to the top or the bottom
        const pArray: FracArray = ['', ''];
        // Stick it to the top or the bottom. If it's negative then the power gets placed on the bottom
        pArray[invert ? 1 : 0] = p;

        // special case group P and decimal
        const retval = (negative ? '-' : '') + this.set(mArray, vArray, pArray, symbol.isProduct());

        return retval.replace(/\+-/gi, '-');

    },
    // greek mapping
    greek: [
        'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
        'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omnikron', 'pi', 'rho', 'sigma',
        'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Epsilon',
        'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega'
    ],
    symbols: [
        'arccos', 'cos', 'csc', 'exp', 'ker', 'limsup', 'min', 'sinh', 'arcsin',
        'cosh', 'deg', 'gcd', 'lg', 'ln', 'Pr', 'sqrt', 'sup', 'arctan', 'cot',
        'det', 'hom', 'lim', 'log', 'LN', 'sec', 'tan', 'arg', 'coth', 'dim',
        'inf', 'liminf', 'max', 'sin', 'tanh'
    ],
    // get the raw value of the symbol as an array
    value: function (symbol: Expression, inverted: boolean, options?: OptionsObject, negative?: boolean) {
        const v: FracArray = ['', ''];
        const index = inverted ? 1 : 0;

        // Don't do any processing for NUM
        if (!symbol.isNUM()) {
            if (symbol.isInf()) {
                v[index] = '\\infty';
            }
            else if (!(symbol.components || symbol.args)) {
                let value = this.formatSubscripts(symbol.value);

                // if(value.replace) {
                //     value = value.replace(/(.+)_$/, '$1\\_');
                // }

                // split it so we can check for instances of alpha as well as alpha_b
                const tVArray = String(value).split('_');
                // const greek = this.greek[tVArray[0]];
                if (this.greek.includes(tVArray[0])) {
                    tVArray[0] = `\\${tVArray[0]}`;
                    value = tVArray.join('_');
                }

                v[index] = value;
            }
            else if (symbol.isFunction()) {
                v[index] = this.getFnTeX(symbol, options)
            }
            else if (symbol.isSum()) {
                const collected = symbol.componentsArray();
                const symbols: string[] = [];
                const l = collected.length;
                for (let i = 0; i < l; i++) {
                    symbols.push(Output.stringify(collected[i], options));
                }
                const value = symbols.join('+');

                v[index] = !(symbol.getPower().isOne() && symbol.getMultiplier().isOne()) || negative ? this.brackets(value, 'parens') : value;
            }
            else if (symbol.isProduct()) {

                const denominator: string[] = [];
                const numerator: string[] = [];
                // Generate a profile
                const denMap: number[] = [];
                const numMap: number[] = [];
                const components = symbol.getComponents();
                const m = symbol.getMultiplier();

                for (const x in components) {
                    let component = components[x];
                    // If the component is a wrap function then we should be dealing with internal element
                    if (component.isFunction(WRAP)) {
                        component = component.getArguments()[0];
                    }

                    const isDenom = component.getPower().getMultiplier().isNegative();


                    // TODO: This needs to be refactored since it's repeated code.
                    if (isDenom) {
                        Output.setComponentTeX(component.invert(), m.denominator, denMap, denominator, options);
                    }
                    else {
                        Output.setComponentTeX(component, m.numerator, numMap, numerator, options);
                    }
                }

                // Apply brackets
                // setBrackets(numerator, numMap, numC);
                v[0] = numerator.join(this.dot); // collapse the numerator into one string

                // setBrackets(denominator, denMap, denC);
                v[1] = denominator.join(this.dot);
            }
        }

        return v;
    },
    set: function (m: FracArray, v: FracArray, p: FracArray, combinePower) {
        let tp;
        const isBracketed = function (v) {
            return /^\\left\(.+\\right\)$/.test(v);
        };
        // format the power if it exists
        if (p) {
            p = this.formatP(p);
        }

        // group CB will have to be wrapped since the power applies to both it's numerator and denominator
        if (combinePower) {
            // POSSIBLE BUG: If powers for group CB format wrong, investigate this since I might have overlooked something
            // the assumption is that in every case the denonimator should be empty when dealing with CB. I can't think
            // of a case where this isn't true
            tp = p[0];
            p[0] = ''; // temporarily make p blank
        }

        // merge v and p. Not that v MUST be first since the order matters
        v = this.merge(v, p);
        let mn = m[0];
        let md = m[1];
        const vn = v[0];
        const vd = v[1];
        // filters
        // if the top has a variable but the numerator is one drop it
        if (vn && Number(mn) === 1) {
            mn = '';
        }

        // if denominator is 1 drop it always
        if (Number(md) === 1) {
            md = '';
        }

        // prepare the top portion but check that it's not already bracketed. If it is then leave out the cdot
        const top = this.join(mn, vn, !isBracketed(vn) ? this.dot : '');

        // prepare the bottom portion but check that it's not already bracketed. If it is then leave out the cdot
        const bottom = this.join(md, vd, !isBracketed(vd) ? this.dot : '');
        // format the power if it exists
        // make it a fraction if both top and bottom exists
        if (top && bottom) {
            let frac = this.frac(top, bottom);
            if (combinePower && tp) {
                frac = this.brackets(frac) + tp;
            }

            return frac;
        }
        // otherwise only the top exists so return that
        else
            return top;
    },
    merge: function (a: string[], b: string[]) {
        const r: FracArray = ['', ''];
        for (let i = 0; i < 2; i++) {
            r[i] = a[i] + b[i];
        }
        return r;
    },
    // joins together two strings if both exist
    join: function (n, d, glue) {
        if (!n && !d)
            return '';
        if (n && !d)
            return n;
        if (d && !n)
            return d;
        return n + glue + d;
    },

    /**
     * Places subscripts in braces for proper formatting, e.g. x_2x becomes x_{2x}
     * 
     * @param v The value being formatted
     * @returns 
     */
    formatSubscripts: function (v: string) {
        // Split it at the underscore
        const arr = v.toString().split('_');

        let name = '';

        // Loop over all entries except the first one
        while (arr.length > 1) {
            // Wrap all in braces except for the last one
            if (arr.length > 0) {
                name = '_' + this.braces(arr.pop() + name);
            }
        }

        return arr[0] + name;
    },
    formatP: function (pArray) {
        for (let i = 0; i < 2; i++) {
            const p = pArray[i];
            if (p)
                pArray[i] = '^' + this.braces(p);
        }
        return pArray;
    },
    /**
     * formats the fractions accordingly.
     * @param {Frac} f
     * @param {bool} is_pow
     */
    formatFrac: function (f, is_pow) {
        const n = f.num.toString();
        const d = f.den.toString();
        // no need to have x^1
        if (is_pow && n === '1' && d === '1')
            return '';
        // no need to have x/1
        if (d === '1')
            return n;
        return this.frac(n, d);
    },
    frac: function (n: string, d: string) {
        if (this.mode === 'TeX') {
            return '\\frac' + this.braces(n) + this.braces(d);
        }
        return `${n}/${d}`;
    },
    braces: function (e) {
        return '{' + e + '}';
    },
    brackets: function (e: string, typ: string = 'parens') {
        const bracketTypes = {
            parens: ['(', ')'],
            square: ['[', ']'],
            brace: ['{', '}'],
            abs: ['|', '|'],
            angle: ['\\langle', '\\rangle']
        };

        const bracket = bracketTypes[typ];
        if (this.mode === 'text') {
            if (typ === 'angle') {
                return `< ${e} >`;
            }
            return bracket[0] + e + bracket[1];
        }
        return '\\left' + bracket[0] + e + '\\right' + bracket[1];
    },
    /**
     * Removes extraneous tokens
     * @param {Tokens[]} tokens
     * @returns {Tokens[]}
     */
    filterTokens: function (tokens: TypedArray) {
        const filtered = new TypedArray();

        // Copy over the type of the scope
        if (Array.isArray(tokens)) {
            filtered.type = tokens.type;
        }

        // the items that need to be disposed
        const d = ['\\', 'left', 'right', 'big', 'Big', 'large', 'Large'];
        for (let i = 0, l = tokens.length; i < l; i++) {
            const token = tokens[i];
            const nextToken = tokens[i + 1];
            if (token.value === '\\' && nextToken.value === '\\') {
                filtered.push(token);
            }
            else if (Array.isArray(token)) {
                filtered.push(Output.filterTokens(token));
            }
            else if (d.indexOf(token.value) === -1) {
                filtered.push(token);
            }
        }
        return filtered;
    },
    setComponentTeX: function (component: Expression, part: bigint, map: number[], container: string[], options?: OptionsObject) {
        let TeX = Output.stringify(component, options);

        // denC++;
        if (component.isSum()) {
            if (part !== 1n && component.getPower().signFree().isOne()) {
                TeX = Output.brackets(TeX, 'parens');
            }

            map.push(container.length); // make a note of where the composite was found
        }

        container.push(TeX);
    },
    getFnTeX: function (symbol: Expression, options?: OptionsObject) {
        const name = symbol.name!;
        let retval: string;

        const output: string[] = [];

        // collect the arguments
        const args = symbol.getArguments();
        for (let i = 0; i < args.length; i++) {
            output.push(this.stringify(args[i], options));
        }

        switch (name) {
            case SQRT:
            case COS:
            case SIN:
            case TAN: {
                retval = '\\' + name + this.brackets(output[0]);
                break;
            }
            case ABS: {
                retval = this.brackets(output[0], 'abs');
                break;
            }
            case FACTORIAL:
            case DOUBLE_FACTORIAL: {
                const arg = args[0];
                if (arg.getPower().isOne() && (arg.isSum() || arg.isProduct())) {
                    output[0] = this.brackets(output[0]);
                }
                retval = output[0] + (name === FACTORIAL ? '!' : '!!');
                break;
            }
            case WRAP: {
                // Just unwrap it.
                retval = output[0];
                break;
            }
            default: {
                retval = '\\mathrm' + this.braces(name.replace(/_/g, '\\_'));
                retval = retval + this.brackets(output.join(','), 'parens');
            }
        }
        // if(fname === SQRT) {
        //     v[index] = '\\sqrt' + this.braces(output.join(','));
        // }
        // else if(fname === ABS) {
        //     v[index] = this.brackets(output.join(','), 'abs');
        // }
        // // else if(fname === PARENTHESIS) {
        // //     v[index] = this.brackets(output.join(','), 'parens');
        // // }
        // else if(fname === 'limit') {
        //     v[index] = ' \\lim\\limits_{' + output[1] + ' \\to ' + output[2] + '} ' + output[0];
        // }
        // else if(fname === 'integrate') {
        //     v[index] = '\\int' + this.braces(output[0]) + this.braces('d' + output[1]);
        // }
        // else if(fname === 'defint') {
        //     v[index] = '\\int\\limits_' + this.braces(output[1]) + '^' + this.braces(output[2]) + ' ' + output[0] + ' d' + output[3];
        // }
        // else if(fname === FACTORIAL || fname === DOUBLE_FACTORIAL) {
        //     const arg = args[0];
        //     if(arg.getPower().isOne() && (arg.isSum() || arg.isProduct())) {
        //         output[0] = this.brackets(output[0]);
        //     }
        //     v[index] = output[0] + (fname === FACTORIAL ? '!' : '!!');
        // }
        // else if(fname === 'floor') {
        //     v[index] = '\\left \\lfloor' + this.braces(output[0]) + '\\right \\rfloor';
        // }
        // else if(fname === 'ceil') {
        //     v[index] = '\\left \\lceil' + this.braces(output[0]) + '\\right \\rceil';
        // }
        // // capture log(a, b)
        // // else if(fname === Settings.LOG && output.length > 1) {
        // //     v[index] = '\\mathrm' + this.braces(Settings.LOG) + '_' + this.braces(output[1]) + this.brackets(output[0]);
        // // }
        // // capture log(a, b)
        // // else if(fname === Settings.LOG10) {
        // //     v[index] = '\\mathrm' + this.braces(Settings.LOG) + '_' + this.braces(10) + this.brackets(output[0]);
        // // }
        // else if(fname === 'sum') {
        //     const a = output[0];
        //     const b = output[1];
        //     const c = output[2];
        //     const d = output[3];
        //     v[index] = '\\sum\\limits_{' + this.braces(b) + '=' + this.braces(c) + '}^' + this.braces(d) + ' ' + this.braces(a) + '';
        // }
        // else if(fname === 'product') {
        //     const a = output[0];
        //     const b = output[1];
        //     const c = output[2];
        //     const d = output[3];
        //     v[index] = '\\prod\\limits_{' + this.braces(b) + '=' + this.braces(c) + '}^' + this.braces(d) + ' ' + this.braces(a) + '';
        // }
        // else if(fname === 'nthroot') {
        //     v[index] = '\\sqrt[' + output[1] + ']' + this.braces(output[0]);
        // }
        // else if(fname === 'mod') {
        //     v[index] = output[0] + ' \\bmod ' + output[1];
        // }
        // else if(fname === 'realpart') {
        //     v[index] = '\\operatorname{Re}' + this.brackets(output[0]);
        // }
        // else if(fname === 'imagpart') {
        //     v[index] = '\\operatorname{Im}' + this.brackets(output[0]);
        // }
        // else {
        //     const name = fname ? '\\mathrm' + this.braces(fname.replace(/_/g, '\\_')) : '';
        //     v[index] = name + this.brackets(output.join(','), 'parens');
        // }

        return retval;
    },

    init: function () {
        this.setMode('TeX')
    }
    /*
     * Parses tokens from Output string. Does not do any error checking
     * @param {Tokens[]} rpn
     * @returns {String}
     */
    // parse: function (raw_tokens) {
    //     let i, l;
    //     let retval = '';
    //     let tokens = this.filterTokens(raw_tokens);
    //     let replace = {
    //         'cdot': '',
    //         'times': '',
    //         'infty': 'Infinity'
    //     };
    //     // get the next token
    //     let next = function (n) {
    //         return tokens[(typeof n === 'undefined' ? ++i : i += n)];
    //     };
    //     let parse_next = function () {
    //         return Output.parse(next());
    //     };
    //     let get = function (token) {
    //         if(token in replace) {
    //             return replace[token];
    //         }
    //         // A quirk with implicit multiplication forces us to check for *
    //         if(token === '*' && tokens[i + 1].value === '&') {
    //             next(2); // skip this and the &
    //             return ',';
    //         }

    //         if(token === '&') {
    //             next();
    //             return ','; // Skip the *
    //         }
    //         // If it's the end of a row, return the row separator
    //         if(token === '\\') {
    //             return '],[';
    //         }
    //         return token;
    //     };

    //     // start parsing the tokens
    //     for(i = 0, l = tokens.length; i < l; i++) {
    //         let token = tokens[i];
    //         // fractions
    //         if(token.value === 'frac') {
    //             // parse and wrap it in brackets
    //             let n = parse_next();
    //             let d = parse_next();
    //             retval += n + '/' + d;
    //         }
    //         else if(token.value in Output.symbols) {
    //             if(token.value === SQRT && tokens[i + 1].type === 'vector' && tokens[i + 2].type === 'Set') {
    //                 let base = parse_next();
    //                 let expr = parse_next();
    //                 retval += (expr + '^' + inBrackets('1/' + base));
    //             }
    //             else {
    //                 retval += token.value + parse_next();
    //             }
    //         }
    //         else if(token.value === 'int') {
    //             let f = parse_next();
    //             // skip the comma
    //             i++;
    //             // get the variable of integration
    //             let dx = next().value;
    //             dx = get(dx.substring(1, dx.length));
    //             retval += 'integrate' + inBrackets(f + ',' + dx);
    //         }
    //         else if(token.value === 'int_') {
    //             let l = parse_next(); // lower
    //             i++; // skip the ^
    //             let u = next().value; // upper
    //             // if it is in brackets
    //             if (u === undefined) {
    //                 i--;
    //                 let u = parse_next();
    //             }
    //             let f = parse_next(); // function

    //             // get the variable of integration
    //             let dx = next().value;
    //             // skip the comma
    //             if (dx === ',') {
    //                 let dx = next().value;
    //             }
    //             // if 'd', skip
    //             if (dx === 'differentialD') {
    //                 // skip the *
    //                 i++;
    //                 let dx = next().value;
    //             }
    //             if (dx === 'mathrm') {
    //                 // skip the mathrm{d}
    //                 i++;
    //                 let dx = next().value;
    //             }
    //             retval += 'defint' + inBrackets(f + ',' + l + ',' + u + ',' + dx);
    //         }
    //         else if(token.value && token.value.startsWith('int_')) {
    //             // let l = parse_next(); // lower
    //             let l = token.value.replace('int_', '')
    //             console.log('upper_now')
    //             i++; // skip the ^
    //             let u = next().value; // upper
    //             // if it is in brackets
    //             if (u === undefined) {
    //                 i--;
    //                 let u = parse_next();
    //             }
    //             let f = parse_next(); // function

    //             // get the variable of integration
    //             let dx = next().value;
    //             // skip the comma
    //             if (dx === ',') {
    //                 let dx = next().value;
    //             }
    //             // if 'd', skip
    //             if (dx === 'differentialD') {
    //                 // skip the *
    //                 i++;
    //                 let dx = next().value;
    //             }
    //             if (dx === 'mathrm') {
    //                 // skip the mathrm{d}
    //                 i++;
    //                 let dx = next().value;
    //             }
    //             retval += 'defint' + inBrackets(f + ',' + l + ',' + u + ',' + dx);
    //         }
    //         else if(token.value === 'mathrm') {
    //             let f = tokens[++i][0].value;
    //             retval += f + parse_next();
    //         }
    //         // sum and product
    //         else if(token.value === 'sum_' || token.value === 'prod_') {
    //             let fn = token.value === 'sum_' ? 'sum' : 'product';
    //             let nxt = next();
    //             i++; // skip the caret
    //             let end = parse_next();
    //             let f = parse_next();
    //             retval += fn + inBrackets([f, get(nxt[0]), get(nxt[2]), get(end)].join(','));
    //         }
    //         else if(token.value === 'lim_') {
    //             let nxt = next();
    //             retval += 'limit' + inBrackets([parse_next(), get(nxt[0]), get(nxt[2])].join(','));
    //         }
    //         else if(token.value === 'begin') {
    //             let nxt = next();
    //             if(Array.isArray(nxt)) {
    //                 let v = nxt[0].value;
    //                 if(v === 'matrix') {
    //                     // Start a matrix
    //                     retval += 'matrix([';
    //                 }
    //             }
    //         }
    //         else if(token.value === 'end') {
    //             let nxt = next();
    //             if(Array.isArray(nxt)) {
    //                 let v = nxt[0].value;
    //                 if(v === 'matrix') {
    //                     // End a matrix
    //                     retval += '])';
    //                 }
    //             }
    //         }
    //         else {
    //             if(Array.isArray(token)) {
    //                 retval += get(Output.parse(token));
    //             }
    //             else {
    //                 retval += get(token.value.toString());
    //             }
    //         }
    //     }

    //     return inBrackets(retval);
    // }
};

Output.init();