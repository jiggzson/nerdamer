import { Expression } from "../classes/parser/operations";
import { Parser } from "../classes/parser/operations";
import { sum, product } from "../../math/utils";
import { _ } from "../classes/parser/helpers";
import { Settings } from "../Settings";
import { SupportedInputType } from "../classes/parser/types";
import { one } from "../classes/expression/shortcuts";

export type MapObjectType = { [value: string]: Expression }

export function prodSubst(expression: Expression, value: Expression, withValue: Expression) {
    let retval;
    /**
     * The overview:
     * We loop through the components of each. The multiplier of the the power (meaning the power being substituted divided by the existing),
     * has to match for each of the elements. Additionally, that ratio has to be an integer. If neither criteria is satisfied, then
     * we exit and return the expression.
     */
    if (expression.isProduct()) {
        if (value.isProduct()) {
            // First check the multipliers. This has to be an integer
            const m = expression.getMultiplier().div(value.getMultiplier());
            if (!m.isInteger() && !Settings.ALLOW_RAT_SUBS) {
                retval = new Expression(expression);
            }
            else {
                let power;
                // Get the expression components
                let expressionComponents = expression.componentsArray();
                // Get the components of the value being subbed.
                const valueComponents = value.componentsArray();

                // We'll loop through the components of the value to be subbed
                // Create an array of the items not substituted
                // A flag to keep track if a substitution occurred
                let success: boolean = false;
                // The array of the components encountered
                let filtered;
                // Keep track of the number of element substituted
                let remaining = valueComponents.length;
                while (valueComponents.length) {
                    // Reset the filtered array
                    filtered = [];
                    // Start with the assumption that no substitution occurred
                    success = false;
                    const vc = valueComponents.pop()!;

                    for (const ec of expressionComponents) {
                        // First find the value
                        if (ec.value === vc.value) {
                            // Then get the ratio of their powers
                            const pr = ec.getPower().div(vc.getPower());

                            // If the power ratio is undefined then we're at the first value. So just set the value to this value
                            if (!power) {
                                power = pr;
                            }
                            // If the ratio of the powers is not an integer then we're done and exit or 
                            // If the power ratios don't match then we're done. For instance if we're substituting x*y in x^2*y, 
                            // the ratio will be (2, 1) and it's therefore not a valid substitution
                            if ((!pr.isInteger() || !pr.eq(power)) && !ec.isEXP()) {
                                break;
                            }

                            success = true;
                            remaining--;
                        }
                        else {
                            filtered.push(subst(ec, value, withValue));
                        }
                    }
                    // If any substitution failed then we're done and exit
                    if (!success) {
                        break;
                    }
                    // Update the list with the new one which doesn't have the substituted element
                    expressionComponents = filtered;
                }

                // If all the elements weren't substituted then return the original expression
                if (remaining !== 0) {
                    retval = new Expression(expression);
                }
                // Otherwise add the substituted value to the filtered set and return the sum product
                else {
                    filtered.push(withValue.pow(power));
                    retval = product(...filtered);
                    // Transfer the power and multiplier
                    retval.multiplier = retval.getMultiplier().times(m);
                }
                // Make substitutions in the power
                retval = retval.pow(subst(expression.getPower(), value, withValue));
            }
        }
        else {
            // Convert it to an array, substitute out each element, convert it back to a product
            // but make sure to put back the expression multiplier.
            retval = product(...expression.componentsArray(true).map((x) => {
                return subst(x, value, withValue);
            })).pow(expression.getPower());
        }
    }

    return retval || expression;
}

/**
 * Performs a substitution on a sum
 * 
 * @param expression 
 * @param value 
 * @param withValue 
 * @returns 
 */
export function sumSubst(expression: Expression, value: Expression, withValue: Expression) {
    let retval;

    if (expression.isSum()) {
        if (value.isSum()) {
            /**
             * The overview:
             * We loop through the elements of the value being substituted. We do this by creating an array of both of the components.
             * If even one element wasn't found then we set the success flag to false and exit. Otherwise we remove them all and place
             * the substituted value in the array. We then call the sum function to sum them all together.
             */
            // Get the expression components
            let expressionComponents = expression.componentsArray().map((x) => {
                return subst(x, value, withValue);
            });

            // Get the components of the value being subbed. If it's a sum then break it up, otherwise we want it as a unit
            const valueComponents = value.isSum() && value.getPower().isOne() ? value.componentsArray() : [value.multiplierFree()];
            // 
            const stack: Expression[] = [];
            // Set it to an empty array so TypeScript can shut up.
            let output: Expression[] = [];
            // The multiplier of the substitution
            let m: Expression | undefined;

            for (const vc of valueComponents) {
                // Find a value in the expression
                for (const ec of expressionComponents) {
                    // TODO: check for multiplier. The ratio of multiplier can be used
                    // Add back powers and multiplier
                    if (ec.value === vc.value && ec.getPower().eq(vc.getPower())) {
                        // Get the ratio of the expression term and the subst term
                        const tm = ec.div(vc);

                        // If the ratio isn't defined make a note of it. It goes on the stack for consideration
                        if (!m) {
                            m = tm;
                            stack.push(ec);
                        }
                        // The ratios must match otherwise exit.
                        else if (!tm.eq(m)) {
                            output.push(ec);
                        }
                        // It passed both tests so it's a good match
                        else {
                            stack.push(ec);
                        }

                        // IMPROVE: Consider using slice for the remainder of the loop instead of pushing to output in the "else" block. 
                        // This MAY provide a slight performance boost
                    }
                    else {
                        output.push(ec);
                    }
                }

                // Update the values components with the new set minus the substituted
                expressionComponents = output;
                // Reset output
                output = [];
            }

            // If the stack length is equal to the length of the values being subbed then
            // we can complete the substitution
            if (stack.length === valueComponents.length) {
                // We can now make the substitution. Remember that this is the substitution
                // times some multiplier so it has to be put back.
                expressionComponents.push(withValue.times(m || one()));
            }
            else {
                expressionComponents = expressionComponents.concat(stack);
            }

            retval = sum(...expressionComponents);

            // Put back the power
            retval = retval.pow(expression.getPower());

            // Put back the multiplier
            retval.multiplier = retval.getMultiplier().times(expression.getMultiplier());
        }
        else {
            // Convert it to an array, substitute out each element, convert it back to a sum
            // but make sure to put back the expression multiplier.
            retval = sum(...expression.componentsArray().map((x) => {
                return subst(x, value, withValue);
            }))
                .pow(expression.getPower())
                .times(expression.getMultiplier())
        }
    }
    return retval || expression;
}
/**
 * Replaces a value with another. The base parse function provides some basic substitution 
 * but this is primarily for single variables. This function provides more complex substitutions.
 * 
 * @param expression The expression being used to perform the substitution
 * @param value The value currently in the expression
 * @param withValue The value that the substitution is being replaced with
 */
export function subst(expression: SupportedInputType, value: SupportedInputType, withValue: SupportedInputType): Expression {
    expression = Expression.toExpression(expression);
    value = Expression.toExpression(value);
    withValue = Expression.toExpression(withValue);

    let retval;

    // If the value to be substituted is a sum or product but the value does not contain
    // any then we're done. Also, we don't consider a number a proper LHS value.
    if (expression.isNUM() || (expression.isVAR() && (value.args || value.components))) {
        retval = expression;
    }
    // We next move to the most obvious substitution which is the expression is equal to the value
    else if (expression.eq(value)) {
        retval = withValue;
    }
    // If the value is a simple variable then we can utilize the parser which already does a great
    // job of substituting
    else if (value.isVAR()) {
        retval = Parser.parse(expression.text(), { [value.value]: withValue.text() });
    }
    else if (expression.isProduct()) {
        retval = prodSubst(expression, value, withValue);
    }
    // The power has to be one because we cannot swap terms otherwise
    // TODO: CMP with nested GRP
    else if (expression.isSum()) {
        // Perform a simple sum factor on the expression so we can detect the t+1 in expression like a*t+a.
        // This should not affect a substitution for the a*t since products are checked first.
        // expression = sumFactor(expression);
        // If it was factored then it belongs to the product substitution
        retval = sumSubst(expression, value, withValue);
    }
    else if (expression.isFunction()) {
        if (expression.value === value.value) {
            retval = new Expression(withValue);
        }
        else {
            retval = Expression.Function(expression.name!);
            retval.args = expression.getArguments().map((x) => {
                return subst(x, value, withValue);
            });

            // Update the value to reflect the new argument(s)
            retval.updateValue();
        }

        retval = retval.pow(expression.getPower()).times(expression.getMultiplier());

    }
    else if (expression.isEXP()) {
        const base = subst(expression.getArguments()[0], value, withValue);
        const exp = subst(expression.getPower(), value, withValue);
        retval = base.pow(exp);
    }

    return retval || expression;
}

/**
 * Performs a u-substitution in an expression. The u will be calculated so it doesn't
 * conflict with any of the existing variables. 
 * IMPORTANT: The order of substitutions is NOT preserved.
 * 
 * @param expression The expression in which the substitution will occur
 * @param subst The value being substituted
 * @param mapObj 
 */
export function uSub(expression: Expression, value: Expression, map?: MapObjectType): [Expression, MapObjectType] {
    // Create the map object is one wasn't provided
    map ??= {};

    const variables = expression.variables();

    let count = 0;
    let u: string;

    do {
        u = `u${count}`;
        count++;
    }
    while (variables.includes(u) || u in map);

    // Perform the substitution
    const subbed = subst(expression, value, _(u));

    // Mark it as updated
    if (!subbed.eq(expression)) {
        map[u] = value;
    }

    return [subbed, map];
}

/**
 * Reverses the u-substitution
 * 
 * @param expression 
 * @param map 
 * @returns 
 */
export function uUnSub(expression: Expression, map: MapObjectType) {
    // Substitute back in all the elements. Remember that the order is not preserved.
    for (const u in map) {
        const value = map[u];
        expression = subst(expression, _(u), value);
    }

    return expression;
}

/**
 * Performs a u-substitution on all the functions in the expression
 * 
 * @param expression 
 * @param map 
 * @returns 
 */
export function fnUSub(expression: Expression, map?: MapObjectType): [Expression, MapObjectType] {
    // Create the map object if none was provided
    map ??= {};

    // We get all the functions in the expression. Next we'll u-substitute each one.
    expression.functions(undefined, true).forEach((fn) => {
        [expression, map] = uSub(expression, _(fn), map);
    });

    return [expression, map];
}