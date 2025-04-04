import { Expression } from "../classes/parser/operations";
import { convertToTitle } from "../classes/expression/string";
import { OptionsObject, SupportedInputType } from "../classes/parser/types";
import { FracArray } from "./Output";
import { INFINITY, WRAP } from "../classes/parser/constants";
import { product } from "../../math/utils";

export class PatternConverter {

    variable: string;
    count: number = 0;
    variables: { [variable: string]: Expression } = {};
    multiplicationSymbol: string = '*';
    convertNumericCoeffs: boolean = false;

    constructor(variable: string) {
        this.variable = variable;
    }

    getVariableAndStore(x: SupportedInputType) {
        x = Expression.toExpression(x);
        // One never gets converted
        if (x.isOne()) {
            return '1';
        }

        // If numeric coefficients are preferred then nothing left to do.
        if (x.isNUM() && !this.convertNumericCoeffs) {
            return x.text();
        }

        // Convert to A capital letter
        const v = convertToTitle(++this.count);
        this.variables[v] = x;
        return v;
    }

    convert(input: SupportedInputType, options?: OptionsObject) {
        options = Object.assign({}, {
            // Add default options here
        }, options);

        input = Expression.toExpression(input, undefined, true);
        // True if the value is in the denominator
        const isInverted = input.getPower().getMultiplier().isNegative();
        const power = input.getPower().signFree();
        const isNegative = input.getMultiplier().isNegative();
        // Strip the sign. We already know if it's negative or not
        const m = input.getMultiplier().abs();
        delete input.multiplier;

        // if the user wants the result in decimal format then return it as such by placing it at the top part
        const multiplierArray: FracArray = ['', ''];
        multiplierArray[0] = this.getVariableAndStore(m.numerator)
        multiplierArray[1] = this.getVariableAndStore(m.denominator);

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

    x() {
        return Expression.toExpression(this.variable);
    }

    formatCoeff(n: string) {
        if (n === '-1') {
            return '-';
        }
        else if (n === '1') {
            return '';
        }

        return n;
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
                v[index] = INFINITY[0];
            }
            else if (!(input.components || input.args)) {
                v[index] = input.value === this.variable ? this.variable : this.getVariableAndStore(input);
            }
            else if (input.isFunction()) {
                v[index] = this.functionString(input, options)
            }
            else if (input.isSum()) {
                if (!input.hasVariable(this.variable)) {
                    v[index] = this.getVariableAndStore(input);
                }
                else {
                    const coeffs = input.coeffs(this.variable);
                    const vArray: string[] = []
                    Object.keys(coeffs.coeffs).map((e) => {
                        return {
                            key: e,
                            expression: Expression.toExpression(e)
                        }
                    }).sort((a, b) => {
                        if (a.expression.gt(b.expression))
                            return -1;
                        return 1;
                    }).forEach((e) => {
                        const coeff = coeffs.coeffs[e.key];
                        const term = this.x().pow(e.expression).times(coeff);
                        vArray.push(this.convert(term, options));
                        // const expression = coeffs.coeffs[e.key];
                        // let v = this.getVariableAndStore(expression);

                        // if (e.key !== '0') {
                        //     // Convert the power
                        //     const p = this.convert(e.expression, options);
                        //     // Add the coefficient back
                        //     v = v === '1' ? this.variable : `${v}${this.multiplicationSymbol}${this.variable}`;
                        //     if (p !== '1') {
                        //         v = `${v}^${p}`;
                        //     }
                        // }
                        // vArray.push(v);
                    });

                    v[index] = vArray.join('+').replace(/\+-/g, '-');
                }
            }
            else if (input.isProduct()) {
                const mul = this.multiplicationSymbol;
                // The container to hold the string output of numerator and denominator
                const numOutput: string[] = [];
                const denOutput: string[] = [];
                // All components not having the variable will go to the coefficient
                // All else go to vars
                const numCoeff: Expression[] = [];
                const denCoeff: Expression[] = [];

                // Important things to remember
                // - At this point the multiplier is gone so this isn't something we need to handle
                // - The numerator and denominator have to be treated individually
                const components = input.componentsArray().sort((a, b) => {
                    if (a.getPower().gt(b.getPower()))
                        return -1;
                    return 1;
                })
                for (let component of components) {
                    let coeffTarget;
                    let outputTarget;

                    if (component.isFunction(WRAP)) {
                        component = component.getArguments()[0];
                    }
                    // Get the power. We need to know where to target
                    if (component.getPower().sign() === -1) {
                        coeffTarget = denCoeff;
                        outputTarget = denOutput;
                        component = component.invert();
                    }
                    else {
                        coeffTarget = numCoeff;
                        outputTarget = numOutput;
                    }

                    if (component.hasVariable(this.variable)) {
                        let compStr = this.convert(component, options);
                        // Wrap sums in a bracket
                        if (component.isSum()) {
                            compStr = this.inBrackets(compStr);
                        }
                        outputTarget.push(compStr);
                    }
                    else {
                        coeffTarget.push(component);
                    }
                }

                const top = this.formatCoeff(this.getVariableAndStore(product(...numCoeff)));
                const bottom = this.formatCoeff(this.getVariableAndStore(product(...denCoeff)));

                if (top) {
                    numOutput.unshift(top);
                }

                if (bottom) {
                    denOutput.unshift(bottom);
                }

                // // Get the component array so we can loop over each one. 
                // // We'll be placing their output in the numerator or denominator based on the sign of the power.
                // const components = input.componentsArray();

                // for (let component of components) {
                //     // If the component is a wrap function then we should be dealing with internal element
                //     if (component.isFunction(WRAP)) {
                //         component = component.getArguments()[0];
                //     }

                //     // Store the sign of the power
                //     const sgn = component.getPower().sign();
                //     // The link to the container that the output will be pushed to
                //     let target;

                //     // Point to the correct container based on the sign of the power. If negative then the denominator
                //     if (sgn === -1) {
                //         // Get the numerator so it doesn't generate it as a fraction
                //         component = component.invert();
                //         target = denOutput;
                //     }
                //     else {
                //         target = numOutput;
                //     }

                //     let output = this.convert(component, options);

                //     // Wrap it if it's a sum
                //     if (component.isSum() && component.getPower().isOne()) {
                //         output = this.inBrackets(output);
                //     }

                //     target.push(output);
                // }

                // Collapse the numerator into one string
                v[0] = numOutput.join(mul);
                v[1] = denOutput.join(mul);
            }
        }

        return v;
    }

    functionString(input: Expression, options?: OptionsObject) {
        const output: string[] = [];

        // collect the arguments
        const args = input.getArguments();
        for (let i = 0; i < args.length; i++) {
            output.push(this.convert(args[i], options));
        }

        return `${input.name}(${output.join(',')})`;
    }

    /**
     * Returns the string wrapped in brackets. 
     * 
     * @param value 
     * @param type 
     * @returns 
     */
    inBrackets(value: string, type: string = 'parens') {
        const bracketTypes = {
            parens: ['(', ')'],
            square: ['[', ']'],
            brace: ['{', '}'],
            abs: ['|', '|']
        };


        const [L, R] = bracketTypes[type];
        return `${L}${value}${R}`;
    }

    formatPowerOutput(pArray: FracArray, requiresBrackets: boolean) {
        for (let i = 0; i < 2; i++) {
            let p = pArray[i];
            if (p) {
                // If we're in text mode we check to see it has an operator but make sure there are not carets
                if (requiresBrackets) {
                    p = this.inBrackets(p)
                }
                pArray[i] = '^' + p;
            }
        }
        return pArray;
    }

    set(m: FracArray, v: FracArray, p: FracArray, input: Expression) {
        let tp;
        const mul = this.multiplicationSymbol;
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
        const bottom = this.join(md, vd, !isBracketed(vd) ? mul : '');

        // The bottom requires brackets if it's in text mode and it has a coefficient
        if (md && vd) {
            // bottom = this.inBrackets(bottom);
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

    merge(a: FracArray, b: FracArray) {
        const r: FracArray = ['', ''];
        for (let i = 0; i < 2; i++) {
            r[i] = a[i] + b[i];
        }
        return r;
    }

    toFraction(n: string, d: string) {
        if (d === '1')
            return n;
        return `${n}/${d}`;
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
}
