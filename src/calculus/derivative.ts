import { Expression } from "../core/classes/parser/operations";
import { __, UnsupportedOperationError } from "../core/errors";
import { _ } from "../core/classes/parser/helpers";
import { log } from "../core/functions/math";
import { SupportedInputType } from "../core/classes/parser/types";
import { one } from "../core/classes/expression/shortcuts";


/**
 * Applies the product rule to an expression
 * 
 * @param expression 
 * @param variable 
 * @returns 
 */
function productRule(expression: Expression, variable: Expression) {
    //grab all the symbols within the CB symbol
    const components = expression.componentsArray();
    let result = Expression.Number('0');

    //loop over all the symbols
    for (let i = 0; i < components.length; i++) {
        let df = diff(components[i], variable);
        for (let j = 0; j < components.length; j++) {
            //skip the symbol of which we just pulled the derivative
            if (i !== j) {
                //multiply out the remaining symbols
                df = df.times(components[j]);
            }
        }
        //add the derivative to the result
        result = result.plus(df);
    }
    return result; //done
}

/**
 * Calculates the derivative of a given expression
 * 
 * @param expression The expression from which the derivative is calculated
 * @param variable The variable with respect to the derivative is calculated 
 * @param nth The nth derivative
 * @returns 
 */
export function diff(expression: Expression, variable?: SupportedInputType, n?: Expression | number) {
    const variables = expression.variables();
    // Set the variable if none was provided
    variable ??= Expression.Variable(variables[0]);

    variable = Expression.toExpression(variable);
    const nth = typeof n === 'number' ? Expression.toExpression(n) : n;
    // If the variable is a number then complain
    if (variable?.isNUM()) {
        throw new UnsupportedOperationError(__('unsupportedOperation'));
    }

    let retval;

    if (variables.length === 0 || !expression.hasVariable(variable.value) || expression.isConstant()) {
        retval = Expression.Number('0');
    }
    // If the variable is not of type VAR or nth is not an integer then return it untouched until either or both are resolved
    else if (variable && !variable.isVAR() || nth && !nth.isInteger()) {
        retval = Expression.toFunction('diff', [expression, variable, nth]);
    }
    else if (expression.isEXP()) {
        retval = log(expression.getArguments()[0]).times(expression);
    }
    // If the expression doesn't have a variable or if it's a constant then we're done
    else {
        // Reduce the nth call of the derivative
        const n = nth ? Number(nth) - 1 : 0;

        // Pull the derivate of the outside. At this point we've already performed all the required checks.
        const m = expression.getMultiplier().times(expression.getPower());
        const p = expression.getPower().minus('1');
        const f = Expression.toExpression(expression.value);
        const fp = f.pow(p).times(m);

        // Pull the derivative of the inside
        if (f.isVAR()) {
            retval = one();
        }
        else if (f.isSum()) {
            retval = Expression.Number('0');
            f.each((e) => {
                retval = retval.plus(diff(e, variable));
            });
        }
        else if (f.isProduct()) {
            retval = productRule(f, variable);
        }
        else if (f.isFunction()) {
            const args = f.getArguments();

            switch (f.name) {
                case 'sin':
                    retval = _(`cos(${args[0]})`);
                    break;
                case 'cos':
                    retval = _(`-sin(${args[0]})`);
                    break;
            }
        }

        if (retval) {
            retval = retval.times(fp);
        }

        // Pull the nth -1 derivative if that was requested
        if (n > 0 && retval) {
            retval = diff(retval, variable, Expression.Number(n));
        }
    }

    return retval || Expression.toFunction('diff', [expression, variable, nth]);
}

