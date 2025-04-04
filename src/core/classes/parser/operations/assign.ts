import { ParserSupportedType } from "../types";
import { Equation } from "../../equation/Equation";
import { __, UnsupportedOperationError } from "../../../errors";
import { Expression } from ".";


export function setEqual(a: ParserSupportedType, b: ParserSupportedType) {
    if (!(a instanceof Expression || b instanceof Expression)) {
        throw new UnsupportedOperationError(__('unsupportedOperation'));
    }
    return new Equation(a as Expression, b as Expression);
}