import { Collection } from "./collection/Collection";
import { Matrix } from "./matrix/Matrix";
import { Token } from "./parser/Token";
import { SCOPE } from "./parser/constants";
import { Vector } from "./vector/Vector";

export interface Base<Type> {
    dataType: string;
    isSetOfValues: boolean;
    text: () => void;
    copy: () => Type;
}

export type Operator = {
    // The operator precedence
    precedence: number;
    // The value of the operator e.g. +, -, *, ...
    operator: string;
    // The action that this operator maps to
    action: string;
    // True if it's a prefix operator
    isPrefix: boolean;
    // True if it's postfix operator
    isPostfix: boolean;
    // True if it's left associative
    leftAssoc: boolean;
    // True if the function iterates over elements of the object
    iterates: boolean;
};

export interface Bracket {
    type: string;
    id: number;
    isOpen: boolean;
    isClose: boolean;
    matches: string;
}

export const brackets: { [key: string]: Bracket } = {
    '(': {
        type: 'parenthesis',
        id: 1,
        isOpen: true,
        isClose: false,
        matches: ')'
    },
    ')': {
        type: 'parenthesis',
        id: 2,
        isOpen: false,
        isClose: true,
        matches: '('
    },
    '[': {
        type: 'square',
        id: 3,
        isOpen: true,
        isClose: false,
        matches: ']'
    },
    ']': {
        type: 'square',
        id: 4,
        isOpen: false,
        isClose: true,
        matches: '['
    },
    '{': {
        type: 'curly',
        id: 5,
        isOpen: true,
        isClose: false,
        matches: '}'
    },
    '}': {
        type: 'curly',
        id: 6,
        isOpen: false,
        isClose: true,
        matches: '{'
    },
    '|': {
        type: 'pipe',
        id: 7,
        isOpen: true,
        isClose: true,
        matches: '|'
    }
};

export const operators: { [key: string]: Operator } = {
    '.': {
        precedence: 9,
        operator: '.',
        action: 'dot',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: true,
        iterates: false
    },
    '!!': {
        precedence: 7,
        operator: '!!',
        action: 'doubleFactorial',
        isPrefix: false,
        isPostfix: true,
        leftAssoc: true,
        iterates: true
    },
    '!': {
        precedence: 7,
        operator: '!',
        action: 'factorial',
        isPrefix: false,
        isPostfix: true,
        leftAssoc: true,
        iterates: true
    },
    '^': {
        precedence: 6,
        operator: '^',
        action: 'power',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: true,
        iterates: true
    },
    '**': {
        precedence: 6,
        operator: '**',
        action: 'power',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: true,
        iterates: true
    },
    '%': {
        precedence: 4,
        operator: '%',
        action: 'mod',
        isPrefix: false,
        isPostfix: true,
        leftAssoc: true,
        iterates: true
    },
    '*': {
        precedence: 4,
        operator: '*',
        action: 'multiply',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: true
    },
    '/': {
        precedence: 4,
        operator: '/',
        action: 'divide',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: true
    },
    '+': {
        precedence: 3,
        operator: '+',
        action: 'add',
        isPrefix: true,
        isPostfix: false,
        leftAssoc: false,
        iterates: true
    },
    '-': {
        precedence: 3,
        operator: '-',
        action: 'subtract',
        isPrefix: true,
        isPostfix: false,
        leftAssoc: false,
        iterates: true
    },
    '=': {
        precedence: 2,
        operator: '=',
        action: 'setEqual',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    '==': {
        precedence: 1,
        operator: '==',
        action: 'eq',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    '<': {
        precedence: 1,
        operator: '<',
        action: 'lt',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    '<=': {
        precedence: 1,
        operator: '<=',
        action: 'lte',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    '>': {
        precedence: 1,
        operator: '>',
        action: 'gt',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    '=>': {
        precedence: 1,
        operator: '=>',
        action: 'gte',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    ',': {
        precedence: 0,
        operator: ',',
        action: 'comma',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    ':': {
        precedence: 0,
        operator: ',',
        action: 'assign',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    },
    ':=': {
        precedence: 0,
        operator: ',',
        action: 'functionAssign',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: true,
        iterates: false
    },
    'in': {
        precedence: 0,
        operator: ',',
        action: 'IN',
        isPrefix: false,
        isPostfix: false,
        leftAssoc: false,
        iterates: false
    }
};

export class Scope extends Array<Scope | Token> {
    dataType: string;
    /**
     * The column at which the scope was encountered
     */
    column: number;

    /**
     * The scope type, parentheses, or square, or curly, or pipe.
     * This will be used to determine what it maps to during parsing.
     */
    type: string;

    /**
     * The current depth of the scope.
     */
    depth: number = 0;

    /**
     * The parent of the current scope
     */
    parent?: Scope;

    /**
     * If the scope was properly closed then this should be closed.
     */
    isOpen: boolean = false;

    constructor(type: string, column: number, parent?: Scope) {
        super();

        this.dataType = SCOPE;
        // The column where this scope was encountered
        this.column = column;
        // Scopes typically map to something
        this.type = type;
        // A temporary link to the parent of the parent scope;
        this.parent = parent;
    }

    /**
     * Adds a nested scope to the current scope and then returns it, essentially
     * pointing to the new scope.
     * 
     * @param column The column number at which the scope was encountered
     * @param type 
     * @returns 
     */
    addScope(type: string, column: number) {
        // Yup a circular reference but should be easy to understand.
        const scope = new Scope(type, column, this);
        // Mark that this is one scope deeper than this one.
        scope.depth = this.depth + 1;
        // Mark it as open
        scope.isOpen = true;
        // Add it to the current scope
        this.push(scope);
        return scope;
    }

    /**
     * This essentially removes the scope and then returns the current scope,
     * essentially going back up to the previous scope.
     * 
     * @returns The current scope
     */
    upperScope() {
        // Close the bracket
        this.isOpen = false;

        const parent = this.parent;
        // This reference is no longer needed. This isn't critical but helps a little with cleanup.
        delete this.parent;

        return parent;
    }

    text(valuesOnly: boolean = true) {
        return this.map((token) => {
            // Call scope recursively
            if (token instanceof Scope) {
                const scopedStr = token.text(valuesOnly);
                // Put back the parenthesis
                switch (token.type) {
                    case 'parenthesis':
                        return `( ${scopedStr} )`;
                    case 'square':
                        return `[ ${scopedStr} ]`;
                    case 'curly':
                        return `{ ${scopedStr} }`;
                    case 'pipe':
                        return `| ${scopedStr} |`;
                    default:
                        return scopedStr;
                }
            }
            else {
                if (valuesOnly)
                    return token.toString();
                return `<${token.toString()}, ${token.type}>`;
            }
        }).join(valuesOnly ? ' ' : ', ').replace(/\s+/gi, ' ');
    }
}

/**
 * Reads the array of operators and breaks it up into individual symbols
 * 
 * @returns An array with operator symbol
 */
export function getOperatorSymbolArray() {
    // make them one long string and then filter out duplicates
    const symbolSet = new Set(Object.keys(operators).join('').split(''));
    //filter out letters used in keyword operators
    const symbolArray = [...symbolSet].filter((x) => {
        return !(/[a-z]/i.test(x));
    });

    return symbolArray;
}

/**
 * Links operator actions to operator objects
 * 
 * @returns The operators object
 */
export function getOperators() {
    // for (const operator in operators) {
    //     // Get the object
    //     let operatorObject: Operator = operators[operator];
    //     // Link the operation function to the operator object or overwrite it
    //     operatorObject.operation = _[operatorObject.action]
    // }

    return operators;
}

/**
 * Checks to see if an obj is a set of values
 * 
 * @param obj 
 * @returns 
 */
export function isSetOfValues(obj: unknown): obj is (Vector | Collection | Matrix) {
    if(obj === undefined) {
        return false;
    }

    return !!(obj as (Vector | Collection | Matrix)).isSetOfValues;
}