import { Expression } from "../../classes/parser/operations";

export function powerExpandToArray(variables: string[], power: number) {
    /**
     * The row will take on the form of [a_power, b_power, ..., coeff]. The polynomial gets 
     * flattened so we'll disregard their powers. We'll let the parser handle that at a later point. 
     * So x^2 + x*y become two flat variables with the value x^2 and x*y but for this example let's 
     * think of a & b. Since the variable is flattened each "term" becomes [0, 0, 1]. We'll construct 
     * a table multiplying out the row and column. For the first iteration the column = row. Our table 
     * becomes something like this
     * +---+----+----+
     * |   | a  | b  | 
     * +---+----+----+
     * | a | aa | ba |
     * | b | ab | bb |
     * +---+----+----+
     */

    // Constructs the row. You get back the array with zeros and a coefficient of one at the end
    // Given the expression (a+b) becomes [[0,0,1], [0,0,1]] where representing[[power a, power b, coeff a], [power a, power b, coeff b]]
    // The powers for each term are zero since they're just the value 1
    function constructRow() {
        return variables.map((x, i) => {
            const row = new Array(variables.length).fill(0);
            row.push(1);
            row[i] = 1;
            return row;
        });
    };

    // Match is a quick way to match two terms. Taking the earlier example of (a+b) now being [[0,0,1], [0,0,1]] if during multiplication we 
    // end up with a*b^2 + 2*a*b^2 + a, the arrays will look like [1, 2, 1], [1, 2, 2], [1, 0, 1]. Remember that the coefficient
    // is the end of the array and we're assuming the order of the variables to be [a, b]. The first two terms can be added since all but
    // their last element matches.
    function match(a: number[], b: number[]) {
        for (let i = 0; i < a.length - 1; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    let row = constructRow();

    // We now perform piecewise multiplication incrementing the power each time like values are multiplied.
    for (let n = 0; n < power - 1; n++) {
        // Multiply the row
        const result: number[][] = [];
        const sum: number[][] = [];
        for (let i = 0; i < row.length; i++) {
            for (let j = 0; j < variables.length; j++) {
                const term = [...row[i]];
                // j.0 = a, j.1 = b;
                term[j]++;
                result.push(term)
            }
        }

        while (result.length) {
            let last = result.pop();
            for (let i = 0; i < result.length; i++) {
                const term = result[i];
                if (last && match(last, term)) {
                    term[term.length - 1] += last[last.length - 1];
                    // Delete it
                    last = undefined;
                    break; // Done
                }
            }
            if (last) {
                sum.push(last);
            }
        }

        row = sum;
    }

    return row;
}

/**
 * Converts an array of number[] back to its expression form. Given a set of arrays in
 * the form [[1,1,2], [2,0,1]] and the variables [a, b] it gets converted back to
 * a*b*2 + (a)^2. At the time of this documentation the brackets are always added for power > 1
 * 
 * @param row 
 * @param variables 
 * @returns 
 */
export function expandArrayToExpression(row: number[][], variables: string[], multiplier?: string) {
    const termsArray: string[] = [];
    // Put the multiplication in front of the multiplier if provided
    const m = multiplier ? `${multiplier}*` : '';

    for (let i = 0; i < row.length; i++) {
        const term = row[i];
        const varStringArray: string[] = [];
        // We skip the last element since that's the coefficient
        for (let j = 0; j < term.length - 1; j++) {
            const variable = variables[j];
            const p = term[j];
            if (p === 1) {
                varStringArray.push(variable);
            }
            else if (p !== 0) {
                // This MAY give a slight performance boost by not adding unnecessary brackets
                varStringArray.push(`(${variable})^${p}`);
            }
        }

        let termsString = varStringArray.join('*');
        const coeff = term[term.length - 1];
        if (coeff !== 1) {
            termsString = `${coeff}*${termsString}`;
        }

        termsArray.push(m + termsString);
    }

    return termsArray.join('+');
}

/**
 * Checks to see if a sum or product is expandable. 
 * 
 * @param x 
 */
export function isExpandable(x: Expression) {
    return x.isComplex() || !x.getMultiplier().isOne() || x.value.includes('(') || !x.getPower().isOne();
}

/**
 * Expands the Expression with integer powers > 1. It does this by first flattening out the expression.
 * The multiplier and power then become one. This enables us to focus on expanding the power by using
 * integers. So give (x*y+z*y^6)^2 we substitute x*y for 1*($1)^1 and z*y^6 for 1*($2)^1. We then end up with
 * 1*($1)^2 + 2*($1*$2)^1 + 1*($2)^2 after which we back substitute to get 1*(x*y)^2 + 2*(x*y*z*y^6)^1 + 1*(z*y^6)^2  
 * and run it through the parser for evaluation.
 * 
 * @param x 
 */
export function powerExpand(x: Expression) {
    let retval = x;

    if (x.isSum() && x.getPower().isInteger()) {
        const sgn = x.getPower().sign();
        const power = x.getPower().abs();
        // Flatten the terms to get back an array of strings
        const variables = Object.values(x.getComponents()).map((e) => { return e.text() });
        // Get the multiplier if it's not one
        const multiplier = x.getMultiplier().isOne() ? undefined : x.multiplier?.text();
        // Convert to an expanded array
        const termsArray = powerExpandToArray(variables, Number(power));
        // Parse it back to an expression and return
        const expression = expandArrayToExpression(termsArray, variables, multiplier);

        retval = Expression.toExpression(expression);

        // Put back the power sign
        if (sgn === -1) {
            retval = retval.invert();
        }
    }

    return retval;
}

/**
 * Performs multiplication but expands out the sum.
 * 
 * @param x 
 * @param y 
 * @returns 
 */
export function sumExpandMultiply(x: Expression, y: Expression) {
    // Expand both 

    let retval;

    if (y.isSum() && !x.isSum()) {
        retval = sumExpandMultiply(y, x);
    }
    // Expand but only if the power is one
    else if (x.isSum()) {
        if (!x.getPower().isOne()) {
            // Expand if the power is not one.
            x = powerExpand(x);
        }

        // Expand if expandable
        if (x.getPower().isOne()) {
            retval = Expression.Number('0');
            x.each((component) => {
                if (isExpandable(component)) {
                    component = expand(component);
                }
                // If either is a sum then call this function recursively
                if (y.isSum() || component.isSum()) {
                    retval = retval.plus(sumExpandMultiply(y, component));
                }
                else {
                    const result = y.times(component);
                    retval = retval.plus(result);
                }
            });
        }
        // Since it turns out that x is not expandable likely due to it being under the denominator,
        // we can try to see if y is expandable. We send it back to sumExpandMultiply
        else if (y.isSum()) {
            retval = sumExpandMultiply(y, x);
        }
        // Since x cannot be expanded and y is not a sum, then multiply and return
        else {
            retval = x.times(y);
        }
    }
    else {
        retval = expand(x).times(expand(y));
    }

    return retval;
}

/**
 * Expands the product of expressions. The power gets distributed when expanding.
 * 
 * @param x 
 * @returns 
 */
function productExpand(x: Expression) {
    /*
     * Only expand if needed. This eliminates unnecessary multiplication. Note this this is not an all inclusive tests and contains false positives.
     * In that case it will just be a wasted effort. The test is performed against x value instead of x.text().
     * Test to see if:
     * - It has a component with an integer power. 
     * - It has a scoped multiplier
     * - Contains a sum
     */
    // We start with the multiplier
    let retval: Expression;

    retval = Expression.fromRational(x.getMultiplier());
    // Store the power
    const pow = x.getPower();
    // Store the check to see if the power is one. If it is then don't raise it
    const powIsOne = pow.isOne();
    // Loop through the remaining components
    x.each((component) => {
        // The power does not equal one then raise it to that power
        if (!powIsOne) {
            component = component.pow(pow);
        }

        // Expand it if expandable
        // if(isExpandable(component)) {
        component = expand(component);
        // }

        // Store the power
        const power = component.getPower();
        // If it's a product with a power != 1 then expand otherwise just put it back
        if (component.isProduct() && power.isInteger() && !power.isOne()) {
            component.each((subComponent) => {
                retval = retval.times(subComponent.pow(power));
            });
        }
        // retval may have been multiplied out and become a sum at this point so we need to check
        // if retval or the component is a sum
        else if (retval.isSum() || component.isSum()) {
            retval = sumExpandMultiply(retval, component);
        }
        // Otherwise just multiply it out but to check if it's expandable first
        else {
            retval = retval.times(component);
        }
    });

    return retval;
}

/**
 * Expands each term of the sum. Expects a fully expanded sum
 * 
 * @param x 
 * @returns 
 */
function expandTerms(x: Expression) {
    // Only products need expanding
    if (x.isSum() && x.getPower().eq('-1')) {
        return x;
    }

    let retval = Expression.Number('0');
    x.each((e) => {
        retval = retval.plus(expand(e));
    });

    return retval;
}

/**
 * Expands the function by distributing the power and the multiplier whenever possible
 * 
 * @param x 
 */
export function expand(x: Expression) {
    let retval;

    if (isExpandable(x)) {
        if (x.isConstant() || x.isVAR()) {
            retval = new Expression(x)
        }
        else {
            // At the very least the multiplier must be distributed along the expression
            retval = x.distributeMultiplier();

            // First expand the power if it's a GRP or CMP
            if (retval.isSum()) {
                // First expand each term
                retval = powerExpand(retval);
                retval = expandTerms(retval);
            }
            // Expand products
            if (retval.isProduct()) {
                retval = productExpand(retval);
            }
            // Expand arguments
            if (retval.isFunction()) {
                // Just parse it. This can probably be more efficient 
                const args = retval.getArguments().map((x) => { return expand(x) });
                let t = Expression.toFunction(retval.name!, args);
                // Copy over the power and multiplier
                t.multiplier = retval.multiplier;
                t = Expression.setPower(t, retval.getPower());

                retval = t;
            }

            if (retval.isEXP()) {
                const pow = expand(retval.getPower());
                const expression = expand(retval.parseValue());
                const t = expression.pow(pow);
                t.multiplier = retval.multiplier;
                retval = t;
            }
        }
    }
    else {
        retval = new Expression(x)
    }

    return retval;
} 