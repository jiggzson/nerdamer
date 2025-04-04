import { add, addPrefix } from "./add";
import { multiply } from "./multiply";
import { divide } from "./divide";
import { power } from "./power";
import { subtract, subtractPrefix } from "./subtract";
import { Expression } from "../../expression/Expression";
import { mathFunctions } from "../../../linker";
import { __, ParserError, UnsupportedOperationError } from "../../../errors";
import { ParserFunctionCall, Operation, PreFixFunction, PostFixFunction, ValuesSetType, EquationConstructorCall } from "../types";
import { factorial } from "../../../functions/math";
import { Settings } from "../../../Settings";
import { comma } from "./comma";
import { Vector } from "../../vector/Vector";
import { ParserSupportedType } from "../types";
import { Matrix } from "../../matrix/Matrix";
import { setEqual } from "./assign";
import { EQUATION } from "../constants";
import { Equation } from "../../equation/Equation";

/**
 * The wrapper used to call functions within the parser.
 * 
 * @param functionName The name of the function being called
 * @param args 
 * @returns 
 */
export function callFunction(functionName: string, args: Expression[]) {
    // The details regarding the function
    const attributes = mathFunctions[functionName];

    if (attributes === undefined) {
        throw new ParserError(`Unsupported function ${functionName}`);
    }

    // The minimum required arguments for this function
    /**
     * fn: The function to be called
     * minArgs: The minimum arguments allowed
     * maxArgs: The maximum arguments allowed
     * maxPrecision: The maximum precision available for the function
     */
    const [fn, minArgs, maxArgs, maxPrecision] = attributes;

    // Complain if the number of arguments provided is less that what is allowed
    if (minArgs > -1 && args.length < minArgs) {
        throw new ParserError(`${functionName} requires a minimum of ${minArgs} arguments but ${args.length} provided!`);
    }

    // Complain if the number of arguments provided is greater than what is allowed
    if (maxArgs > -1 && args.length > maxArgs) {
        throw new ParserError(`${functionName} allows a maximum of ${maxArgs} arguments but ${args.length} provided!`);
    }

    let result: Expression;
    // Call and return
    if (!fn || Settings.DEFER_SIMPLIFICATION) {
        result = Expression.toFunction(functionName, args);
    }
    else {
        result = fn.apply(fn, args);
    }

    // Ensure that this function always returns even if it's a symbolic function. This will
    // occur if the function didn't return a value.
    if(fn && !result) {
        result = Expression.toFunction(functionName, args);
    }

    // Let all future calls know that an inferior precision was used.
    if(maxPrecision) {
        result.precision = maxPrecision;
    }

    return result;
}
/**
 * Combines all base operations into one object for parser. 
 */
export const _: { [functionName: string]: (Operation | ParserFunctionCall | PreFixFunction | PostFixFunction | EquationConstructorCall) } = {
    add: add as Operation,
    subtract: subtract as Operation,
    multiply: multiply as Operation,
    divide: divide as Operation,
    power: power as Operation,
    // mod: mod,
    //@ts-expect-error bump
    comma: comma as Operation,
    // assign: assign,
    // functionAssign: functionAssign,
    setEqual: setEqual,
    // lt: lt,
    // lte: lte,
    // eq: eq,
    // gt: gt,
    // gte: gte,
    subtractPrefix: subtractPrefix as PreFixFunction,
    addPrefix: addPrefix as PreFixFunction,
    factorial: factorial as PostFixFunction,
    // doubleFactorial: doubleFactorial,
    // dot: dot,
    // IN: IN,
    // Function caller
    callFunction: callFunction as ParserFunctionCall
};

export function processValuesSet(type: string, values: (Expression | Vector)[]) {
    return new Vector(values);
}

/**
 * Applies the function over all the elements or elements
 * 
 * @param a 
 * @param b 
 * @param fn 
 * @param operator 
 * @returns 
 */
export function apply(a: ParserSupportedType, b: ParserSupportedType | undefined, operation: Operation, flags?: {[key: string]: boolean | string}) {
    let retval: ParserSupportedType;
    flags = Object.assign({iterates: true}, flags);
    const iterates = flags.iterates;

    // Deal with two set of values
    if(a.isSetOfValues && b?.isSetOfValues && iterates) {
        if(a instanceof Vector && b instanceof Vector) {
            // Check to make sure that the lengths are the same
            if(a.elements.length !== b.elements.length) {
                throw new UnsupportedOperationError(__('nonMatchingDimensions'));
            }
            retval = new Vector([]);
            a.each((e, i) => {
                const result = apply(e, b.elements[i], operation, flags);
                (retval as Vector).elements[i] = result;
                return result;
            });
        }
        else if(a instanceof Matrix && b instanceof Matrix) {
            return a;
        }
        else {
            throw new UnsupportedOperationError(__('unsupportedOperation'));
        }
    }
    // If a is a set of values then loop over each one and apply the operation
    else if(a.isSetOfValues && iterates) {
        const x = a as ValuesSetType;
        retval = x.each((e) => {
            return apply(e, b, operation, flags);
        });
    }
    // If b is a set of values then loop over each one and apply the operation
    else if(b?.isSetOfValues && iterates) {
        const y = b as ValuesSetType;
        retval = y.each((e) => {
            return apply(a, e, operation, flags);
        });
    }
    else if(a.dataType === EQUATION) {
        const x = a as Equation;
        let lhs: ParserSupportedType;
        let rhs: ParserSupportedType;

        if(b) {
            if(!(b instanceof Expression)) {
                throw new UnsupportedOperationError(__('unsupportedType', {type: typeof b}));
            }
            lhs = operation(x.LHS, b);
            rhs = operation(x.RHS, b);
        }
        else {
            lhs = operation(x.LHS);
            rhs = operation(x.RHS);
        }

        // Arrays are unsupported in Equations
        if(Array.isArray(lhs) || Array.isArray(rhs)) {
            throw new UnsupportedOperationError(__('unsupportedType', {type: 'Array'}));
        }

        return new Equation(lhs as Expression, rhs as Expression)
    }
    else if(b?.dataType === EQUATION) {
        const y = b as Equation;
        if(!(a instanceof Expression)) {
            throw new UnsupportedOperationError(__('unsupportedType', {type: typeof a}));
        }
        const lhs = operation(a, y.LHS);
        const rhs = operation(a, y.RHS);
        
        // Arrays are unsupported in Equations
        if(Array.isArray(lhs) || Array.isArray(rhs)) {
            throw new UnsupportedOperationError(__('unsupportedType', {type: 'Array'}));
        }

        return new Equation(lhs as Expression, rhs as Expression)
    }
    // Now for some famous last words:
    // Type assertion has lead to some nasty hidden bugs but at this point it is guaranteed that we have two Expressions.
    else {
        retval = b ? operation(a as Expression, b as Expression) : operation(a);
    }

    return retval;
}

export function distribute(fn: (v: ParserSupportedType)=> ParserSupportedType, vector: Vector) {
    const retval = vector.each((v)=>{
        return fn(v);
    });

    return retval;
}

// export function resolve(a: ParserSupportedType, b: ParserSupportedType, fn: Operation) {
//     if((a.isSetOfValues || b.isSetOfValues)){
//         return apply(a, b, fn);
//     }
//     else if(a.dataType === EQUATION) {
//         const x = a as Equation;
//         if(!(b instanceof Expression)) {
//             throw new UnsupportedOperationError(__('unsupportedType', {type: typeof b}));
//         }
//         const lhs = fn(x.LHS, b);
//         const rhs = fn(x.RHS, b);

//         // Arrays are unsupported in Equations
//         if(Array.isArray(lhs) || Array.isArray(rhs)) {
//             throw new UnsupportedOperationError(__('unsupportedType', {type: 'Array'}));
//         }

//         return new Equation(lhs, rhs)
//     }
//     else if(b.dataType === EQUATION) {
//         const y = b as Equation;
//         if(!(a instanceof Expression)) {
//             throw new UnsupportedOperationError(__('unsupportedType', {type: typeof a}));
//         }
//         const lhs = fn(a, y.LHS);
//         const rhs = fn(a, y.RHS);
        
//         // Arrays are unsupported in Equations
//         if(Array.isArray(lhs) || Array.isArray(rhs)) {
//             throw new UnsupportedOperationError(__('unsupportedType', {type: 'Array'}));
//         }

//         return new Equation(lhs, rhs)
//     }
//     else {
//         return fn(a as Expression, b as Expression);
//     }
// }