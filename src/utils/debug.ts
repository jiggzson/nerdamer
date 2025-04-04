import { Scope } from "../core/classes/common";
import { Expression } from "../core/classes/parser/operations";
import { Parser } from "../core/classes/parser/Parser";
import { Polynomial, Term } from "../core/classes/polynomial/Polynomial";

export function createTypesMap() {
    const map = {};
    for (const type in Expression.TYPES) {
        map[Expression.TYPES[type]] = type;
    }

    return map;
}

// https://stackoverflow.com/questions/57802057/eslint-configuring-no-unused-vars-for-typescript
export function printE(obj) {
    const output: string[] = [];
    for (const x in obj) {
        let str = String(obj[x]);
        if (typeof obj === 'object') {
            try {
                // Try to get a better representation that [object Object]
                str = JSON.stringify(obj[x]);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            catch (e) { ; };
        }
        output.push(`${x}: ${str}`);
    }
    console.log(output.join(', '));
}

export const printTokens = (tokens: Scope, valuesOnly: boolean = true) => {
    console.log(tokens.text(valuesOnly));
}

export const printRPN = (str: string) => {
    printTokens(Parser.toRPN(Parser.tokenize(str)));
};

export function inspectExpression(obj: Expression, depth: number = 0) {
    const tab = '\t'.repeat(depth);
    const typesMap = createTypesMap();

    let componentsStr = tab + '{\n';
    if (obj.components) {
        const components = obj.getComponents();
        for (const x in components) {
            componentsStr += inspectExpression(components[x], depth + 1);
        }
        componentsStr += `\n        ${tab}}`;
    }
    else {
        componentsStr = 'undefined';
    }

    let argsStr = tab + '[\n';
    if (obj.args) {
        const args = obj.getArguments();
        for (const arg of args) {
            argsStr += inspectExpression(arg, depth + 1)
        }
        argsStr += `\n        ${tab}]`;
    }
    else {
        argsStr = 'undefined';
    }

    return `
    ${tab}{
    ${tab}    type: ${typesMap[obj.type]},
    ${tab}    dataType: ${obj.dataType},
    ${tab}    precision: ${obj.precision},
    ${tab}    value: ${obj.value},
    ${tab}    multiplier: ${obj.multiplier ? obj.multiplier?.text() : obj.multiplier},
    ${tab}    power: ${obj.power ? obj.power?.text() : obj.power},
    ${tab}    name: ${obj.name},
    ${tab}    deferred: ${obj.deferred},
    ${tab}    components: ${componentsStr},
    ${tab}    args: ${argsStr},
    ${tab}}`;
}

export function inspectTerm(t: Term) {
    return `<Term(${t.text()}) coeff: ${t.coeff}, mdg: ${t.getMultidegArray()}, total power: ${t.getTotalPower()}, vars: ${t.variables}>`;
}

export function inspectPolynomial(p: Polynomial) {
    let terms = '';
    for (const t of p.terms) {
        terms += `\t    ${inspectTerm(t)}\n`;
    }
    return `<Polynomial(${p.text()})
        terms: 
${terms}\tLM: ${p.LM()}
        ordering: ${p.ordering}
>`
}