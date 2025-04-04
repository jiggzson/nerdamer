import { Expression } from "../../classes/parser/operations";
import { expand } from "../expand/expand";

/**
 * Simplifies a complex number. Assumes expression is in the form a*i+b
 * 
 * @param x 
 */
function complexSimplify(x: Expression) {
    let retval = x;
    const p = x.getPower();
    const sgn = p.sign();
    if (p.isInteger()) {
        // Expand the power
        if (sgn === -1) {
            x = expand(x.invert());
        }

        const re = x.realPart();
        const im = x.imagPart();
        const d = re.pow('2').plus(im.pow('2'));
        retval = re.div(d).minus(im.div(d).times(Expression.Img()));
    }

    return retval;
}

export function simplify(x: Expression) {
    let retval = x;

    if (x.isComplex()) {
        retval = complexSimplify(retval);
    }

    return retval;
}