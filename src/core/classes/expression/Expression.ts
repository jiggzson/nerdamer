import Decimal from "decimal.js";
import { Settings } from "../../Settings";
import { EXPRESSION_TYPES, EXPRESSION, INFINITY, E, PI, PARSER_CONSTANTS, dataTypes } from "../parser/constants";
import { Rational } from "../rational/Rational";
import { anyObject } from "../../../utils/object";
import { OptionsObject, ParserSupportedType, ParserValuesObject, SupportedInputType } from "../parser/types";
import { Parser } from "../parser/Parser";
import { imagPart, realPart } from "../../functions/complex";
import { build, functions, variables, copyOver, hasFunction, hasVariable, isPolynomial, getDenominator, getNumerator, separateVar, coeffs, getVariable } from "./utils";
import { toText } from "./string";
import { multiply, add, subtract, divide, power, equal, gt, gte } from "../parser/operations";
import { abs, mod } from "../../functions/math";
import { subst } from "../../functions/subst";
import { Base } from "../common";
import { lt, lte } from "../parser/operations/compare";
import { diff } from "../../../calculus/derivative";
import { expand } from "../../functions/expand/expand";
import { simplify } from "../../functions/simplify/simplify";
import { hypot } from "../../../math/geometry";
import { __, UnexpectedDataType } from "../../errors";
import { one } from "./shortcuts";

export type ComponentsSortType = (a: Expression, b: Expression) => number;

const { NUM, VAR, EXP, FUN, GRP, CMB, CMP, INF } = EXPRESSION_TYPES;

export class Expression implements Base<Expression> {
    /**
     * The supported types
     */
    static TYPES = EXPRESSION_TYPES;

    static DISTRIBUTE_MULTIPLIER = true;

    static LOG = 'log';
    static LOG10 = 'log_10';
    static POW_OPR = '^';

    /**
     * The reserved variables
     */
    public static RESERVED: string[] = [E].concat(PI).concat(INFINITY);

    dataType: string = EXPRESSION;

    /**
     * The default type is a number for the expression since the default value
     * for an expression is "1". The assert flag is used because TypeScript
     * currently doesn't recognized that it's also set in the copyOver method
     */
    type!: number;

    /**
     * If set, this is the maximum known precision of any of the intermediate operations
     */
    precision?: number;

    /**
     * The sub-components. Since variables, numbers, ... are basically considered components,
     * they get stored in this array.
     */
    components?: { [key: string]: Expression } = undefined;

    /**
     * The value of the expression. This hash is used for comparing variable.
     * This value is set in the constructor or the copyOver method
     */
    value!: string;

    multiplier?: Rational;
    power?: Expression;

    /**
     * The function name if any
     */
    name?: string;

    /**
     * The function arguments if any
     */
    args?: Expression[];

    /**
     * Signals that the Expression was parsed with the deferred flag true
     */
    deferred: boolean = false;

    /**
     * Let's the parser know not to treat it as a set of values 
     */
    isSetOfValues: boolean = false;

    /**
     * The symbol used as the value for numbers when the expression is a sub-expression
     */
    public static numberHash = '#';

    /**
     * The variable used to represent imaginary numbers
     */
    public static imaginary = 'i';

    /**
     * Strings are supported solely for the ability to instantiate this class. 
     * The Parser class and this class have a circular dependency which will lead to 
     * infinite recursion. The reason for this is because it allows us to define the tokenizer
     * for expressions in place for both efficiency and ease of maintenance. 
     * try to instantiate with new Symbol(someString). Use to Expression.toExpression for that.
     * 
     * @param x 
     */
    constructor(x: string | Expression) {
        // Allow for hooking of the input. The user can override the hook to modify 
        // how the input is handled.
        x = Expression.hook(x);

        if (typeof x === "string") {
            this.value = x;
        }
        else {
            copyOver(x, this);
        }
    }

    /**
     * Checks if the Expression is a numeric type. This only checks clearly 
     * defined numbers and not constants. To check all values that evaluate
     * to a constant, use `isConstant`.
     * 
     * @returns 
     */
    isNUM() {
        return this.type === NUM;
    }

    isEXP() {
        return this.type === EXP;
    }

    isVAR() {
        return this.type === VAR;
    }

    /**
     * Checks if this value is a defined constant or a number.
     * 
     * @returns 
     */
    isConstant() {
        return this.isNUM() || this.value in PARSER_CONSTANTS && this.isVAR() || this.isEXP() && this.getArguments()[0].isConstant();
    }

    /**
     * Checks if the symbolic is a summation like type
     * 
     * @returns True for CMP && GRP groups
     */
    isSum() {
        return this.type === CMP || this.type === GRP;
    }

    /**
     * Checks to see if the Expression is a product
     * 
     * @returns 
     */
    isProduct() {
        return this.type === CMB;
    }

    /**
     * Checks to see if an expression is infinity for either side of zero
     * 
     * @returns True for infinity
     */
    isInf() {
        return this.type === INF;
    }

    /**
     * Checks to see if an expression is minus infinity
     * 
     * @returns True for minus infinity
     */
    isNegInf() {
        return this.isInf() && this.getMultiplier().lt('0');
    }

    /**
     * Checks to see if an expression is positive infinity
     * 
     * @returns True for minus infinity
     */
    isPosInf() {
        return this.isInf() && this.getMultiplier().gt('0');
    }

    /**
     * Checks if the Expression is numeric and zero
     * 
     * @returns 
     */
    isZero() {
        return this.getMultiplier().isZero();
    }

    /**
     * Checks if the Expression is numeric and one
     * 
     * @returns 
     */
    isOne() {
        // Avoid creating an object if not needed
        if (this.isNUM()) {
            if (this.multiplier === undefined && Number(this.value) === 1) {
                return true;
            }

            return this.getMultiplier().isOne();
        }
        return false;
    }

    /**
     * Checks to see if the Expression is an equivalent or a multiple of pi. 
     * 
     * @returns 
     */
    isPi() {
        return PI.includes(this.value);
    }

    /**
     * Checks if it's the currently defined imaginary symbol
     * 
     * @returns 
     */
    isI() {
        return this.value === Expression.imaginary;
    }

    /**
     * Checks to see if the Expression is Euler's number
     * 
     * @returns 
     */
    isE() {
        return this.value === E;
    }

    isNumeric() { }

    /**
     * Checks if a symbolic is an integer
     * 
     * @returns 
     */
    isInteger() {
        if (this.isOne()) {
            return true;
        }
        return this.type === NUM && this.getMultiplier().isInteger();
    }

    /**
     * Checks if the expression is complex
     * 
     * @returns 
     */
    isComplex() {
        return this.hasVariable(Expression.imaginary);
    }

    /**
     * This method can check if the Expression is a function. If a name is provided, then it checks if the name
     * matches the function name. If an array of names is provided, then it will look for a match in that array.
     * 
     * @param names 
     * @returns 
     */
    isFunction(names?: string | string[]): boolean {
        let retval: boolean;
        if (names === undefined) {
            retval = this.type === FUN;
        }
        else if (typeof names === 'string') {
            retval = names === this.name;
        }
        else {
            retval = names.includes(String(this.name));
        }

        return retval;
    }

    /**
    * Checks to see if the symbolic is an even integer. 
    * 
    * @returns 
    */
    isEven(): boolean {
        return this.isNUM() && this.getMultiplier().isEven();
    }

    isPolynomial() {
        return isPolynomial(this);
    }

    /**
     * Checks if an expression has the requested function
     * 
     * @param name 
     * @param deep
     */
    hasFunction(name: string, deep = false) {
        return hasFunction(this, name, deep);
    }

    /**
     * Checks to see if the expression has the provided variable
     * 
     * @param variable 
     * @returns 
     */
    hasVariable(variable: string) {
        return hasVariable(this, variable);
    }

    /**
     * Checks to see if the power has nth root.
     * 
     * @returns 
     */
    hasRadical() {
        const p = this.getPower();
        return p.isNUM() && p.getMultiplier().denominator !== 1n;
    }

    /**
     * Gets the multiplier of the Expression and delays creation until absolutely needed.
     * 
     * @returns The multiplier of the Expression
     */
    getMultiplier() {
        if (!this.multiplier) {
            const value = this.type === NUM ? this.value : '1';
            this.multiplier = new Rational(value);
        }

        return this.multiplier;
    };

    /**
     * Gets the sub components
     * 
     * @returns 
     */
    getComponents() {
        if (!this.components) {
            return {};
        }
        return this.components;
    }

    /**
     * Separates the variable and the coefficient wrt to a variable. 
     * @param variable 
     */
    separateVar(...variables: (string | Expression)[]) {
        return separateVar(this, variables);
    }

    coeffs(...variables: string[]) {
        return coeffs(this, variables);
    }

    /**
     * Gets the components as a sorted array
     * 
     * @param withMultiplier If true then he multiplier will be added to the array for products.
     * @returns 
     */
    componentsArray(withMultiplier?: boolean) {
        const componentsArray: Expression[] = [];

        if (this.isProduct() || this.isSum()) {
            const components = this.getComponents();
            for (const c in components) {
                const component = components[c];

                // Check for nested sums. Don't expand if we're in a product.
                if (component.isSum() && this.isSum() && component.getPower().isOne()) {
                    const subComponents = component.getComponents();
                    for (const sc in subComponents) {
                        componentsArray.push(subComponents[sc]);
                    }
                }
                else {
                    componentsArray.push(component);
                }
            }
        }
        else {
            componentsArray.push(this.multiplierFree())
        }

        // Adding the multiplier makes no sense when getting sums.
        if (withMultiplier && this.isProduct()) {
            componentsArray.push(Expression.fromRational(this.getMultiplier()));
        }

        return componentsArray.sort(Expression.sortFunction);
    }

    /**
     * Gets the multiplier of the Expression function and delays creation until absolutely needed.
     * 
     * @returns 
     */
    getArguments(): Expression[] {
        if (!this.args) {
            this.args = [];
        }
        return this.args;
    };

    /**
     * Gets the power of the Expression and delays creation until absolutely needed.
     * 
     * @param asExpression If true the power will be converted to a Expression
     * @returns The power of the Expression
     */
    getPower() {

        if (!this.power) {
            if (this.isNUM()) {
                this.power = Expression.Number('0');
            }
            else {
                this.power = one();
            }
        }

        return this.power;
    };

    getDenominator() {
        return getDenominator(this);
    }

    getNumerator() {
        return getNumerator(this);
    }

    subst(value: SupportedInputType, withValue: SupportedInputType) {
        value = Expression.toExpression(value);
        withValue = Expression.toExpression(withValue);
        return subst(this, value, withValue);
        // Based on the value:
        // If it's a number then complain. Invalid LH value
        // If it's a variable then return the multiplier times that value
        // If it's a function and the value is equal to that values within some multiplier the sub
        //     otherwise call sub on the arguments.
        // If it's a sum then loop through each component and sub except for numbers
        //     if a number is encountered and the difference is positive then sub it in and return the difference
    }

    /**
     * Returns a new multiplier free copy of this Expression
     * 
     * @returns 
     */
    multiplierFree(): Expression {
        let retval: Expression;
        if (this.isNUM()) {
            // Since type NUM carries its value in the multiplier,
            // the remainder is just one
            retval = one();
        }
        else {
            retval = new Expression(this);
            delete retval.multiplier;
        }

        return retval;
    }

    /**
     * Gets the real part of expression
     * 
     * @returns 
     */
    realPart() {
        return realPart(this);
    }

    /**
     * Gets the imaginary part of expression
     * 
     * @returns 
     */
    imagPart() {
        return imagPart(this);
    }

    /**
     * The most import part of this function is that this value is generated the same way
     * for each expression of a type and is distinguishable enough. Consider x and 2*x. 
     * It's important that x is returned for both so we can easily see that they can be added together.
     * consider (x+1) and (2*x+1). These cannot simply be added together without iterating over the 
     * terms. In this case a key of x+1 or 1+x and 2*x+1 or 1+2*x will do. In both cases it's important
     * that the same key is returned for the same value.
     * 
     * @returns A unique key format for each type
     * #incomplete
     * Meaning it's not complete. Makes it easier to search later.
     */
    keyValue(asSubExpression: boolean = false, isGroup: boolean = false): string {
        let retval: string = '';

        // For GRP the key is always the power
        if (isGroup) {
            retval = this.getPower().text();
        }
        else {
            switch (this.type) {
                case NUM:
                    // If we're appending we need the hash. However when generating a hash, we want the actual value.
                    retval = asSubExpression ? this.value : Expression.numberHash;
                    break;
                case VAR:
                case FUN:
                case EXP:
                case INF:
                    // Return the id string since we don't want the multiplier for comparison.
                    retval = asSubExpression ? this.idString() : this.value;
                    break;
                case GRP:
                    retval = asSubExpression ? this.text() : anyObject(this.getComponents()).keyValue();
                    break;
                case CMP:
                case CMB:
                    // e.g. (1+x) can only directly operate on (1+x) and not (1+2*x), (2+x), etc without inspecting each one
                    retval = Expression.getValue(Object.values(this.getComponents()), 'text', this.type);
                    break;
            }
        }

        if (!retval) {
            throw new Error(`The function 'keyValue' not yet implemented for type ${this.type}`);
        }

        return retval;
    }

    /**
     * Negates the multiplier. 
     * 
     * @returns This value times -1
     */
    neg() {
        const retval = new Expression(this);
        retval.multiplier = retval.getMultiplier().neg();
        return retval;
    }

    /**
     * Returns the sign of the Expression
     * 
     * @returns 
     */
    sign() {
        // REFACTOR:
        // Deal with numeric EXP
        if (this.type === EXP && this.value.startsWith('-')) {
            return -1;
        }
        return this.getMultiplier().sign();
    }

    /**
     * Inverts the Expression. Divides it by 1
     * 
     * @returns 
     */
    invert() {
        let retval;
        if (this.isComplex()) {
            retval = one().div(this)
        }
        else {
            retval = new Expression(this);
            retval.power = retval.getPower().neg();
            retval.multiplier = retval.getMultiplier().invert();
        }

        return retval;
    }

    /**
     * Collects all the variable used in the expression
     * 
     * @param vars 
     * @returns 
     */
    variables(vars?: string[]) {
        return variables(this, vars)
    }

    /**
     * Collects the functions in a string
     * 
     * @param fns 
     */
    functions(fns?: string[], getValues?: boolean) {
        return functions(this, fns, getValues);
    }

    /**
     * Builds a JS function from the given expression
     * 
     * @param args The variable order. If none is provided the arguments are sorted alphabetically.
     * @returns 
     */
    buildFunction(args?: string[]) {
        return build(this, args);
    }

    /**
     * Parses this value to create a new Expression. 
     * 
     * @returns 
     */
    parseValue(): Expression {
        return Expression.toExpression(this.value);
    }

    /**
     * Distributes the multiplier over CMP and GRP types. Mutates the object.
     * 
     * @returns 
     */
    distributeMultiplier() {
        const retval = new Expression(this);
        if ((this.isSum()) && this.multiplier && !this.getMultiplier().isOne() && (!this.power || this.power && this.getPower().isOne())) {
            const m = retval.getMultiplier();
            // Remove it
            retval.multiplier = undefined;
            // multiply each element by the multiplier
            const components = retval.getComponents();
            for (const x in components) {
                const term = components[x];
                term.multiplier = term.getMultiplier().times(m);

                if (term.isSum()) {
                    components[x] = term.distributeMultiplier();
                }
            }
        }

        return retval;
    };

    /**
     * Loops through each component
     * 
     * @param callback 
     * @returns 
     */
    each(callback: (a: Expression, b: string | number) => void) {
        // The callback assumes the multiplier is carried at the top level
        // So if there are no components then call this minus the multiplier
        if (!this.components) {
            callback(this.multiplierFree(), this.value);
        }
        else {
            const components = this.getComponents();
            for (const x in components) {
                callback(components[x], x);
            }
        }

        return this;
    }

    /**
     * This method primarily serves as a connection for Rational and this class
     * Consider removing at some point.
     * 
     * @returns A new Expression object
     */
    copy() {
        return new Expression(this)
    };

    /**
     * The absolute value of the expression. Not that this is not the true absolute value
     * but on the expression |a|x^n
     * 
     * @returns 
     */
    signFree(): Expression {
        let retval;
        if (this.isComplex()) {
            retval = hypot(this.realPart(), this.imagPart()) as Expression;
        }
        else {
            retval = new Expression(this);
            const m = retval.getMultiplier();
            // Remove the minus sign from retval value. This is specifically for EXP of numeric values
            if (retval.value.startsWith('-')) {
                retval.value = retval.value.substring(1);
            }
            if (m.lt('0')) {
                retval.multiplier = m.neg();
            }
        }

        return retval;
    }

    abs() {
        return abs(this);
    }

    /**
     * The modulo function
     * 
     * @param x 
     * @returns 
     */
    mod(x: SupportedInputType) {
        return mod(this, Expression.toExpression(x));
    }

    /**
     * Adds a value or expression to the Expression. 
     * 
     * @param x 
     * @returns 
     */
    plus(x: SupportedInputType) {
        return add(this, Expression.toExpression(x));
    }

    /**
     * Subtracts a value or expression from the Expression. 
     * 
     * @param x 
     * @returns 
     */
    minus(x: SupportedInputType) {
        return subtract(this, Expression.toExpression(x));
    }

    /**
     * Multiplies the Expression by the provided value or expression.
     * 
     * @param x 
     * @returns 
     */
    times(x: SupportedInputType) {
        return multiply(this, Expression.toExpression(x));
    }

    /**
     * Divides the Expression by the provided value or expression.
     * 
     * @param x 
     * @returns 
     */
    div(x: SupportedInputType) {
        return divide(this, Expression.toExpression(x));
    }

    /**
     * Raises the Expression to the specified power.
     * 
     * @param x 
     * @returns 
     */
    pow(x: SupportedInputType) {
        return power(this, Expression.toExpression(x));
    }

    /**
     * Checks if the Expression is equal to the given value
     * 
     * @param x 
     * @returns 
     */
    eq(x: ParserSupportedType | SupportedInputType) {
        if (typeof x === 'string' || typeof x === 'number') {
            x = Expression.toExpression(x);
        }

        if (!Expression.isExpression(x)) {
            return false;
        }

        return equal(this, x);
    }

    /**
     * Checks if the Expression is greater than the given value
     * 
     * @param x 
     * @returns 
     */
    gt(x: SupportedInputType) {
        return gt(this, x);
    }

    /**
     * Checks if the Expression is greater than or equal the given value
     * 
     * @param x 
     * @returns 
     */
    gte(x: SupportedInputType) {
        return gte(this, x);
    }

    /**
     * Checks if the Expression is less than the given value
     * 
     * @param x 
     * @returns 
     */
    lt(x: SupportedInputType) {
        return lt(this, x);
    }

    /**
     * Checks if the Expression is less than or equal the given value
     * 
     * @param x 
     * @returns 
     */
    lte(x: SupportedInputType) {
        return lte(this, x);
    }

    /**
     * Gets the total power of a monomial
     * 
     * @returns 
     */
    totalPower() {
        if (!this.isProduct()) {
            return this.getPower();
        }

        let retval = Expression.Number('0');
        const components = this.getComponents();
        for (const x in components) {
            retval = retval.plus(components[x].getPower());
        }
        return retval;
    }

    /**
     * The `toString` method used for comparison of expressions. 
     * 
     * @returns 
     */
    idString() {
        return this.text(undefined, true);
    }

    text(options?: OptionsObject, asId?: boolean) {
        return toText(this, options, asId);
    }

    /**
     * Returns a SymPy friendly text representation of the expression
     * 
     * @param options 
     * @param asId 
     * @returns 
     */
    sptext(options?: OptionsObject, asId?: boolean) {
        // Store the existing power operator
        const opr = Expression.POW_OPR;
        // Use the SymPy type
        Expression.POW_OPR = '**';
        const txt = toText(this, options, asId);
        // Put back the original
        Expression.POW_OPR = opr;
        return txt;
    }

    /**
     * Expands the expression
     * 
     * @returns 
     */
    expand(): Expression {
        return expand(this);
    }

    /**
     * A helper function to square the expression
     * 
     * @returns 
     */
    sq(): Expression {
        return this.pow('2');
    }

    /**
     * Simplifies the expression
     * 
     * @returns 
     */
    simplify(): Expression {
        return simplify(this);
    }

    toString(options?: OptionsObject) {
        return this.text(options);
    }

    /**
     * The function used to sort expression terms. This can be overridden.
     */
    public static sortFunction: ComponentsSortType = (a, b) => {
        // Ensure that i is last e.g. 1 + i and not i + 1;
        if (a.isI()) {
            return 1;
        }
        // Ensure that x^2 is before x
        if (a.type === b.type) {
            return Number(b.getPower()) - Number(a.getPower())
        }
        // The remaining order is per types
        // Default: Exponential > Variable > Functions > Sums/Polynomials > Multivariate Monomials > Infinity
        return a.type - b.type;
    }

    /**
     * Allows for hooking of the input to the class
     * 
     * @param x 
     * @returns 
     */
    public static hook(x: Expression | string) {
        return x;
    }

    /**
     * Ensures the input is always a Expression
     * 
     * @param x 
     * @param values
     * @param copy
     * @returns 
     */
    public static toExpression(x: SupportedInputType, values?: ParserValuesObject, copy?: boolean): Expression {

        if (Expression.isExpression(x) && !values) {
            return copy ? x.copy() : x;
        }
        else if (x instanceof Rational) {
            return Expression.fromRational(x);
        }

        const retval = Parser.parse(String(x), values);

        if (retval.dataType !== EXPRESSION) {
            throw new UnexpectedDataType(__('expressionExpected', { type: dataTypes[retval.dataType] }));
        }

        return retval as Expression;
    }

    public static symbols(...values: SupportedInputType[]) {
        return values.map((x) => Expression.toExpression(x));
    }


    /**
     * A helper function that creates a function of a defined type
     * 
     * @param x 
     * @param type 
     */
    public static Type(x: string, type: number) {
        const num = new Expression(x);
        num.type = type;
        return num;
    }

    /**
     * Creates an imaginary symbolic variable
     * 
     * @returns 
     */
    public static Img() {
        return Expression.Variable(Expression.imaginary);
    }

    /**
     * Provides the Expression representation of Pi. This uses the Rational class
     * so the current precision is used.
     * 
     * @param asNumericValue 
     * @returns 
     */
    public static Pi(asNumericValue?: boolean) {
        if (Settings.EVALUATE || asNumericValue) {
            return Expression.fromRational(Rational.PI);
        }
        return Expression.Variable(PI[0]);
    }

    public static E(asNumericValue?: boolean) {
        if (Settings.EVALUATE || asNumericValue) {
            return Expression.fromRational(Rational.E);
        }
        return Expression.Variable(E);
    }

    /**
     * Creates a symbolic number object
     * 
     * @param x 
     * @returns 
     */
    public static Number(x: string | bigint | number | Decimal) {
        return Expression.Type(String(x), NUM);
    }

    /**
     * Creates a symbolic variable object
     * 
     * @param x 
     * @returns 
     */
    public static Variable(x: string) {
        return Expression.Type(x, VAR);
    }

    /**
     * Creates a symbolic function object
     * 
     * @param x 
     * @returns 
     */
    public static Function(x: string) {
        const retval = Expression.Type(x, FUN);
        retval.name = x;
        return retval;
    }

    /**
     * Creates a symbolic infinity object. Since Infinity can be several different variables,
     * the first one in the array definition is used.
     * 
     * @returns 
     */
    public static Inf() {
        return Expression.Type(INFINITY[0], INF);
    }

    /**
     * Creates a symbolic minus infinity object. Relies on Expression.Inf
     * 
     * @returns 
     */
    public static NegInf() {
        return Expression.Inf().neg();
    }

    /**
     * Creates a symbol function
     * @param name The function name
     * @param args The function arguments
     * @returns A symbol representation of the function
     */
    static toFunction(name: string, args: (Expression | undefined)[]) {
        const f = Expression.Function(name);
        // Remove undefined from the array
        f.args = args.filter((x) => { return x !== undefined }).map((x) => new Expression(x));
        // Set the name
        f.name = name;
        // TODO: This needs to be generated the same way as in text. 
        f.updateValue();
        return f;
    }

    /**
     * Updates the value of the Expression after changes to its structure have been made.
     * 
     * @returns 
     */
    updateValue() {
        if (this.isFunction()) {
            this.value = `${this.name}(${this.getArguments().map(x => x.text()).join(', ')})`;;
        }
        else if (this.isProduct() || this.isSum()) {
            this.value = Expression.getValue(this.componentsArray(), 'text', this.type);
        }

        return this;
    }

    /**
     * Returns the requested variable in a product. If the value equals the variable then the entire value is returned.
     * 
     * @param variable 
     * @returns 
     */
    getVariable(variable: string) {
        return getVariable(this, variable);
    }

    /**
     * Converts the expression to imaginary
     * 
     * @returns 
     */
    i() {
        return this.times(Expression.Img());
    }

    /**
     * Calls evaluate on the current expression
     * 
     * @param values 
     * @returns 
     */
    evaluate(values?: ParserValuesObject) {
        return Parser.evaluate(this.text(), values);
    }

    /**
     * Calculates the derivative of the
     * 
     * @param variable 
     * @param n 
     * @returns 
     */
    diff(variable?: SupportedInputType, n?: number) {
        return diff(this, variable, n);
    }

    // /**
    //  * Converts the expression to a predictable (standard) string for easy matching with respect to a variable.
    //  * 
    //  * @param variable 
    //  * @returns 
    //  */
    // toPattern(variable: string) {
    //     return toPattern(this, variable);
    // }

    /**
     * Creates a Expression given a rational. For now it just creates one from string
     * but consider future improvements.
     * 
     * @param x 
     */
    static fromRational(x: Rational) {
        const value = x.denominator === 1n ? x.numerator.toString() : `${x.numerator}/${x.denominator}`;
        const retval = Expression.Number(value);
        retval.getMultiplier().asDecimal = x.asDecimal;
        return retval;
    }

    /**
     * Gets the string representation of an array of expressions. 
     * 
     * @duplicate This is possibly be a duplicate function to getExpressionsString
     * and may need to merged.
     * 
     * @param arr 
     * @param f This can be the 'toString' representation or the 'keyValue' representation
     * @param expressionType 
     * @returns 
     */
    static getValue(arr: Expression[], f: 'idString' | 'keyValue' | 'text', expressionType: number) {
        return arr
            .map((x) => {
                // This will call the toString or keyValue depending on what's requested
                let retval = x[f]();

                if ((x.type === CMP || x.type === GRP) && expressionType === CMB) {
                    //e.g. (x+1)*x; The x+1 should be wrapped in a brackets
                    retval = `(${retval})`;
                }

                return retval;
            })
            .sort()
            .join(expressionType === CMP || expressionType === GRP ? '+' : '*')
            .replace('+-', '-');
    }

    static toEXP(x: SupportedInputType, pow: SupportedInputType, powerLess: boolean = false) {
        x = Expression.toExpression(x);
        pow = Expression.toExpression(pow);

        let retval: Expression;

        if (x.isZero() || x.isInf() || pow.isInf()) {
            retval = x.pow(pow);
        }
        else if (x.isOne()) {
            // Just return it untouched
            retval = new Expression(x);
        }
        else {
            if (powerLess) {
                delete x.power;
            }
            // The value is now the entire Expression. Consider (x^x)^(1/3). 
            // The value of the Expression is x^x and not x since only x^x can directly operate on it.
            retval = new Expression(x.idString());
            retval.args = [new Expression(x)];
            retval.power = pow;
            retval.type = EXP;
        }

        return retval;
    }

    /**
     * Sets the power of Expression. Use this instead of setting power directly
     * 
     * @param x 
     * @param power 
     */
    static setPower(x: Expression, power: Expression) {
        x.power = power;
        return x;
    }

    /**
     * Checks to see if an object is a Expression
     * 
     * @param obj 
     * @returns 
     */
    static isExpression(obj: unknown): obj is Expression {
        if (obj === undefined) {
            return false;
        }

        return (obj as Expression).dataType === EXPRESSION;
    }
}
