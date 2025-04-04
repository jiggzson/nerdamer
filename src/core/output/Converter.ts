import { Parser, Expression } from "../classes/parser/operations";
import { __ } from "../errors";
import { OptionsObject } from "../classes/parser/types";
import { DOUBLE_FACTORIAL, FACTORIAL, INFINITY, SQRT, WRAP } from "../classes/parser/constants";
import { FracArray } from "./Output";
import { one } from "../classes/expression/shortcuts";

const TeX = 'TeX';
const TEXT = 'text';

export class Converter {
    readonly modes = [TeX, TEXT];

    mode: string = this.modes[0];

    greek: string[] = [
        'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
        'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omnikron', 'pi', 'rho', 'sigma',
        'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'Gamma', 'Delta', 'Epsilon',
        'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega'
    ];

    constructor(mode?: 'TeX' | 'text') {
        if (mode) {
            this.setMode(mode);
        }
    }

    setMode(mode: string) {
        if (!this.modes.includes(mode)) {
            throw new Error(__('unrecognizedMode', { mode: mode }));
        }

        // Set the mode
        this.mode = mode;
    }

    getMultiplicationSymbol() {
        if (this.mode === 'TeX') {
            return ' \\cdot ';
        }
        return '*';
    }

    static strip(input: Expression) {
        const arg = new Expression(input);
        delete arg.power;
        delete arg.multiplier;
        return arg;
    }

    static convertSQRT(input: Expression) {
        return Expression.toFunction(SQRT, [Converter.strip(input)]);
    }

    static convertNtRoot(input: Expression, root: Expression) {
        return Expression.toFunction('nthroot', [Converter.strip(input), root]);
    }

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
    convert(input: Expression | string, options?: OptionsObject) {
        options = Object.assign({}, {
            convertRoots: true
        }, options);

        // Convert to Expression to allow for string input
        input = Expression.toExpression(input);

        // Check if the output is requested as a decimal
        const decimal = !!options?.decimal;
        // True if the value is in the denominator
        let power = input.getPower().signFree();
        const isInverted = input.getPower().getMultiplier().isNegative();

        const isNegative = input.getMultiplier().isNegative();
        // Strip the sign. We already know if it's negative or not
        const m = input.getMultiplier().abs();

        // if the user wants the result in decimal format then return it as such by placing it at the top part
        const multiplierArray: FracArray = ['', ''];

        if (decimal) {
            // If it's as a decimal then the TeX goes only the to numerator with a blank denominator
            multiplierArray[0] = m.toDecimalString();
        }
        else {
            multiplierArray[0] = String(m.numerator);
            multiplierArray[1] = String(m.denominator);
        }

        // Convert roots sqrt, cbrt, etc
        if (options?.convertRoots) {
            const num = power.getNumerator();
            const den = power.getDenominator();
            if (num.isOne() && !power.isOne()) {
                if (this.mode === TEXT && den.eq('2')) {
                    input = Converter.convertSQRT(input);
                    // Remove the power
                    power = one();
                }
                else if (this.mode === TeX) {
                    input = Converter.convertNtRoot(input, den);
                    // Remove the power
                    power = one();
                }
            }
        }

        // Get the value as a two part array
        const valueArray: FracArray = this.value(input, isInverted, isNegative, options);

        // If the power is one or if the power is zero and it's a number, then the power's empty
        // and we can just return a blank string. The exception is when explicit powers is passed in.
        const p = power.isOne() || input.isNUM() && power.isZero() ? '' : this.convert(power, options);
        // Use this array to specify if the power is getting attached to the top or the bottom
        const powerArray: FracArray = ['', ''];
        // Stick it to the top or the bottom. If it's negative then the power gets placed on the bottom.
        // For instance x^-2 will result in a valueArray of ['1', 'x'] and a powerArray of ['', '2']
        powerArray[isInverted ? 1 : 0] = p;

        const retval = (isNegative ? '-' : '') + this.set(multiplierArray, valueArray, powerArray, input);

        return retval.replace(/\+-/gi, '-');
    }

    wrapRoot(value: string, root: string) {
        if (root === '2') {
            return `\\sqrt{${value}}`;
        }
        return `\\sqrt[${root}]{${value}}`;
    }

    value(input: Expression, isInverted: boolean, isNegative: boolean, options?: OptionsObject) {
        const v: FracArray = ['', ''];
        const index = isInverted ? 1 : 0;

        // Don't do any processing for NUM
        if (!input.isNUM()) {
            if (input.isEXP()) {
                const arg = input.getArguments()[0];
                let value = this.convert(arg, options);
                // Wrap it if it not an integer or variable. Don't wrap it if it's a root
                if (!(arg.isInteger() || arg.isVAR())) {
                    value = this.inBrackets(value);
                }

                v[index] = value;

            }
            else if (input.isInf()) {
                v[index] = this.mode === 'text' ? INFINITY[0] : '\\infty';
            }
            else if (!(input.components || input.args)) {
                const value = this.formatSubscripts(input.value)
                    // Split it so we can check for instances of alpha as well as alpha_b
                    .split('_')
                    .map((v: string, i: number) => {
                        if (this.mode === TeX && this.greek.includes(v)) {
                            v = `\\${v}`;
                        }
                        // Wrap subscripts in braces
                        if (i > 0) {
                            v = this.inBraces(v);
                        }

                        return v;
                    })
                    .join('_');

                v[index] = value;
            }
            else if (input.isFunction()) {
                v[index] = this.functionString(input, options)
            }
            else if (input.isSum()) {
                const collected = input.componentsArray();
                const components: string[] = [];
                const l = collected.length;
                for (let i = 0; i < l; i++) {
                    components.push(this.convert(collected[i], options));
                }
                const value = components.join('+');

                v[index] = !(input.getPower().isOne() && input.getMultiplier().isOne()) || isNegative ? this.inBrackets(value, 'parens') : value;
            }
            else if (input.isProduct()) {
                const mul = this.getMultiplicationSymbol();
                // The container to hold the string output of numerator and denominator
                const numOutput: string[] = [];
                const denOutput: string[] = [];

                // Get the component array so we can loop over each one. 
                // We'll be placing their output in the numerator or denominator based on the sign of the power.
                const components = input.componentsArray();

                for (let component of components) {
                    // If the component is a wrap function then we should be dealing with internal element
                    if (component.isFunction(WRAP)) {
                        component = component.getArguments()[0];
                    }

                    // Store the sign of the power
                    const sgn = component.getPower().sign();
                    // The link to the container that the output will be pushed to
                    let target;

                    // Point to the correct container based on the sign of the power. If negative then the denominator
                    if (sgn === -1) {
                        // Get the numerator so it doesn't generate it as a fraction
                        component = component.invert();
                        target = denOutput;
                    }
                    else {
                        target = numOutput;
                    }

                    let output = this.convert(component, options);

                    // Wrap it if it's a sum
                    if (component.isSum() && component.getPower().isOne() && this.mode === TEXT) {
                        output = this.inBrackets(output);
                    }

                    target.push(output);
                }

                // Collapse the numerator into one string
                v[0] = numOutput.join(mul);
                v[1] = denOutput.join(mul);
            }
        }

        return v;
    }

    formatSubscripts(value: string) {
        // Split it at the underscore
        const arr = value.split('_');

        let name = '';

        // Loop over all entries except the first one
        while (arr.length > 1) {
            // Wrap all in braces except for the last one
            if (arr.length > 0) {
                name = '_' + this.inBraces(arr.pop() + name);
            }
        }

        return arr[0] + name;
    }

    // This is a holdover from the original implementation.
    // Tricky function name. In 'text' mode this just returns the string. In 'TeX' mode,
    // the string gets wrapped in braces. This will likely get renamed more appropriately.
    /**
     * Wraps the value in braces. Wraps it in brackets in text mode.
     * 
     * @param value 
     * @returns 
     */
    inBraces(value: string) {
        let retval: string;
        if (this.mode === TEXT) {
            retval = value;
        }
        else {
            retval = `{${value}}`;
        }
        return retval;
    }

    /**
     * Returns the string wrapped in brackets. 
     * 
     * @param value 
     * @param type 
     * @returns 
     */
    inBrackets(value: string, type: string = 'parens') {
        let retval: string;

        const bracketTypes = {
            parens: ['(', ')'],
            square: ['[', ']'],
            brace: ['{', '}'],
            abs: ['|', '|']
        };

        const [L, R] = bracketTypes[type];
        if (this.mode === TEXT) {
            retval = `${L}${value}${R}`;
        }
        else {
            retval = `\\left${L}${value}\\right${R}`
        }

        return retval;
    }

    functionString(input, options) {
        const TeXFunctionMap = {
            'acos': 'arccos',
            'asin': 'arcsin',
            'atan': 'arctan',
            'realpart': 'Re',
            'imagpart': 'Im'
        }
        // See if there's an alternate name for this function first otherwise use the current one.
        const name = this.mode === TeX ? `\\${TeXFunctionMap[input.name] || input.name}` : input.name;
        let retval: string;

        const output: string[] = [];

        // collect the arguments
        const args = input.getArguments();
        for (let i = 0; i < args.length; i++) {
            output.push(this.convert(args[i], options));
        }

        if (this.mode === TEXT) {
            retval = `${name}(${output.join(',')})`
        }
        else {
            switch (input.name) {
                case 'sqrt':
                case 'cos':
                case 'sin':
                case 'tan':
                case 'acos':
                case 'asin':
                case 'sinh':
                case 'cosh':
                case 'tanh':
                case 'sec':
                case 'csc':
                case 'cot': {
                    retval = name + this.inBrackets(output[0]);
                    break;
                }
                case 'abs': {
                    retval = this.inBrackets(output[0], 'abs');
                    break;
                }
                case FACTORIAL:
                case DOUBLE_FACTORIAL: {
                    const arg = args[0];
                    if (arg.getPower().isOne() && (arg.isSum() || arg.isProduct())) {
                        output[0] = this.inBrackets(output[0]);
                    }
                    retval = output[0] + (name === FACTORIAL ? '!' : '!!');
                    break;
                }
                case 'limit': {
                    retval = '\\lim_' + this.inBraces(output[1] + ' \\to ' + output[2]) + ' ' + output[0];
                    break;
                }
                case 'integrate': {
                    retval = '\\int' + this.inBraces(output[0]) + this.inBraces('\\, d' + output[1]);
                    break;
                }
                case 'defint': {
                    retval = '\\int_' + this.inBraces(output[1]) + '^' + this.inBraces(output[2]) + ' ' + output[0] + '\\, d' + output[3];
                    break;
                }
                case 'floor': {
                    retval = '\\left \\lfloor' + this.inBraces(output[0]) + '\\right \\rfloor';
                    break;
                }
                case 'ceil': {
                    retval = '\\left \\lceil' + this.inBraces(output[0]) + '\\right \\rceil';
                    break;
                }
                case Expression.LOG: {
                    retval = '\\mathrm' + this.inBraces(Expression.LOG) + '_' + this.inBraces(output[1]) + this.inBrackets(output[0]);
                    break;
                }
                case Expression.LOG10: {
                    retval = '\\mathrm' + this.inBraces(Expression.LOG) + '_' + this.inBraces('10') + this.inBrackets(output[0]);
                    break;
                }
                case 'sum': {
                    const a = output[0];
                    const b = output[1];
                    const c = output[2];
                    const d = output[3];
                    retval = '\\sum_{' + this.inBraces(b) + '=' + this.inBraces(c) + '}^' + this.inBraces(d) + ' ' + this.inBraces(a) + '';
                    break;
                }
                case 'product': {
                    const a = output[0];
                    const b = output[1];
                    const c = output[2];
                    const d = output[3];
                    retval = '\\prod_{' + this.inBraces(b) + '=' + this.inBraces(c) + '}^' + this.inBraces(d) + ' ' + this.inBraces(a) + '';
                    break;
                }
                case 'nthroot': {
                    retval = output[1] === '2' ? '\\sqrt' + this.inBraces(output[0]) : '\\sqrt[' + output[1] + ']' + this.inBraces(output[0]);
                    break;
                }
                case 'mod': {
                    retval = output[0] + ' \\bmod ' + output[1];
                    break;
                }
                case WRAP: {
                    // Just unwrap it.
                    retval = output[0];
                    break;
                }
                default: {
                    retval = '\\mathrm' + this.inBraces(name.replace(/_/g, '\\_'));
                    retval = retval + this.inBrackets(output.join(','), 'parens');
                }
            }
        }


        return retval;
    }

    // joins together two strings if both exist
    join(n: string, d: string, glue: string) {
        let retval: string;

        if (!n && !d) {
            retval = '';
        }
        else if (n && !d) {
            retval = n;
        }
        else if (d && !n) {
            retval = d;
        }
        else {
            retval = n + glue + d;
        }

        return retval;
    }

    formatPowerOutput(pArray: FracArray, requiresBrackets: boolean) {
        for (let i = 0; i < 2; i++) {
            let p = pArray[i];
            if (p) {
                // If we're in text mode we check to see it has an operator but make sure there are not carets
                if (this.mode === TEXT && requiresBrackets) {
                    p = this.inBrackets(p)
                }
                else {
                    p = this.inBraces(p);
                }
                pArray[i] = '^' + p;
            }

        }
        return pArray;
    }

    merge(a: FracArray, b: FracArray) {
        const r: FracArray = ['', ''];
        for (let i = 0; i < 2; i++) {
            r[i] = a[i] + b[i];
        }
        return r;
    }

    toFraction(n: string, d: string) {
        if (this.mode === 'TeX') {
            return '\\frac' + this.inBraces(n) + this.inBraces(d);
        }
        return `${n}/${d}`;
    }

    clearOnes(m: FracArray, v: FracArray) {
        for (let i = 0; i < 2; i++) {
            if (v[i] && Number(m[i]) === 1) {
                m[i] = '';
            }
        }

        return [m, v];
    }
    set(m: FracArray, v: FracArray, p: FracArray, input: Expression) {
        let tp;
        const mul = this.getMultiplicationSymbol();
        const combinePower = input.isProduct();

        const isBracketed = (v) => {
            return /^\\left\(.+\\right\)$/.test(v);
        };
        // format the power if it exists
        if (p) {
            const power = input.getPower();
            const requiresBrackets = (power.isSum() || power.isProduct()) && power.getPower().isOne() || power.isNUM() && !power.isInteger() || power.getPower().sign() === -1;
            p = this.formatPowerOutput(p, requiresBrackets);
        }

        // group CMB will have to be wrapped since the power applies to both it's numerator and denominator
        if (combinePower) {
            tp = p[0];
            // Temporarily make p blank
            p[0] = '';
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
        const top = this.join(mn, vn, !isBracketed(vn) ? mul : '');

        // prepare the bottom portion but check that it's not already bracketed. If it is then leave out the cdot
        let bottom = this.join(md, vd, !isBracketed(vd) ? mul : '');

        // The bottom requires brackets if it's in text mode and it has a coefficient
        if (md && vd && this.mode === TEXT) {
            bottom = this.inBrackets(bottom);
        }

        // format the power if it exists
        // make it a fraction if both top and bottom exists
        if (top && bottom) {
            let frac = this.toFraction(top, bottom);
            if (combinePower && tp) {
                frac = this.inBrackets(frac) + tp;
            }

            return frac;
        }
        // otherwise only the top exists so return that
        else
            return top;
    }

    fromTeX(input: string): Expression {
        // Prepare the string by removing slashes, left, right and replacing cdot
        const str = input
            .replace(/\s*\\cdot\s*/g, '*')
            .replace(/\s*(?:\\left|\\right)\s*/g, '')
            // Remove spaces before braces and replace curly brackets with parentheses
            .replace(/\s*[{(]/g, '(')
            .replace(/}/g, ')')
            // Replace multiple spaces or slashes with one space
            .replace(/\s+|\\/g, ' ');

        // Tokenize but let the tokenizer know to not insert multiplication symbols
        const TeXRPN = Parser.tokenize(str, {
            // Don't modify the output
            pure: true
        });

        return Expression.toExpression(Parser.parseTeXRPN(TeXRPN));
    }
}
