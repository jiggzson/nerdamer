import { Expression } from "../../expression/Expression";
import { UndefinedError } from "../../../errors";
import { ABS, RANK, WRAP } from "../constants";
import { Settings } from "../../../Settings";
import { simplifyImaginary } from "../../../functions/complex";
import { ErrorMessages } from "../../../errors";
import { anyObject } from "../../../../utils/object";
import { one } from "../../expression/shortcuts";


/**
 * Multiplies two Expressions
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export function multiply(a: Expression, b: Expression): Expression {
    let retval;

    if (Settings.DEFER_SIMPLIFICATION) {
        // The wrap function is just a function to allow us to encapsulate the value
        retval = merge(Expression.toFunction(WRAP, [a]), Expression.toFunction(WRAP, [b]));
        retval.deferred = true;
    }
    else {
        if (a.isZero()) {
            if (b.isInf()) {
                throw new UndefinedError(ErrorMessages[Settings.LANGUAGE as string].infinityTimesZero);
            }
            retval = Expression.Number('0');
        }
        else if (a.isNUM() && b.isNUM()) {
            retval = Expression.fromRational(a.getMultiplier().times(b.getMultiplier()));
        }
        else if ((a.isComplex() && b.isComplex()) && (a.isSum() && b.isSum())) {
            const realA = a.realPart();
            const realB = b.realPart();
            const imA = a.imagPart();
            const imB = b.imagPart();
            retval = realA.times(realB).minus(imA.times(imB)).plus(realA.times(imB).plus(imA.times(realB)).times(Expression.Img()));
        }
        else if (a.isNUM() && !b.isInf()) {
            if (a.isOne()) {
                retval = new Expression(b);
            }
            else {
                retval = b.copy();
            }

            retval.multiplier = a.getMultiplier().times(b.getMultiplier());
        }
        // Multiplication of infinity
        else if ((a.isInf() || a.isNUM()) && b.isInf()) {
            // The default value for infinity is Inf
            retval = Expression.Inf();
            // Infinity times anything including itself is infinity. 
            // It's just a matter of determining the sign at this point.
            if (a.getMultiplier().times(b.getMultiplier()).isNegative()) {
                retval = retval.neg();
            }
            else if (a.isZero() || b.isZero()) {
                throw new UndefinedError('Infinity times zero is undefined!');
            }
        }
        else if (a.value === b.value) {
            // Define Rule: i * i = -1
            retval = new Expression(a)

            retval.multiplier = retval.getMultiplier().times(b.getMultiplier());
            const power = a.getPower().plus(b.getPower())
            if (power.isZero()) {
                retval = Expression.fromRational(retval.getMultiplier());
            }
            else {
                retval = Expression.setPower(retval, power);
            }

            const pow = retval.getPower();

            // Simplify powers of i
            if (retval.isI()) {
                retval = simplifyImaginary(retval);
            }
            // The abs is redundant for even powers for abs
            else if (retval.isFunction(ABS) && pow.isEven()) {
                retval = retval.getArguments()[0].pow(pow).times(retval.getMultiplier());
            }
            // Else just leave it undefined
        }
        // We can just flip because of commutativity. Add can figure out the rest.
        // ******************** RECIPROCALS ******************** //
        else if (RANK[a.type] > RANK[b.type]) {
            retval = multiply(b, a);
        }

        // Do not use else since this is a catchall for all unhandled cases.
        retval = retval || merge(a, b);

        // Check to make sure that the EXP can be unwrapped. Consider 3^(2/3)*3^(1/3)
        // This started out as an EXP but since its power is now 1, (3)^1, it can be downgraded 
        // to a simple NUM
        if (retval.isEXP() && retval.getPower().isOne()) {
            retval = retval.getArguments()[0].times(retval.getMultiplier());
        }

        // This ensures that imaginary numbers are properly expanded.
        if (Settings.EVALUATE) {
            retval = retval.distributeMultiplier();
        }
    }

    return retval;
}

function canMerge(a: Expression) {
    return a.isProduct() && a.getPower().isOne();
}

export function merge(a: Expression, b: Expression): Expression {
    let retval;
    let components: Expression[] = [];
    const expressionType = Expression.TYPES.CMB;
    let aCanMerge = canMerge(a);
    let bCanMerge = canMerge(b);

    // The multiplier is carried at the top of the expression they get moved and stripped from a and b;
    const multiplier = a.multiplier || b.multiplier ? a.getMultiplier().times(b.getMultiplier()) : undefined;
    if (multiplier) {
        a = new Expression(a);
        b = new Expression(b);
        a.multiplier = undefined;
        b.multiplier = undefined;
    }

    if (a.components && !b.components) {
        [b, a] = [a, b]; // Swap them
        [bCanMerge, aCanMerge] = [aCanMerge, bCanMerge];
    }

    // Case 1: Neither has an expression object so make an empty container and append a copy of the second.
    // If skipAction is true then it will just append and skip everything else. Remember, a != b
    if (!bCanMerge) {
        const keyA = a.type === Expression.TYPES.GRP ? a.value : a.keyValue();
        const keyB = b.type === Expression.TYPES.GRP ? b.value : b.keyValue();
        retval = one();
        // We want the multiplier at the top so remove from a and b
        retval.components = {};
        // Copy the components
        // TODO: This check should probably be handled by the keyValue method
        retval.components[keyA] = new Expression(a);
        retval.components[keyB] = new Expression(b);
        components = [a, b];
    }
    // Case 2: The second has an expression object and the other doesn't. This has to of course be of the
    // the right type. The first object gets added to the second object's expression container.
    else if (!aCanMerge && bCanMerge) {
        const key = a.keyValue();
        retval = new Expression(b);
        const subExpressions = retval.getComponents();
        let result: Expression;
        // No need to move the multiplier since sub components don't carry one 
        // and it has already been moved from a
        if (key in subExpressions) {
            result = multiply(a, subExpressions[key]);
        }
        else {
            result = new Expression(a);
        }

        // remove it if it resulted in one
        if (result.isOne()) {
            delete subExpressions[key]
        }
        else {
            subExpressions[key] = result;
        }

        components = Object.values(subExpressions);
    }
    // Case 3: They both have expression objects 
    else {
        retval = new Expression(a);
        retval.multiplier = a.getMultiplier().times(b.getMultiplier());
        const retvalComponents = retval.getComponents();
        const bExpressions = b.getComponents();

        for (const x in bExpressions) {
            const e = bExpressions[x];
            if (x in retvalComponents) {
                const result = multiply(e, retvalComponents[x]);
                // Don't multiply 1
                if (expressionType === Expression.TYPES.CMB && result.isOne()) {
                    delete retvalComponents[x];
                }
                else {
                    retvalComponents[x] = result;
                }
            }
            else {
                retvalComponents[x] = new Expression(e);
            }
        }

        components = Object.values(retvalComponents);
    }

    // Set the type
    retval.type = expressionType;

    // Update the value
    retval.value = Expression.getValue(components, 'text', expressionType);

    // Put the multiplier back
    if (multiplier && !multiplier.isOne()) {
        retval.multiplier = multiplier;
    }

    // Remove unnecessary complexity. If the type is CMB and can be made a lesser type then do so
    if (retval.isProduct() && Object.keys(retval.getComponents()).length === 1) {
        const onlyElement = anyObject(retval.getComponents());
        onlyElement.multiplier = onlyElement.getMultiplier().times(retval.getMultiplier());
        retval = onlyElement;
    }

    return retval;
}