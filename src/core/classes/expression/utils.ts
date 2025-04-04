import { Expression } from "./Expression";
import { CoeffObject } from "./CoeffObject";
import { Rational } from "../rational/Rational";
import { definitions } from "../../functions/numeric";
import { JsFunction, SupportedInputType } from "../parser/types";
import { product, stripPower } from "../../../math/utils";
import { expand } from "../../functions/expand/expand";
import { one } from "./shortcuts";
// import { convertToTitle } from "./string";
// import { RATIONAL } from "../parser/constants";


type conditionType = (x: Expression, values: string[]) => boolean;
type actionType = (x: Expression, values: string[]) => void;
export type termType = {
    type: number,
    num: Expression[],
    den: Expression[],
    name?: string,
    power?: termType,
    components?: termType[],
    args?: termType[]
};

function collect(x: Expression, condition: conditionType, action: actionType, values?: string[]) {
    values ??= [];

    if (condition(x, values)) {
        action(x, values);
    }
    // Apply it to function arguments
    if (x.args) {
        for (const e of x.args) {
            collect(e, condition, action, values);
        }
    }
    // Search the sub-components
    if (x.components) {
        for (const e in x.components) {
            collect(x.components[e], condition, action, values);
        }
    }
    // Search the power
    if (x.isEXP()) {
        // Check target value. It's difficult to know if it's a variable so the best way is to parse and check.
        // The unfortunate consequence is that we create a reliance on Parser.parse but target is a very tricky
        // issue to solve. Consider (x+1)^x. A link to the previous type can be created but then if it gets 
        // raised again (x+1)^x^x then we have two links in which case we're not searching the chain.
        // Is it better to rely on parse? Or a reference to target class and introduce a `searchChain` method for instance.
        collect(x.parseValue(), condition, action, values);
        // Check the power
        collect(x.getPower(), condition, action, values);
    }

    return values;
}

/**
 * Separates the variable and coefficient for the specified variable
 * 
 * @param x 
 * @param variable 
 * @returns 
 */
export function separateVar(x: Expression, variables: (string | Expression)[]) {
    // Extract the value of the variable if a Expression was provided
    const vars = variables.map((x) => {
        if (typeof x !== 'string')
            return x.value;
        return x;
    })

    function isLike(x: Expression, vars: string[]) {
        return vars.includes(x.value);
    }

    let retval;

    // You can only separate in a product and not a sum. e.g. 3*a*x
    if (x.isProduct()) {
        const coeff = [Expression.fromRational(x.getMultiplier())];
        const v: Expression[] = [];
        x.each((e) => {
            // GRP should be separated as well so we have to perform an additional check.
            if (isLike(e, vars)) {
                v.push(e);
            }
            else {
                coeff.push(e);
            }
        });

        retval = [product(...coeff), product(...v) || one()];
    }
    // E.g. 3*x^2 or 5*(x^2+x) or 4*x^x
    else if (isLike(x, vars)) {
        retval = [Expression.fromRational(x.getMultiplier()), x.multiplierFree()];
    }
    // e.g. 3*b or 6
    else {
        retval = [new Expression(x), one()];
    }

    return retval;
}

/**
 * Gets the coefficients wrt to a given variable
 * 
 * @param wrt 
 */
export function coeffs(x: Expression, variables: string[], coeffsObj?: CoeffObject) {
    const cObj = coeffsObj || new CoeffObject(variables);
    // First sanitize the expression
    if (x.isProduct()) {
        // For some strange reason Array.fill gives strange results.
        const constantsKey = variables.map(() => '0').join(',');
        let t = Expression.fromRational(x.getMultiplier());
        const components = x.getComponents();
        for (const c in components) {
            const component = components[c];
            if (component.isSum() && component.getPower().sign() < 0) {
                cObj.add(constantsKey, component)
            }
            else {
                t = t.times(component);
            }
        }
        x = t;
    }
    // Expand the expression
    const f = expand(x);
    if (f.isSum()) {
        // Loop through the expression and get the coefficient for each
        f.each((e) => {
            coeffs(e, variables, cObj);
        });
    }
    else {
        const [coeff, v] = x.separateVar(...variables);
        // const p = v.getPower().text();
        const powers = variables.map((x) => v.getVariable(x).getPower().text())
        // cObj[p] = cObj[p] ? cObj[p].plus(coeff) : coeff;
        cObj.add(powers.join(','), coeff);
    }

    return cObj;
}

/**
 * Collects all the variables in an expression
 * 
 * @param x 
 * @param vars 
 * @returns 
 */
export function variables(x: Expression, vars?: string[]) {
    // Must be of type VAR and cannot be a reserved variable or have been encountered before
    const condition = (x: Expression, vars: string[]) => {
        return x.isVAR() && !vars.includes(x.value) && !Expression.RESERVED.includes(x.value);
    }
    const action = (x: Expression, vars: string[]) => {
        vars.push(x.value);
    }
    return collect(x, condition, action, vars);
}

/**
 * Recursively collects functions and their dependencies.
 * 
 * @param name 
 * @param imports 
 * @returns 
 */
export function importDeps(name: string, imports: [string[], JsFunction[]]) {
    // The imports consists of two arrays. The names and the functions. 
    // We use arrays to preserve the order of the imports
    const [f, deps] = definitions[name];

    if (deps !== undefined) {
        for (const dep of deps) {
            importDeps(dep, imports);
        }
    }

    const names = imports[0];
    const fns = imports[1];

    if (!names.includes(name)) {
        names.push(name);
        fns.push(f);
    }

    return imports
}

/**
 * Collects the functions in a symbolic expression
 * 
 * @param x 
 * @param fns 
 * @returns 
 */
export function functions(x: Expression, fns?: string[], getValues?: boolean) {
    // The name property is guaranteed on the FUN type.
    const condition = (x: Expression, fns: string[]) => {
        return x.isFunction() && !fns.includes(getValues ? x.value : x.name!);
    }
    const action = (x: Expression, fns: string[]) => {
        fns.push(getValues ? x.value : x.name!);
    }
    return collect(x, condition, action, fns);
}

export function build(x: SupportedInputType, argsArray?: string[]) {
    x = Expression.toExpression(x);
    /**
     * A small overhead. These constants are included in all functions. They're a minor
     * overhead and avoids an additional check.
     * TODO: make it so target checks if the expression actually has pi and e;
     */
    const constants = 'const pi = 3.141592653589793;\nconst e = 2.718281828459045;\n'
    /**
     * The body for the most part is just a expression. The function definitions get loaded 
     * from the numeric functions object. 
     */
    const body = x.text() + ';'
        //The caret symbol gets replaced because it has an entirely different meaning to JavaScript
        .replace(/\^/g, '**');
    /**
     * Collect the functions in the string and import their definitions. Basically for each
     * function call in the expression a definition in the form const fn = ...; is added
     */
    const imports: [string[], JsFunction[]] = [[], []]
    x.functions().forEach((e) => {
        importDeps(e, imports)
    });

    /**
     * Compile the imports string
     */
    let compiledImports = '';
    for (let i = 0; i < imports[0].length; i++) {
        compiledImports += `var ${imports[0][i]} = ${imports[1][i]};\n`;
    }

    /**
     * If no variables array is provided then it's generated;
     */
    argsArray = argsArray || x.variables().sort();
    // Construction the function definition
    const functionDef = `${constants}${compiledImports} return ${body}`;

    return new Function(...argsArray, functionDef);

}

/**
 * Copies over all the properties of the provided symbolic essentially cloning it to x.
 * 
 * @param sym 
 * @returns 
 */
export function copyOver(src: Expression, target: Expression) {
    // Copy over the multiplier
    if (src.multiplier) {
        target.multiplier = new Rational(src.multiplier)
    }
    // toFunctions have name so we need those copied
    if (src.name) {
        target.name = src.name;
    }
    // Copy over the power
    if (src.power) {
        target.power = new Expression(src.power);
    }
    // Copy over the args if any
    if (src.args) {
        target.args = [];
        for (const arg of src.args) {
            target.args.push(new Expression(arg));
        }
    }
    // Copy over the components if any
    if (src.components) {
        target.components = {};
        for (const x in src.components) {
            target.components[x] = new Expression(src.components[x]);
        }
    }
    // Last but not least
    target.type = src.type;
    target.value = src.value;
    target.precision = src.precision;
    target.deferred = src.deferred;

    return target;
}

export function hasFunction(x: Expression, name: string, deep = false) {
    if (x.isFunction() && x.name === name) {
        return true;
    }
    // Search the function arguments
    if (deep && x.args) {
        for (const e of x.args) {
            if (hasFunction(e, name, deep))
                return true
        }
    }
    // Search the sub-components
    if (x.components) {
        for (const e in x.components)
            if (hasFunction(x.components[e], name, deep))
                return true;
    }
    // Search the power
    if (deep && x.isEXP()) {
        // Check x value. It's difficult to know if it's a variable
        // so the best way is to parse and check.
        // Creating a new instance seems like overkill
        if (hasFunction(x.parseValue(), name, deep))
            return true;
        // Check the power
        if (hasFunction((x.getPower()), name, deep))
            return true;
    }

    return false;
}

export function hasVariable(x: Expression, variable: string) {
    // Only VAR is a variable so we want its value.
    if (x.isVAR() && x.value === variable) {
        return true;
    }
    // Search the function arguments
    if (x.args) {
        for (const e of x.args) {
            if (hasVariable(e, variable))
                return true
        }
    }
    // Search the sub-components
    if (x.components) {
        const components = x.getComponents();
        for (const e in components) {
            if (hasVariable(components[e], variable)) {
                return true;
            }
        }
    }
    // Search the power
    if (x.isEXP()) {
        // Check x value. It's difficult to know if it's a variable
        // so the best way is to parse and check.
        // TODO: See if x still makes sense. Creating a new instance seems like overkill
        if (hasVariable(x.parseValue(), variable))
            return true;
        // Check the power
        if (hasVariable(x.getPower(), variable))
            return true;
    }

    return false;
}

type ExpressionTuplesObj = {
    num: Expression[],
    den: Expression[],
    power?: ExpressionTuplesObj,
    args?: ExpressionTuplesObj[]
}

/**
 * This function converts the expression in a collection of arrays
 * 
 * @param x 
 * @param arrayObj 
 * @returns 
 */
export function toArrays(x: Expression, arrayObj?: ExpressionTuplesObj) {
    /*
     * The first thing to realize is that only CMB components can have a numerator and denominators.
     * All others are either the numerator or the denominator. To illustrate let look at some examples:
     * x^2/4 => x^2/4
     * cos(x)^(1/3) => cos(x)^(1/3)
     * 5*x^-1+(5/6)*x^3+x => (5*x^3)/6+x+5/x
     * (x+1)/(x+5) => (x+1)/(x+5)
     * Out of all the examples, the only one with symbolic values in the denominator is the last one which is of type CMB.
     * We can now simplify the problem by only focusing on CMB components for symbolic denominators
     */
    const retval: ExpressionTuplesObj = arrayObj || {
        num: [],
        den: []
    }

    function addMultiplier(m: Rational) {
        retval.num.push(Expression.Number(m.numerator));
        // Only add the denominator if it's not one
        if (m.denominator !== 1n) {
            retval.den.push(Expression.Number(m.denominator));
        }
    }

    if (x.isNUM()) {
        addMultiplier(x.getMultiplier())
    }
    else {
        addMultiplier(x.getMultiplier());

        const power = x.getPower();
        // Handle products. Their elements should be distributed over the numerator and denominator
        // Consider 2*x*y/(a*b). The desired output is { num: [2, y, y], den: [a, b]}
        if (x.isProduct()) {
            const components = x.componentsArray();
            for (const component of components) {
                // Pass in this object so they're added to the numerator or the denominator of this retval object
                toArrays(component, retval);
            }
        }
        // Consider 2/3*x. The desired output is { num: [2, x], den [3] };
        // Consider (3*y)^(2/3). The desired output = { num: [3, y], den: [], power: { num: [2], den: [3]} };

        else {
            const term = stripPower(x.multiplierFree());
            // Put it in numerator if positive power else the denominator
            const target = power.getMultiplier().isNegative() ? retval.den : retval.num;
            target.push(term);
        }

        // Handle the power. Remember that x^(-2) is now 1/x^2 so the power has to be the absolute value
        retval.power = toArrays(power.abs());
        // Handle args
        // Consider cos(2*pi). The desired output = { name: 'cos', args[{ num: [2, pi], den: [] }] }
        if (x.args) {
            retval.args = x.getArguments().map((x) => {
                return toArrays(x);
            });
        }
    }

    return retval;
}

export function getNumerator(x: Expression) {
    let retval = Expression.Number(x.getMultiplier().numerator);

    if (x.getPower().sign() > 0) {
        retval = retval.times(x.multiplierFree());
    }
    else if (x.isProduct()) {
        for (const component of x.componentsArray()) {
            if (component.getPower().sign() > 0) {
                retval = retval.times(component);
            }
        }
    }

    return retval;
}

export function getDenominator(x: Expression) {
    let retval = Expression.Number(x.getMultiplier().denominator);

    if (x.getPower().sign() === -1) {
        retval = retval.times(x.multiplierFree().invert());
    }
    else if (x.isProduct()) {
        for (const component of x.componentsArray()) {
            if (component.getPower().sign() === -1) {
                retval = retval.times(component.invert());
            }
        }
    }

    return retval;
}


export function isPolynomial(x: Expression) {
    const power = x.getPower();
    // Instantly disqualify elements under the denominator, radicals, exponential functions, infinity, ...
    if (!power.isInteger() || power.sign() === -1 || x.isEXP() || x.isFunction() || x.isInf()) {
        return false;
    }
    // Check within nested sums and products
    else if (x.isSum() || x.isProduct()) {
        // Check the components
        for (const component of x.componentsArray()) {
            if (!isPolynomial(component)) {
                return false;
            }
        }
    }
    // Return true for all else x, x^2, etc
    return true;
}

export function getVariable(x: Expression, variable: string) {
    if (x.value === variable) {
        return x;
    }
    else if (x.isProduct()) {
        const components = x.getComponents();
        for (const x in components) {
            if (components[x].value === variable) {
                return components[x];
            }
        }
    }

    return Expression.Number('0');
}

/**
 * Similar to hasVariable but is extended to products
 * 
 * @param x 
 * @param y 
 */
export function contains(x: Expression, y: Expression) {
    // If it's an integer then it's always true 
    let retval = false;

    // If y is a multiple of x's multiplier then return true
    const m = x.getMultiplier().abs();
    const n = y.getMultiplier().abs();

    // The division can only occur if y's multiplier is an integer multiple of x's multiplier
    if (m.isInteger() && n.isInteger() && m.gte(n)) {
        // Multiples of the integers are a good match so we're done.
        if (y.isNUM()) {
            retval = true;
        }
        else if (x.isProduct()) {
            // If it's a variable then just check if it has that variable
            if (y.isVAR()) {
                retval = x.hasVariable(y.value);
            }
            else if (y.isProduct()) {
                // We check each variable granted that
                // 1 - It's not under the denominator
                // 2 - It's of type VAR
                const variables = y.componentsArray();
                for (let i = 0; i < variables.length; i++) {
                    const v = variables[i];
                    // We check of the above-mentioned conditions. If any of them are true do 
                    // nothing. Otherwise pass it.
                    const p = v.getPower();
                    if (v.isVAR() && x.hasVariable(v.value) && p.isInteger() && p.gt('0')) {
                        retval = true;
                    }
                    // If any of the variables doesn't pass then we're done and exit.
                    else {
                        retval = false;
                        break;
                    }
                }
            }
        }
    }

    return retval;
}


/**
 * Gets the max between two or more Expressions. Just know that if two variable arguments are provided,
 * it will not be able to know with any certainty which is bigger so the first one will be returned.
 * 
 * @param x 
 * @param args 
 * @returns 
 */
export function largestPower(x: Expression, ...args: Expression[]) {
    let retval = x;
    for (const y of args) {
        if (y.getPower().gt(retval.getPower())) {
            retval = y;
        }
    }

    return retval;
}

