import {FunctionProvider} from '../Providers/FunctionProvider';
import {OperatorDictionary} from '../Providers/OperatorDictionary';
import {VariableDictionary} from '../Providers/VariableDictionary';
import {Tokenizer} from '../Parser/Tokenizer';
import {Expression} from '../Parser/Expression';
import {primeFactors} from '../Functions/Core/operations/pow';
import {ParseDeps, Parser} from '../Parser/Parser';
import {Settings} from '../Settings';
import {Math2} from '../Functions/Math2';
import {Symbol} from '../Types/Symbol';
import * as Utils from './Utils';
import {err} from './Errors';
import {Groups} from '../Types/Groups';
import {Frac} from '../Types/Frac';
import {Vector} from '../Types/Vector';
import {Matrix} from '../Types/Matrix';
import Scientific from '../Types/Scientific';
import {LaTeX} from '../LaTeX/LaTeX';
import bigInt from '../3rdparty/bigInt';
import bigDec from 'decimal.js';
import * as exceptions from './Errors';

// export const core = new Context<Core>({});

type UtilsType = typeof Utils & {
    clearU: (u: string) => void,
    getU: (symbol: Symbol) => string,
    importFunctions: () => Record<string, ((...any: any[]) => any)>,
    reserveNames: (module: object | string) => void,
    isReserved: (name: string) => boolean,
    round: (x: string, s?: number) => number | string
};

export class Core {
    public Utils: UtilsType;
    public groups = Groups;
    public Symbol = Symbol;
    public Expression = Expression;
    public Frac = Frac;
    public Vector = Vector;
    public Matrix = Matrix;
    public Parser = Parser;
    public Scientific = Scientific;
    public Math2 = Math2;
    public LaTeX = LaTeX;
    public PARSER: Parser;
    public PARENTHESIS = Settings.PARENTHESIS;
    public Settings = Settings;
    public err = err;
    public bigInt = bigInt;
    public bigDec = bigDec;
    public exceptions = exceptions;

    functionProvider: FunctionProvider;
    operators: OperatorDictionary;
    variableDictionary: VariableDictionary;
    EXPRESSIONS: any[]
    peekers: any;

    constructor() {
        const functionProvider = this.functionProvider = new FunctionProvider();
        const operators = this.operators = new OperatorDictionary();
        const variableDictionary = this.variableDictionary = new VariableDictionary();
        const units = {};
        const tokenizer = new Tokenizer(functionProvider, operators, units);

        const peekers = this.peekers = {
            pre_operator: [],
            post_operator: [],
            pre_function: [],
            post_function: []
        };

        const EXPRESSIONS: any[] = this.EXPRESSIONS = [];
        Expression.$EXPRESSIONS = EXPRESSIONS;

        primeFactors(314146179365);

        //link the Math2 object to Settings.FUNCTION_MODULES
        Settings.FUNCTION_MODULES.push(Math2);
        variableDictionary.reserveNames(Math2); //reserve the names in Math2

        const parser = new Parser(tokenizer, operators, functionProvider, variableDictionary, peekers, units);
        ParseDeps.parser = parser;
        this.PARSER = parser;

        variableDictionary.reserveNames(variableDictionary.getAllConstants());
        variableDictionary.reserveNames(functionProvider.getFunctionDescriptors());
        parser.initConstants();
        //bug fix for error but needs to be revisited
        if (!parser.error)
            parser.error = err;

        //Store the log and log10 functions
        Settings.LOG_FNS = {
            log: functionProvider.getFunctionDescriptor('log'),
            log10: functionProvider.getFunctionDescriptor('log10')
        };

        this.Utils = {
            ...Utils,
            clearU: (u: string) => variableDictionary.clearU(u),
            getU: (symbol: Symbol) => variableDictionary.getU(symbol),
            importFunctions: () => functionProvider.importFunctions(),
            reserveNames: (module: object | string) => variableDictionary.reserveNames(module),
            isReserved: (name: string) => variableDictionary.isReserved(name),
            round: Utils.nround
        };
    }
}

