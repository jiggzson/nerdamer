import { Expression } from "../parser/operations";
import { Matrix } from "./Matrix";


export function imatrix(x: Expression) {
    let retval;
    if (!x.isInteger()) {
        retval = Expression.toFunction('imatrix', [x])
    }
    else {
        retval = Matrix.identity(Number(x))
    }

    return retval;
}