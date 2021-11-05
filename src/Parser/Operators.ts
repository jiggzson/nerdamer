import {Settings} from '../Settings';
import Symbol from '../Core/Symbol';

type OperationFunction = (...args: any) => any;

type OperatorsDependencies = {
    symfunction: (fn_name: string, params: any) => Symbol;
    factorial: (symbol: Symbol) => Symbol;
    divide: (a: Symbol, b: Symbol) => Symbol;
    registerOperator: (name: string, operation?: OperationFunction) => void;
}

export type OperatorDescriptor = {
    precedence: number;
    operator: string;
    action: string;
    prefix: boolean;
    postfix: boolean;
    leftAssoc: boolean;
    operation?: OperationFunction;

    overloaded?: boolean;
    overloadAction?: string;
    overloadLeftAssoc?: boolean;
    vectorFn?: string;
}

export class Operators {
    private deps!: OperatorsDependencies;
    private operators: Record<string, OperatorDescriptor> = {};

    constructor() {
        this.operators = {
            '\\': {
                precedence: 8,
                operator: '\\',
                action: 'slash',
                prefix: true,
                postfix: false,
                leftAssoc: true,
                operation: function (e: any) {
                    return e; //bypass the slash
                }
            },
            '!!': {
                precedence: 7,
                operator: '!!',
                action: 'dfactorial',
                prefix: false,
                postfix: true,
                leftAssoc: true,
                operation: (e: any) => {
                    return this.deps.symfunction(Settings.DOUBLEFACTORIAL, [e]); //wrap it in a factorial function
                }
            },
            '!': {
                precedence: 7,
                operator: '!',
                action: 'factorial',
                prefix: false,
                postfix: true,
                leftAssoc: true,
                operation: (e: any) => {
                    return this.deps.factorial(e); //wrap it in a factorial function
                }
            },
            '^': {
                precedence: 6,
                operator: '^',
                action: 'pow',
                prefix: false,
                postfix: false,
                leftAssoc: true
            },
            '**': {
                precedence: 6,
                operator: '**',
                action: 'pow',
                prefix: false,
                postfix: false,
                leftAssoc: true
            },
            '%': {
                precedence: 4,
                operator: '%',
                action: 'percent',
                prefix: false,
                postfix: true,
                leftAssoc: true,
                overloaded: true,
                overloadAction: 'mod',
                overloadLeftAssoc: false,
                operation: (x: any) => {
                    return this.deps.divide(x, new Symbol(100));
                }
            },
            '*': {
                precedence: 4,
                operator: '*',
                action: 'multiply',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            '/': {
                precedence: 4,
                operator: '/',
                action: 'divide',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            '+': {
                precedence: 3,
                operator: '+',
                action: 'add',
                prefix: true,
                postfix: false,
                leftAssoc: false,
                operation: (x: any) => {
                    return x;
                }
            },
            'plus': {
                precedence: 3,
                operator: 'plus',
                action: 'add',
                prefix: true,
                postfix: false,
                leftAssoc: false,
                operation: (x: any) => {
                    return x;
                }
            },
            '-': {
                precedence: 3,
                operator: '-',
                action: 'subtract',
                prefix: true,
                postfix: false,
                leftAssoc: false,
                operation: (x: any) => {
                    return x.negate();
                }
            },
            '=': {
                precedence: 2,
                operator: '=',
                action: 'equals',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            '==': {
                precedence: 1,
                operator: '==',
                action: 'eq',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            '<': {
                precedence: 1,
                operator: '<',
                action: 'lt',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            '<=': {
                precedence: 1,
                operator: '<=',
                action: 'lte',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            '>': {
                precedence: 1,
                operator: '>',
                action: 'gt',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            '=>': {
                precedence: 1,
                operator: '=>',
                action: 'gte',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            ',': {
                precedence: 0,
                operator: ',',
                action: 'comma',
                prefix: false,
                postfix: false,
                leftAssoc: false
            },
            ':': {
                precedence: 0,
                operator: ',',
                action: 'assign',
                prefix: false,
                postfix: false,
                leftAssoc: false,
                vectorFn: 'slice'
            },
            ':=': {
                precedence: 0,
                operator: ',',
                action: 'function_assign',
                prefix: false,
                postfix: false,
                leftAssoc: true
            }
        }
    }


    injectOperatorsDeps(depsFunction: OperatorsDependencies) {
        this.deps = depsFunction;
    }

    brackets = {
        '(': {
            type: 'round',
            id: 1,
            is_open: true,
            is_close: false
        },
        ')': {
            type: 'round',
            id: 2,
            is_open: false,
            is_close: true
        },
        '[': {
            type: 'square',
            id: 3,
            is_open: true,
            is_close: false,
            maps_to: 'vector'
        },
        ']': {
            type: 'square',
            id: 4,
            is_open: false,
            is_close: true
        },
        '{': {
            type: 'curly',
            id: 5,
            is_open: true,
            is_close: false,
            maps_to: 'Set'
        },
        '}': {
            type: 'curly',
            id: 6,
            is_open: false,
            is_close: true
        }
    }

    /**
     * Replaces nerdamer.setOperator
     * @param {object} operator
     * @param action
     * @param {'over' | 'under'} shift
     */
    setOperator(operator: OperatorDescriptor, action?: OperationFunction, shift?: 'over' | 'under') {
        let name = operator.operator; //take the name to be the symbol
        this.operators[name] = operator;
        if (action) {
            this.deps.registerOperator(operator.action, action);
        }

        //make the parser aware of the operator
        this.deps.registerOperator(name, operator.operation);

        //make the action available to the parser if infix
        if (!operator.action && !(operator.prefix || operator.postfix)) {
            operator.action = name;
        }

        //if this operator is exclusive then all successive operators should be shifted
        if (shift === 'over' || shift === 'under') {
            let precedence = operator.precedence;

            for (let x in this.operators) {
                let o = this.operators[x];
                let condition = shift === 'over' ? o.precedence >= precedence : o.precedence > precedence;
                if (condition) {
                    o.precedence++;
                }
            }
        }
    }

    /**
     * Gets an opererator by its symbol
     * @param {String} operator
     * @returns {OperatorDescriptor}
     */
    getOperator(operator: string) {
        return this.operators[operator];
    }

    aliasOperator(o: string, n: string) {
        let operator = this.operators[o];

        //copy everything over to the new operator
        let t: OperatorDescriptor = {
            ...operator
        };

        //update the symbol
        t.operator = n;
        this.setOperator(t);
    }

    /**
     * Returns the list of operators. Caution! Can break parser!
     * @returns {object}
     */
    getOperators() {
        //will replace this with some cloning action in the future
        return this.operators;
    };

    getBrackets() {
        return this.brackets;
    };

    isOperator(name: string) {
        return (name in this.operators);
    }
}

