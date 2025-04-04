import { Expression } from "../../expression/Expression";
import { RANK, EXPRESSION_TYPES } from "../constants";
import { UndefinedError } from "../../../errors";
import { anyObject } from "../../../../utils/object";
import { Settings } from "../../../Settings";
import { one } from "../../expression/shortcuts";


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { NUM, VAR, EXP, FUN, GRP, CMB, CMP, INF } = EXPRESSION_TYPES;

export function add(a: Expression, b: Expression): Expression {
    let retval;

    if (Settings.DEFER_SIMPLIFICATION) {
        retval = join(a, b, false);
        retval.deferred = true;
    }
    else {
        const keyA = a.keyValue();
        const keyB = b.keyValue();

        // Distribute the multiplier if true
        if (Expression.DISTRIBUTE_MULTIPLIER) {
            a = a.distributeMultiplier();
            b = b.distributeMultiplier();
        }

        // It suffices to check if their keyValues are the same since x+x will be handled. 
        // We're only dealing with x^n+x^(!n) at this point.
        const isGroup = !a.isNUM() && keyA === keyB;

        if (a.isNUM() && b.isNUM()) {
            retval = Expression.fromRational(a.getMultiplier().plus(b.getMultiplier()));
        }
        else if ((a.isComplex() && b.isComplex())) {
            const re = a.realPart().plus(b.realPart())
            const im = a.imagPart().plus(b.imagPart()).times(Expression.Img());
            // Do a zero check here rather than placing that additional burden on join.
            retval = re.isZero() ? im : im.isZero() ? re : join(re, im); // Don't use add
        }
        else if (a.isZero()) {
            retval = new Expression(b);
        }
        else if (a.value === b.value && a.getPower().eq(b.getPower())) {
            // Check for infinity
            if (a.isInf()) {
                const x = a.getMultiplier();
                const y = b.getMultiplier();
                if (x.isNegative() && !y.isNegative() || y.isNegative() && !x.isNegative()) {
                    throw new UndefinedError('Infinity - Infinity is undefined!');
                }
            }

            retval = new Expression(a);

            const multiplier = a.getMultiplier().plus(b.getMultiplier());

            if (multiplier.isZero()) {
                retval = Expression.Number('0');
            }
            if (a.isSum() && b.isSum() && a.getPower().isOne() && b.getPower().isOne()) {
                retval = join(a, b);
            }
            else {
                retval.multiplier = multiplier;

                if (retval.power) {
                    // We can do this since a.power === b.power
                    retval = Expression.setPower(retval, a.getPower().copy());
                }
            }

            // Put back the power
            if (a.power) {
                retval = Expression.setPower(retval, a.getPower().copy());
            }

        }
        // Since we've already check for equal power and value we're not dealing with groups
        // These are stored by power rather than their value so x^n+x^(n+1) will be stored as
        // {n: x^n, n+1: x^(n+1)} for any power !== 0
        else if (isGroup) {
            retval = join(a, b, isGroup);
        }
        else if (a.isInf() && b.isInf()) {
            const x = a.getMultiplier();
            const y = b.getMultiplier();
            if (x.isNegative() && !y.isNegative() || y.isNegative() && !x.isNegative()) {
                throw new UndefinedError('Infinity - Infinity is undefined!');
            }
        }
        // We can just flip because of commutativity. Add can figure out the rest.
        // ******************** RECIPROCALS ******************** //
        else if (RANK[a.type] > RANK[b.type]) {
            retval = add(b, a);
        }

        // This is a catch all for all unhandled cases so do not use else above.
        retval = retval || join(a, b, isGroup);
    }

    return retval;
}

export function addPrefix(a: Expression) {
    // This does nothing but return the Expression
    return a;
}

function canJoin(a: Expression, b: Expression) {
    // In order for CMP or GRP to be able to join, it needs to have a multiplier and a power of one
    return (
        // Any value can be added to CMP
        a.type === CMP
        // b can only be added to a if the keyValue matches
        || a.type === GRP && a.keyValue() === b.keyValue()
        // Both the power and multiplier must be one, basically it's wrapped in parentheses
    ) && a.getPower().isOne() && (!a.multiplier || a.multiplier && a.getMultiplier().isOne());
}

/**
* This method is not designed for cases where a = b; This should be handled before getting here.
* This method only does element wise addition for powers of 1. For all else it just creates a new expression
* and puts them in a new container. 
* 
* @param a 
* @param b 
* @param action 
* @param skipAction 
* @returns 
*/
export function join(a: Expression, b: Expression, isGroup = false): Expression {
    let retval;
    let components: Expression[] = [];
    const expressionType = isGroup ? GRP : CMP;
    let aCanJoin = canJoin(a, b);
    let bCanJoin = canJoin(b, a);

    // Always keep the joinable expression on the right
    if (aCanJoin && !bCanJoin) {
        [b, a] = [a, b]; // Swap them
        [bCanJoin, aCanJoin] = [aCanJoin, bCanJoin]; // Swap the join condition
    }

    // Case 1: Neither has an expression object so make an empty container and append a copy of the second.
    // If skipAction is true then it will just append and skip everything else. Remember, a != b
    if (!bCanJoin) {
        let asSubExpression = false;
        // Case 1.a: We first get the keys and assume they're not sub-symbolics. For x^-1 and (x+x^2)^-1 for 
        // instance we get a tie. Not only are they key values the same, but so are their powers. They should 
        // be joined as sub-symbolics at this point. We perform this check to break the tie. We'll know this 
        // because we'll have two matching keys which shouldn't happen.
        let keyA = a.keyValue(asSubExpression, isGroup);
        let keyB = b.keyValue(asSubExpression, isGroup);

        // Check for matching keys and recalculate the keys if that's the case
        if (keyA === keyB) {
            asSubExpression = true;
            isGroup = false;
            keyA = a.keyValue(asSubExpression, isGroup);
            keyB = b.keyValue(asSubExpression, isGroup);
        }

        retval = one();
        retval.components = {};
        // Copy the components
        retval.components[keyA] = a.copy();
        retval.components[keyB] = b.copy();
        components = [a, b];
    }
    // Case 2
    // e.g. x + (x+1) or 2*(x+1) + (x+1)+y
    else if (!aCanJoin && bCanJoin) {
        retval = b.copy();
        const subExpressions = retval.getComponents();
        // We start with the more restrictive assumption. Taking the example from case 1,
        // we now have an expression in the form x^-1 + (x+x^2)^-1. The simpler from of the key
        // would just be x but we first want to make sure we're not dealing with case 1.a
        let asSubExpression = true;
        let key = a.keyValue(asSubExpression, false);

        // If no value was found then it's safe to use the less restrictive key so recalculate it
        if (!(key in subExpressions)) {
            asSubExpression = false;
            key = a.keyValue(asSubExpression, isGroup);
        }

        // Append the expression or add it to any existing expression if there's one
        if (key in subExpressions) {
            const result = add(a, subExpressions[key]);
            // It may have resulted in zero, so only add if that's not the case
            if (!result.isZero()) {
                subExpressions[key] = result;
            }
            else {
                // Otherwise remove it
                delete subExpressions[key];
            }
        }
        else {
            subExpressions[key] = a.copy();
        }

        components = Object.values(subExpressions);
    }
    // Case 3
    else {
        retval = a.copy();
        retval.multiplier = a.getMultiplier().times(b.getMultiplier());
        const retvalExpressions = retval.getComponents();
        const bExpressions = b.getComponents();

        for (const x in bExpressions) {
            const e = bExpressions[x];
            if (x in retvalExpressions) {
                const result = add(e, retvalExpressions[x]);
                // Don't add it if it's zero
                if (result.isZero()) {
                    // Remove the entry if it's zero
                    delete retvalExpressions[x];
                }
                else {
                    retvalExpressions[x] = result;
                }
            }
            else {
                retvalExpressions[x] = e.copy();
            }
        }

        components = Object.values(retvalExpressions);

    }

    // Some cleanup. The expression may have now become a single element. We'll know this because
    // the sub-components will only be one element long. If that's the case then that become the reval
    if ((retval.isSum() || retval.isProduct()) && components.length === 1) {
        const onlyElement = anyObject(retval.getComponents());
        // Move the multiplier
        if (retval.multiplier || onlyElement.multiplier) {
            onlyElement.multiplier = onlyElement.getMultiplier().times(retval.getMultiplier());
        }
        retval = onlyElement;
    }
    else {
        // If it's empty then the value is zero
        if (components.length === 0) {
            retval = Expression.Number('0');
        }
        else {
            // Set the type
            retval.type = expressionType;
            // Update the value
            retval.value = Expression.getValue(components, 'text', expressionType);
        }
    }

    return retval;
}