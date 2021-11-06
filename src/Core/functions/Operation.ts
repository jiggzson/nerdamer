import {isSymbol, Symbol} from '../Symbol';
import {isVector} from '../../Parser/Vector';
import {isMatrix} from '../../Parser/Matrix';
// import {AddSymbols} from './add/AddSymbols';

export type OperandType = {
    operand: any;
    type: string;
    isSymbol: boolean;
    isVector: boolean;
    isMatrix: boolean;
    isInfinity: boolean;
}

type ContinueOperation = {
    action: string;
    operands?: any[];
    rules?: OperationRule[];
}

export type OperationResult = Symbol | OperationRule[] | ContinueOperation | void;

export interface OperationRule {
    symbolOnly?: boolean;
    test?: (...operands: OperandType[]) => boolean;
    func?: (...operands: any) => OperationResult;
    rules?: OperationRule[];
}



/**
 *
 * @param {any} operand
 * @return { { type: string, isSymbol: boolean } }
 */
function getType(operand: any): OperandType {
    if (isSymbol(operand)) {
        return {
            type: operand.type,
            isSymbol: true,
            isVector: false,
            isMatrix: false,
            isInfinity: operand.isInfinity,
            operand: operand
        };
    }

    return {
        type: typeof operand,
        isSymbol: false,
        isVector: isVector(operand),
        isMatrix: isMatrix(operand),
        isInfinity: false,
        operand: operand
    };
}

const OperationFunctions: Record<string, OperationRule[]> = {
    add: [
        {
            //we're dealing with two symbols
            symbolOnly: true,
            rules: [
                // new AddSymbols(undefined),
            ]
        },
        {
            //keep symbols to the right
            test: (a, b) => !a.isSymbol && b.isSymbol,
            func: (a, b) => { return { action: 'next' } }
        },
        {
            test: (a, b) => a.isSymbol && b.isMatrix,
            func: (a, b) => { }
        },
        {
            test: (a, b) => a.isMatrix && b.isMatrix,
            func: (a, b) => { }
        },
        {
            test: (a, b) => a.isSymbol && b.isVector,
            func: (a, b) => { }
        },
        {
            test: (a, b) => a.isVector && b.isVector,
            func: (a, b) => { }
        },
        {
            test: (a, b) => a.isVector && b.isMatrix,
            func: (a, b) => { }
        },
        {
            test: (a, b) => a.isMatrix && b.isVector,
            func: (a, b) => { }
        },
        {
            // fallback
            test: (a, b) => true,
            func: (a, b) => { return b }
        },
    ]
};


function processOperationRules(rules: OperationRule[], operands: any[], operandTypes: OperandType[]): OperationResult {
    // is all operands are Symbols?
    let isAllSymbols = operandTypes.reduce((r, o) => r && o.isSymbol, true);

    for (let rule of rules) {
        if (rule.symbolOnly && !isAllSymbols) {
            continue;
        }

        if (rule.test && !rule.test(...operandTypes)) {
            continue;
        }

        let result;

        if (rule.rules) {
            result = processOperationRules(rule.rules, operands, operandTypes);
        }
        else if (rule.func) {
            result = rule.func(...operands);
        }
        else {
            throw new Error('Rule should contain func or nested rules');
        }

        while (result) {
            // return Symbol result immediately
            if (isSymbol(result)) {
                return result;
            }

            // if result not a Symbol and has no action 'next' - return it anyway
            if ('action' in result && result.action !== 'next') {
                return result;
            }

            // replace current operands with new if available
            if ('operands' in result && result.operands) {
                operands = result.operands;
                operandTypes = operands.map(o => getType(o));
                isAllSymbols = operandTypes.reduce((r: boolean, o) => r && o.isSymbol, true);
            }

            // if no new rules then continue execution with current rules list
            if (!('rules' in result) || !result.rules) {
                break;
            }

            // otherwise process new rules list
            result = processOperationRules(result.rules, operands, operandTypes);
        }
    }
}

function doOperation(operation: string, ...operands: any[]) {
    let operationRules = OperationFunctions[operation];
    if (!operationRules) {
        return;
    }

    let operandsWithTypes = operands.map(o => getType(o));

    return processOperationRules(operationRules, operands, operandsWithTypes);
}
