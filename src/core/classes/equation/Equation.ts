import { EQUATION } from "../parser/constants";
import { Base } from "../common";
import { Expression } from "../parser/operations";
import { ParserSupportedType } from "../parser/types";

export class Equation implements Base<Equation> {
    dataType = EQUATION;

    /**
     * The left-hand side of the equation
     */
    LHS: Expression;

    /**
     * The right-hand side of the equation
     */
    RHS: Expression;

    /**
     * Lets the parser know
     */
    isSetOfValues: boolean = false;

    constructor(lsh: Expression, rhs: Expression) {
        this.LHS = lsh;
        this.RHS = rhs;
    }

    toLHS() {
        const eq = this.copy();
        eq.LHS = eq.LHS.minus(this.RHS);
        eq.RHS = Expression.Number('0');

        return eq;
    }

    eq(eq: ParserSupportedType) {
        if (!Equation.isEquation(eq)) {
            return false;
        }

        return this.toLHS().eq(eq.toLHS());
    }

    copy() {
        // Create a blank copy
        const copy = new Equation(this.LHS, this.RHS);
        return copy;
    }

    text() {
        return `${this.LHS}=${this.RHS}`;
    }

    toString() {
        return this.text();
    }

    /**
     * Checks to see if the object provided is an equation
     * 
     * @param obj 
     * @returns 
     */
    static isEquation(obj: unknown): obj is Equation {
        if (obj === undefined) {
            return false;
        }

        return (obj as Equation).dataType === EQUATION;
    }
}