import { OptionsObject } from "../parser/types";
import { Expression } from "./Expression";
import { RATIONAL } from "../parser/constants";
import { Settings } from "../../Settings";
import { EXPRESSION_TYPES } from "../parser/constants";

const { NUM, FUN, VAR, INF, GRP, EXP, CMB, CMP } = EXPRESSION_TYPES;

/**
 * Formats the multiplier string for string output.
 * The multiplier string can be blank, include an *, or be formatted as a decimal or fraction.
 *
 * @param x
 * @param options
 * @returns
 */
export function formatMultiplierString(x: Expression, options?: OptionsObject) {
    let retval = '';
    const m = x.getMultiplier()
    const mString = m.text(options);

    if (mString !== '1' && mString !== '1.0') {
        retval = mString;

        if (!m.isInteger() && !(m.asDecimal || options?.decimal)) {
            retval = `(${retval})`;
        }

        // Don't show the minus one as -1* but just -
        if (retval === '-1') {
            retval = '-'
        }
        else {
            retval += '*';
        }
    }

    return retval;
}

/**
 * The power string can be blank, include a ^, or be formatted as a decimal or fraction.
 * Since it can be fraction or an expression, it will also determine if brackets are needed.
 *
 * @returns
 */
export function formatPowerString(x: Expression, options?: OptionsObject) {
    let retval = '';
    const power = x.getPower();
    const powerString: string = power.text(options);

    if (powerString !== '1' && powerString !== '1.0') {

        retval = powerString;

        // Wrap fractions in brackets
        if (power.dataType === RATIONAL && !power.isInteger()) {
            retval = `(${retval})`;
        }
        else {
            const power = x.getPower();
            let needsBrackets = false;

            if (power.type === CMP || power.type === CMB) {
                needsBrackets = true;
            }
            else if (x.type === EXP) {
                if (power.isNUM() && !power.isInteger()) {
                    needsBrackets = true;
                }
                else if (!power.isNUM() && !power.getMultiplier().isOne()) {
                    needsBrackets = true;
                }
            }

            if (needsBrackets || retval.includes('/')) {
                retval = `(${retval})`;
            }
        }

        retval = `${Expression.POW_OPR}${retval}`;
    }

    return retval;
}


export function toText(x: Expression, options?: OptionsObject, asId?: boolean) {
    options = { ...{ 'precision': x.precision! }, ...options };

    let retval: string = '';
    if (x.type === NUM) {
        retval = x.getMultiplier().text(options);
    }
    else {
        // Get the multiplier but don't add it for the top level. Only
        // format sub-components
        const multiplier = asId && !x.components ? '' : formatMultiplierString(x, options);
        const power = formatPowerString(x, options);
        let value: string;
        switch (x.type) {
            case VAR:
            case INF:
                retval = `${multiplier}${x.value}`;
                break;
            case FUN:
                // TODO: See Expression.toFunction for possible refactoring.
                retval = `${multiplier}${x.name || ''}(${x.getArguments().map(x => x.text(options)).join(', ')})`;
                break;
            case GRP:
            case CMP: {
                value = formatExpressionString(x, options);
                value = multiplier || power ? `(${value})` : value;
                // The value has already been calculated when the values were added
                retval = `${multiplier}${value}`;
                break;
            }
            case CMB: {
                value = formatExpressionString(x, options);
                value = power ? `(${value})` : value;
                retval = `${multiplier}${value}`;
                break;
            }
            case EXP: {
                const arg = x.getArguments()[0];
                const p = arg.getPower();
                value = toText(arg, options);
                // The following cases get brackets.
                // 1 - (x+1)^x
                // 2 - (-x)^x
                // 3 - (2/3)^x
                // 4 - (x^x)^x
                if (arg.components || value.startsWith('-') || value.includes('/') || !(p.isOne() || p.isZero())) {
                    value = `(${value})`;
                }
                retval = `${multiplier}${value}`;

                break;
            }

        }

        retval += power;
    }

    return retval.replace(/\+-/g, '-');
}

// export function toTeX(x: Expression, options?: OptionsObject) {

// }


export function formatExpressionString(x: Expression, options?: OptionsObject) {
    const glue = x.type === CMB ? '*' : '+';
    const components: Expression[] = Object.values(x.getComponents());

    if (Settings.SORT_TERMS || options?.sort) {
        components.sort(Expression.sortFunction);
    }

    return components.map((e) => {
        let value = e.text(options);
        // Wrap it in brackets for certain conditions
        if (x.type === CMB && e.isSum()) {
            value = `(${value})`;
        }
        return value;
    }).join(glue).replace('+-', '-');
}

/**
 * Converts to capital letter e.g. 1=A, 2=B, ..., 100=CV
 * 
 * @param n 
 * @returns 
 */
export function convertToTitle(n: number) {
    let result = '';
    while (n > 0) {
        n--;
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26);
    }
    return result;
}