import { Rational, Expression } from "../parser/operations";
import { __, PolynomialError, UnsupportedOperationError } from "../../errors";
import { expand } from "../../functions/expand/expand";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { printE } from "../../../utils/debug";
import { ParserValuesObject, SupportedInputType } from "../parser/types";
import { POLYNOMIAL, TERM } from "../parser/constants";
import { arrayAddUnique, isSorted } from "../../functions/utils";
import { remove } from "../../../utils/array";
import { arrayToObject } from "../../../utils/object";
import { sum } from "../../functions/numeric";
import { productInRange } from "../../functions/bigint";
import { diff } from "../../../calculus/derivative";


export type Ordering = 'none' | 'deg' | 'lex' | 'revlex' | 'grlex' | 'grevlex' | 'byvar';

export type PolyType = string | Polynomial | Expression;

export type TermPowerObject = { [power: string]: Expression }

/**
 * The monomial term
 */
type PowersObject = { [variable: string]: number };
export class Term {
    dataType: string = TERM;
    // The term coefficient
    coeff: Expression;
    // The powers of the object mapped as {variable: power}
    powers: PowersObject;
    // The array of variables in the term including constants
    variables: string[];
    //The expression representation of the term
    valueString?: string;
    // The multidegree array e.g. a^2*b*c^5 -> [2, 1, 5]
    multidegArray?: number[];
    // The total power of the term
    totalPower?: number;
    // The expression representation of the term. This is only generated if getExpression is called.
    expression?: Expression;
    // The total number of non-unit variables in the term. e.g. given variables [x, y, z] with a multideg of [1, 0, 3]
    // this will return 2 since y = 1.
    length: number;

    constructor(coeff: Expression | string, powers: PowersObject | string, variables: string[]) {
        if (typeof powers === 'string') {
            this.powers = {};
            powers.split(',').forEach((x, i) => { this.powers[variables[i]] = Number(x) });
        }
        else {
            this.powers = powers;
        }
        this.coeff = typeof coeff === 'string' ? Expression.toExpression(coeff) : coeff;

        this.length = this._getLength();

        // NOTE: Do not make of copy of the variables object. We need it to be a reference to the parent variables.
        this.variables = [...variables].sort();
    }

    /**
     * Gets the total number of non-unit variables in the term
     * 
     * @returns 
     */
    _getLength() {
        let length = 0;
        for (const x in this.powers) {
            if (this.powers[x] > 0)
                length++;
        }

        return length;
    }

    /**
     * Forces the multidegree array to be recalculated
     * 
     * @returns 
     */
    _updateMultiDegArray() {
        this.multidegArray = this.multideg(this.variables);
        return this;
    }

    /**
     * Forces the total power to be recalculated
     * 
     * @returns 
     */
    _updateTotalPower() {
        this.totalPower = 0;
        for (const x in this.powers) {
            this.totalPower += this.deg(x);
        }

        return this;
    }

    /**
     * This should be called if the 
     * 
     * @returns 
     */
    _update() {
        this._updateMultiDegArray();
        this._updateTotalPower();
        this.length = this._getLength();
        return this;
    }

    /**
     * Pulls the derivative of a term
     * 
     * @param variable 
     * @param n 
     */
    diff(variable: string, n = 1) {
        const p = this.deg(variable);
        let retval;
        if (n > p) {
            retval = new Term('0', '0', []);
        }
        else {
            retval = this.copy();
            retval.powers[variable] = p - n;
            const d = n - 1;
            const r = productInRange(p - d, p);
            retval.coeff = retval.coeff.times(BigInt(r));
        }

        return retval;
    }

    /**
     * Calculates the LCM of two terms with numeric coefficients
     * TODO: Extend to non-numeric coefficients
     * 
     * @param t The term to be used to calculate the LCM
     * @param withCoeff If true, then the coefficient will be included with the LCM
     */
    LCM(t: Term, withCoeff = false) {
        const variables = arrayAddUnique([...this.variables], t.variables);

        const powers: PowersObject = {};
        // Calculate the max power between this and t.
        for (const v of variables) {
            powers[v] = Math.max(this.deg(v), t.deg(v));
        }

        const coeff = withCoeff ? Expression.fromRational(this.coeff.getMultiplier().LCM(t.coeff.getMultiplier())) : '1';

        return new Term(coeff, powers, variables);
    }

    /**
     * Divides this term by the provided term
     * 
     * @param x 
     */
    div(t: Term) {
        const retval = this.copy();
        retval.coeff = retval.coeff.div(t.coeff);
        for (const v in t.powers) {
            if (!retval.variables.includes(v)) {
                retval.variables.push(v);
            }
            retval.deg(v, retval.deg(v) - t.deg(v));
        }
        return retval._update();
    }

    /**
     * Multiplies this term with the given term
     * 
     * @param x 
     */
    times(x: Term) {
        const retval = this.copy();
        retval.coeff = retval.coeff.times(x.coeff);
        for (const v in x.powers) {
            if (!retval.variables.includes(v)) {
                retval.variables.push(v);
            }
            retval.deg(v, retval.deg(v) + x.deg(v));
        }
        return retval._update();
    }

    /**
     * Calculates the multidegree array
     * 
     * @param variables 
     * @returns 
     */
    multideg(variables: string[]) {
        const arr: number[] = [];
        for (const v of variables) {
            arr.push(this.deg(v));
        }

        return arr;
    }

    /**
     * Fetches the multidegree array
     * 
     * @returns 
     */
    getMultidegArray() {
        if (this.multidegArray === undefined) {
            this._updateMultiDegArray();
        }

        return this.multidegArray!;
    }

    /**
     * Get the term with a unit coefficient. For 3*x^2*y this will return x^2*y
     * 
     * @returns 
     */
    getValueString(useVariables?: string[]) {
        // If the user variables have been specified then force regeneration of the string.
        if (this.valueString === undefined || useVariables !== undefined) {
            if (this.getTotalPower() === 0) {
                this.valueString = '1';
            }
            else {
                const vars = useVariables || [...this.variables].sort();
                const vArray: string[] = [];
                for (const v of vars) {
                    const p = this.deg(v);
                    const pv = p === 1 ? '' : Expression.POW_OPR + p;
                    if (p !== 0) {
                        vArray.push(`${v}${pv}`);
                    }
                }

                this.valueString = vArray.join('*');
            }
        }

        return this.valueString;
    }

    /**
     * Gets the total power of the term
     * 
     * @returns 
     */
    getTotalPower() {
        if (this.totalPower === undefined) {
            this._updateTotalPower();
        }
        return this.totalPower!;
    }

    /**
     * Gets the text representation of the monomial
     * 
     * @returns 
     */
    text(useVariables?: string[]) {
        let c = this.coeff.text();

        // Wrap sums in brackets
        if (this.coeff.isSum()) {
            c = `(${c})`;
        }

        let retval;
        // Zero times anything is zero so nothing left to do
        if (c === '0') {
            retval = c;
        }
        else {
            let v = this.getValueString(useVariables);
            // Remove the safety '1';
            if (v === '1') {
                v = ''
            }
            // Add multiplication sign
            if (v) {
                if (c === '1') {
                    c = ''
                }
                else if (c === '-1') {
                    c = '-'
                }
                else {
                    c += '*';
                }
            }

            retval = `${c}${v}`;
        }

        return retval;
    }

    /**
     * Gets the degree of the individual variable
     * 
     * @param x 
     * @returns 
     */
    deg(v: string): number;
    deg(v: string, value: number): Term;
    deg(v: string, value?: number): (number | Term) {
        if (value !== undefined) {
            this.powers[v] = value;
            return this;
        }
        return this.powers[v] || 0;
    }

    /**
     * Checks to see if the term is equal to zero. 
     * 
     * @returns 
     */
    isZero() {
        return this.coeff.isZero();
    }

    /**
     * Checks if a terms equals a number
     * 
     * @param n 
     * @returns 
     */
    eqNumber(n: number | string) {
        return sum(...Object.values(this.powers)) === 0 && this.coeff.eq(n);
    }

    /**
     * Checks for equality with another Term
     * 
     * @param t 
     * @returns 
     */
    eq(t: Term) {
        return this.div(t).eqNumber(1);
    }

    /**
     * Checks to see if the term is just a constant term
     * 
     * @returns 
     */
    isConstant() {
        for (const p in this.powers) {
            if (this.powers[p] !== 0)
                return false;
        }
        return true;
    }

    /**
     * Checks if one term can divide another.
     * 
     * @param t 
     * @returns 
     */
    divides(t: Term) {
        // If it's a number, then it divides so easy check and done
        if (this.getTotalPower() === 0) {
            return true;
        }
        // Divides essentially loops through the dividend and ensures that each power is >= to the divisor for each variable
        for (const x in this.powers) {
            if (this.deg(x) > t.deg(x)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Calculates the difference between two pArrays
     * 
     * @param term 
     * @returns 
     */
    difference(term: Term) {
        const a = this.getMultidegArray();
        const b = term.getMultidegArray();
        const diff: number[] = [];
        for (let i = 0; i < a.length; i++) {
            diff[i] = a[i] - b[i];
        }
        return diff;
    }

    /**
     * Returns true of the given term can be added or subtracted from this one. e.g. (x^2, x) will return false.
     * 
     * @param t 
     * @returns 
     */
    canAddOrSubtract(t: Term) {
        return this.getValueString() === t.getValueString();
    }

    /**
     * Gets the Term as an expression
     * 
     * @returns 
     */
    getExpression() {
        if (this.expression === undefined) {
            this.expression = this.coeff.times(this.getValueString());
        }

        return this.expression;
    }

    /**
     * Creates a copy of the Term
     * 
     * @returns 
     */
    copy() {
        return new Term(new Expression(this.coeff), { ...this.powers }, this.variables);
    }

    toString() {
        return this.text();
    }

    /**
     * Checks if the given object is a Term
     * 
     * @param obj 
     * @returns 
     */
    public static isTerm(obj: unknown): obj is Term {
        if (obj === undefined) {
            return false;
        }

        return (obj as Term).dataType === TERM;
    }
}
/**
 * Polynomial orderings
 * https://www.lpthe.jussieu.fr/~talon/orderings.html
 * Polynomial Modulo
 * https://math.stackexchange.com/questions/2334638/evaluation-of-polynomial-modulo-in-gf2
 */
export class Polynomial {
    dataType: string = POLYNOMIAL;
    // The variable names in this array. Not to be confused with the variable expressions
    variables: string[];
    // The terms
    terms: Term[];
    // True if this is a multivariate polynomial
    isMultivariate: boolean;
    // The ordering currently being used by the polynomial. 
    ordering: Ordering = 'none';
    // The expression used to create the polynomial
    expression: Expression;

    /**
     * 
     * @param p The polynomial string or Expression object
     * @param ordering The polynomials ordering
     * @param vars The variables and the other in which to use
     */
    constructor(p: Expression | string | Polynomial, vars?: string[], ordering?: Ordering) {
        if (Polynomial.isPolynomial(p)) {
            this.expression = new Expression(p.expression);
            this.variables = [...p.variables];
            this.ordering = p.ordering;
            this.isMultivariate = p.isMultivariate;
            this.terms = p.terms.map((t) => t.copy());
        }
        else {
            // Set the default ordering if none was provided
            ordering ??= Polynomial.defaultOrdering;

            // Parse it to a Expression
            let x = typeof p === 'string' ? Expression.toExpression(p) : p;

            // Disqualify all other types except for Expression. This needs to be updated if other types
            // are supported in the future.
            if (!(Expression.isExpression(x))) {
                throw new UnsupportedOperationError(__('unsupportedType', { type: typeof x }));
            }

            if (!x.isPolynomial()) {
                throw new PolynomialError(__('NotAPolynomial'));
            }

            // Expand the expression but only if needed. This will be needed if the value has a bracket
            // or if the expression has a power greater than one.
            if (x.value.includes('(') || x.isSum() && x.getPower().gt('1')) {
                x = expand(x);
            }

            this.expression = x;
            let variables: string[];
            if (!vars) {
                variables = x.variables();
                if (!isSorted(variables)) {
                    variables.sort();
                }
            }
            else {
                variables = vars;
            }

            this.variables = variables;

            // Mark it as univariate or multivariate
            this.isMultivariate = this.variables.length > 1;

            // Add the components to the terms array
            this.terms = [];

            // Calculate the coefficients. Coeffs will come back as a collection of objects so for instance
            // a*x*y + b*x^2*y will come back as [a, '1,1'] & [b, '2,1']. It's preferred to have it in object form
            // TODO: this should probably be done with `coeffs`.
            x.coeffs(...this.variables).each((coeff, powers) => {
                this.terms.push(new Term(coeff, powers, this.variables))
            });

            // Set a blank array if none was provided or calculated
            this.variables = this.variables || [];

            // Order it
            this.order(ordering);
        }
    }

    /**
     * Adds or removes a term from the terms array of the polynomial
     * 
     * @param t 
     * @param action 
     * @returns 
     */
    _appendTerm(t: Term, action: 'plus' | 'minus') {
        // Try to add it to an existing
        for (let i = 0; i < this.terms.length; i++) {
            const e = this.terms[i];
            if (e.canAddOrSubtract(t)) {
                e.coeff = e.coeff[action](t.coeff);
                if (e.coeff.isZero()) {
                    remove(this.terms, e);
                }
                return;
            }
        }
        const c = t.copy();
        if (action === 'minus') {
            c.coeff = c.coeff.neg();
        }
        // No existing was found so add it to the terms
        this.terms.push(c);

        // Update since the ordering may have changes
        this.order();
    }

    /**
     * Intermediate function for appending Term of Polynomial
     * 
     * @param p The polynomial being added to this one.
     * @returns 
     */
    _append(x: Term | Polynomial, action: 'plus' | 'minus') {
        const retval = new Polynomial(this);
        retval.variables = arrayAddUnique(x.variables, retval.variables);

        // Sort if variables were added
        if (retval.variables && x.variables && retval.variables.length > x.variables.length) {
            retval.variables.sort();
        }

        if (Polynomial.isPolynomial(x)) {
            for (const ta of x.terms) {
                retval._appendTerm(ta, action);
            }
        }
        else {
            retval._appendTerm(x, action);
        }

        return retval.terms.length === 0 ? new Polynomial('0') : retval;
    }

    /**
     * Returns the multi-degree of the polynomial
     * 
     * @returns 
     */
    multideg() {
        return this.terms[0].multidegArray;
    }

    /**
     * Returns the degree of the polynomial
     * 
     * @returns 
     */
    deg() {
        return this.LT().getTotalPower();
    }

    /**
     * Reorders the polynomial in the requested ordering if it's not already in that particular ordering.
     * 
     * @param ordering 
     * @returns 
     */
    order(ordering?: Ordering) {
        if (this.variables.length < 2) {
            this.sort();
            this.ordering = 'deg';
        }
        else {
            // Set the new ordering if provided
            if (ordering) {
                this.ordering = ordering;
            }

            switch (this.ordering) {
                case 'lex':
                    this.lexSort();
                    break;
                case 'grevlex':
                    this.grevlexSort();
                    break;
                case 'revlex':
                    this.revlexSort();
                    break;
                case 'grlex':
                default:
                    this.grlexSort();
                    break;
            }
        }

        return this;
    }

    /**
     * Returns the leading coefficient of the polynomial
     * 
     * @returns 
     */
    LC() {
        return this.LT().coeff;
    }

    /**
     * Returns the leading monomial
     * 
     * @returns 
     */
    LM() {
        const LT = this.LT();
        return new Term('1', { ...LT.powers }, [...LT.variables]);
    }

    /**
     * Returns the leading term of the polynomial
     * 
     * @returns 
     */
    LT() {
        return this.terms[0];
    }

    /**
     * Return a new monic polynomial from this polynomial
     * 
     * @returns 
     */
    monic() {
        const p = new Polynomial(this);
        const LT = this.LT();

        // If it's a constant the we're done
        if (LT && !LT.isConstant()) {
            const c = LT.coeff;
            for (const t of p.terms) {
                t.coeff = t.coeff.div(c);
            }
        }

        return p;
    }

    /**
     * Checks to see if a polynomial divides the given polynomial
     * 
     * @param p 
     * @returns 
     */
    divides(p: Polynomial) {
        return this.LT().divides(p.LT());
    }

    /**
     * Checks if the Polynomial is zero
     * 
     * @returns 
     */
    isZero() {
        return this.terms.length === 0 || this.LT().isZero();
    }

    /**
     * Checks to see if the polynomial evaluates to a constant
     * 
     * @returns 
     */
    isConstant() {
        return this.getExpression().isConstant();
    }

    /**
     * Gets the expression used to generate the polynomial
     * 
     * @returns 
     */
    getExpression() {
        return this.expression;
    }

    /**
     * Returns the polynomial in expression form
     * 
     * @returns 
     */
    text() {
        if (this.terms.length === 0 || this.terms.length === 1 && this.terms[0].isZero()) {
            return '0';
        }

        const textArray: string[] = [];

        for (const t of this.terms) {
            const txt = t.text(this.variables);
            if (txt !== '0') {
                textArray.push(txt);
            }
        }

        return textArray.join('+').replace(/\+-/g, '-');
    }

    /**
     * Performs a derivative with respect to a variable
     * 
     * @param v 
     * @returns 
     */
    diff(v: string, n = 1) {
        if (n === 0) {
            return new Polynomial(this);
        }
        // let retval = new Polynomial('0');
        // for (const t of this.terms) {
        //     retval = retval.plus(t.diff(v, n));
        // }

        // return retval;

        const dx = v ? Expression.toExpression(v) : undefined;
        return new Polynomial(diff(this.getExpression(), dx, n));
    }

    /**
     * Returns the polynomial in a form for easy debugging.
     * 
     * @returns 
     */
    toString() {
        return this.text();
    }

    /**
     * Sorts the terms in the standard form of decreasing powers.
     */
    sort() {
        this.terms.sort((a: Term, b: Term) => {
            return b.getTotalPower() > a.getTotalPower() ? 1 : -1;
        });

        return this;
    }

    /**
     * Sorts the terms by {@link lex} lexicographic order
     * 
     * @returns 
     */
    lexSort() {
        this.terms.sort((a: Term, b: Term) => {
            return Polynomial.lex(a, b);
        });
        // Mark it
        this.ordering = 'lex';

        return this;
    }

    /**
     * Sorts the terms by graded lexicographic order
     * grlex first compares their powers. If their powers are equal then it breaks ties using {@link lex} lexicographic order.
     * 
     * @returns 
     */
    grlexSort() {
        this.terms.sort((a: Term, b: Term) => {
            return Polynomial.grlex(a, b);
        });

        //Mark it
        this.ordering = 'grlex';

        return this;
    }

    /**
     * Sorts the terms by graded lexicographic order
     * grevlex first compares their powers. If their powers are equal then it breaks ties using {@link revlex} reverse lexicographic order.
     * 
     * @returns 
     */
    grevlexSort() {
        this.terms.sort((a: Term, b: Term) => {
            return Polynomial.grevlex(a, b);
        });

        // Mark it
        this.ordering = 'grevlex';

        return this;
    }

    /**
     * Sorts the terms by {@link revlex} reverse lexicographic order
     * 
     * @returns 
     */
    revlexSort() {
        // There is only one sort for univariate
        this.terms.sort((a: Term, b: Term) => {
            return Polynomial.revlex(a, b);
        });

        // Mark it
        this.ordering = 'revlex';

        return this;
    }

    /**
     * Subtracts a Polynomial or a Term
     * 
     * @param p The polynomial being subtracted from this one.
     * @returns 
     */
    minus(x: Term | Polynomial): Polynomial {
        return this._append(x, 'minus');
    }

    /**
     * Adds a Polynomial or a Term. 
     * 
     * @param p The polynomial being subtracted from this one.
     * @returns 
     */
    plus(x: Term | Polynomial): Polynomial {
        return this._append(x, 'plus');
    }

    /**
     * Gets the frequency of variables and the total count of their power in a polynomial
     * 
     * @returns 
     */
    variableFrequency() {
        const count = {};

        for (const t of this.terms) {
            for (const v in t.powers) {
                // The counter object
                let o = count[v];
                if (!o) {
                    count[v] = o = { variable: v, count: 0, deg: 0 };
                }
                // Check the degree. We only increment for degrees > 0. Since it's a polynomial,
                // no negative degrees should exist
                const deg = t.powers[v];
                if (deg !== 0) {
                    o.count++;
                    o.deg += deg;
                }
            }
        }

        return count;
    }

    /**
     * Gets the maximum variable occurrence in the polynomial. If two or more variables have 
     * an equal number of occurrences then they will be included in the set 
     * @example
     * // returns {a:{variable:a,count:2,deg:2},q:{variable:q,count:2,deg:5}} 
     * new Polynomial('q^3*a+q^2*a*2').maxVariableFrequency()
     * @returns 
     */
    maxVariableFrequency() {
        const freq = this.variableFrequency();
        let max: { [key: string]: (number | string) }[] = [];

        for (const v in freq) {
            const c = freq[v].count;
            if (!max[0] || max[0].count < c) {
                // Either set it or wipe the whole thing
                max = [freq[v]];
            }
            else if (max[0].count === c) {
                max.push(freq[v]);
            }
        }

        return arrayToObject(max, (k) => { return k.variable });
    }

    /**
     * Multiplies two polynomials.
     * 
     * @param p The polynomial being multiplied to this one.
     * @returns 
     */
    times(x: Term | Polynomial): Polynomial {
        let retval;
        if (Term.isTerm(x)) {
            retval = new Polynomial(this);
            // Update the variables
            retval.variables = arrayAddUnique(retval.variables, x.variables);

            if (isSorted(this.variables)) {
                retval.variables.sort();
            }

            for (let i = 0; i < retval.terms.length; i++) {
                retval.terms[i] = retval.terms[i].times(x);
            }
        }
        else {
            retval = new Polynomial(this.getExpression().times(x.getExpression()), undefined, this.ordering);
        }

        return retval;
    }

    /**
     * Raises the polynomial to a power. 
     * 
     * @param p 
     * @returns 
     */
    pow(p: SupportedInputType) {
        return new Polynomial(this.getExpression().pow(p), undefined, this.ordering);
    }

    /**
     * Checks if two polynomials are equal
     * 
     * @param p 
     * @returns 
     */
    eq(p: Polynomial) {
        return this.minus(p).isZero();
    }

    /**
     * Evaluates a polynomial given a set of values
     * 
     * @param values The values to be evaluated.
     * @returns 
     */
    evaluate(values: ParserValuesObject) {
        return Expression.toExpression(this.getExpression(), values);
    }

    /**
     * Gets all the numeric coefficients in the polynomial
     * 
     * @returns 
     */
    numericCoeffs() {
        return this.terms.map((t) => t.coeff.getMultiplier());
    }

    commonTermVariables() {
        const common: { [variable: string]: number } = {};
        // Collect common variables
        for (const v of this.variables) {
            let min: number | undefined;
            for (const t of this.terms) {
                const deg = t.deg(v);
                if (deg === 0) {
                    // Remove the min
                    min = undefined;
                    break;
                }
                // Set the min common degree
                min = min === undefined ? deg : Math.min(min, deg);
            }
            // Mark it
            if (min) {
                common[v] = min;
            }
        }

        return common;
    }

    /**
     * Divides all terms by their numeric gcd. Mutates the object.
     * 
     * @param reduceVariables If true the common variables will be removed as well
     * @param mutate If true the current object will be modified and returned
     * @returns 
     */
    gcdFree(reduceVariables = false, mutate = false) {
        const target = mutate ? this : new Polynomial(this);

        // If it's a constant then there's nothing left to do
        if (target.getExpression().isConstant())
            return target;

        const coeffs = target.numericCoeffs();
        let common;

        let gcd = Expression.fromRational(Rational.GCD(...coeffs));
        if (target.LC().sign() === -1) {
            gcd = gcd.neg();
        }

        if (reduceVariables) {
            common = target.commonTermVariables();
        }

        for (let i = 0; i < target.terms.length; i++) {
            const term = target.terms[i];
            // If reduction of the variable is requested then do so.
            if (common) {
                // Reduce the variables
                for (const x in common) {
                    term.powers[x] -= common[x];
                }
            }

            term.coeff = term.coeff.div(gcd);
        }

        return target;
    }

    /**
     * Sorts by lexicographic order. The power tuples are subtracted and the first 
     * non-negative value from the left is used to sort. Note that variables are 
     * first sorted in alphabetical order.
     * 
     * @returns 
     */
    public static lex(a: Term, b: Term) {
        const difference = a.difference(b);
        for (let i = 0; i < difference.length; i++) {
            if (difference[i] !== 0) {
                return Math.sign(difference[i]) === -1 ? 1 : -1;
            }
        }
        return 1;
    }

    /**
     * Sorts by reverse lexicographic order. The power tuples are subtracted and the first 
     * non-negative value from the right is used to sort
     * 
     * @returns 
     */
    public static revlex(a: Term, b: Term) {
        const difference = a.difference(b);
        for (let i = difference.length - 1; i >= 0; i--) {
            if (difference[i] !== 0) {
                return Math.sign(difference[i]);
            }
        }
        return -1;
    }

    /**
     * Sorts by graded lexicographic order. The abs(power) is first compared and then
     * lex is used to break ties.
     * 
     * @param a 
     * @param b 
     */
    public static grlex(a: Term, b: Term) {
        if (a.getTotalPower() === b.getTotalPower()) {
            return Polynomial.lex(a, b);
        }
        return a.getTotalPower() > b.getTotalPower() ? -1 : 1;
    }

    /**
     * Sorts by graded lexicographic order. The abs(power) is first compared and then
     * revlex is used to break ties.
     * 
     * @param a 
     * @param b 
     */
    public static grevlex(a: Term, b: Term) {
        if (a.getTotalPower() === b.getTotalPower()) {
            return Polynomial.revlex(a, b);
        }
        return a.getTotalPower() > b.getTotalPower() ? -1 : 1;
    }

    /**
     * Sorts an array given a specific ordering using their LT
     * 
     * @param polyArray 
     * @param ordering 
     * @returns 
     */
    public static polyArraySort(polyArray: Polynomial[], ordering?: Ordering) {
        ordering ??= Polynomial.defaultOrdering;

        // First put all the polynomials in the correct ordering
        polyArray = polyArray.map((x) => { return x.order(ordering); });

        let sortFunction: (a: Term, b: Term) => number;

        switch (ordering) {
            case 'lex':
                sortFunction = Polynomial.lex;
                break;
            case 'grevlex':
                sortFunction = Polynomial.grevlex;
                break;
            case 'revlex':
                sortFunction = Polynomial.revlex;
                break;
            case 'grlex':
            default:
                sortFunction = Polynomial.grlex;
                break;
        }

        polyArray = polyArray.sort((a: Polynomial, b: Polynomial) => {
            return sortFunction(a.LT(), b.LT());
        });

        return polyArray;
    }

    /**
     * Converts a string to a Polynomial. If a polynomial is provided, it's returned untouched.
     * If a polynomial is provided and no ordering, then the polynomial's ordering will be used.
     * If no ordering is provided for all others then the Polynomial.defaultOrdering will be used.
     * 
     * @param p 
     */
    public static toPolynomial(p: PolyType, ordering?: Ordering, variables?: string[]): Polynomial {
        if (!(p instanceof Polynomial)) {
            p = new Polynomial(p, variables, ordering || Polynomial.defaultOrdering);
        }
        else if (p.ordering !== ordering) {
            p.order(ordering);
        }

        return p;
    }

    /**
     * Fetches the expression from the given object.
     * 
     * @param p 
     * @returns 
     */
    public static toExpression(p: PolyType) {
        if (!Polynomial.isPolynomial(p)) {
            return Expression.toExpression(p);
        }

        return p.getExpression();
    }

    /**
     * Checks if the given object is a Polynomial
     * 
     * @param obj 
     * @returns 
     */
    public static isPolynomial(obj: unknown): obj is Polynomial {
        if (obj === undefined) {
            return false;
        }

        return (obj as Polynomial).dataType === POLYNOMIAL;
    }

    public static defaultOrdering: Ordering = 'lex';
}
