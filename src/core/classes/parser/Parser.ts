import { Bracket, brackets, getOperators, Operator, Scope } from "../common";
import {
    SPACE, BLANK, NEWLINE, TAB, RETURN, INFINITY, PARSER_CONSTANTS,
    COMMA, VECTOR, MATRIX, COLLECTION
} from "./constants";
import { Settings } from "../../Settings";
import { block, evaluate } from "./helpers";
import { TokenBuffer, Token } from "./Token";
import { mathFunctions } from "../../linker";
import { _, apply } from "./operations/functions";
import { UnexpectedTokenError, ParserError, __ } from "../../errors";
import { scientificToDecimal } from "../../functions/string";
import { Expression } from "../expression/Expression";
import {
    Operation, PreFixFunction, PostFixFunction, ParserFunctionCall, OptionsObject,
    ParserValuesObject, ParserConstants, ParserSupportedType, SupportedInputType
} from "./types";
import { Rational } from "../rational/Rational";
import { Collection } from "../collection/Collection";
import { Vector } from "../vector/Vector";


// export TeXObj = {}
export const Parser = (function () {
    class Parser {
        VALUE_SETS: string[] = [VECTOR, MATRIX];
        // Define whitespace to be ignored.
        WHITE_SPACE: string[] = [NEWLINE, TAB, RETURN];
        // Operators supported by the parser
        operators: { [key: string]: Operator } = getOperators();

        /**
         * Constants are treated a little strangely as they're just variables but are defined
         * as constants in the parser. Important! This object is shared by all Parsers.
         */
        CONSTANTS: ParserConstants = PARSER_CONSTANTS;

        /**
         * The maximum number of operators a compound operator can consist of
         */
        MAX_COMPOUND_OPERATOR_LENGTH: number = 2;

        evaluate(str: string, values?: ParserValuesObject) {
            return evaluate(str, values);
        }

        /**
         * This method reads and Scope object in RPN form into an Expression
         * 
         * @param rpn The expression in RPN form
         */
        parseRPN(rpn: Scope, values?: ParserValuesObject) {
            // The output stack
            const output: ParserSupportedType[] = [];

            const operators = this.operators;
            // TODO: this needs to be applied at the operation level. It's somewhat clunky to apply this here.
            // const precision = this.getPrecision();

            function addToOutput(expression: ParserSupportedType) {
                if (expression === undefined) {
                    throw new ParserError(__('malformedExpression'));
                }
                // Keep track of the precision used to make this calculation
                // TODO: this needs to be applied at the operation level. It's somewhat clunky to apply this here.
                // expression.precision = expression.precision || precision;
                output.push(expression);
            }

            // Begin parsing of tokens
            for (let i = 0; i < rpn.length; i++) {
                // Grab the token or Scope
                const token: Token | Scope = rpn[i];

                if (token instanceof Scope) {
                    // Read it to an expression and put it to output
                    const parsed = this.parseRPN(token, values);
                    addToOutput(parsed);
                }
                else {
                    if (token.type === Token.OPERATOR) {
                        // Grab the operator. The action will be defined by the operation property
                        const operator = this.operators[token.value];

                        // Get the last two elements on output
                        const b = output.pop()!;

                        let result: ParserSupportedType;

                        // If it's a postfix operator then the operation occurs only on the previous element
                        if (operator.isPostfix) {
                            // Perform the operation
                            const fn = _[operator.action] as PostFixFunction;
                            result = apply(b, undefined, fn);
                        }
                        else {
                            const fn = _[operator.action] as Operation
                            const a = output.pop()!;

                            // If a value set is encountered, (vector, matrix, collection,...) then we iterate
                            // over each element. The return type is another value set and the chain continues
                            // Perform the operation
                            result = apply(a, b, fn, { type: rpn.type, iterates: operator.iterates });
                        }

                        if (Array.isArray((result))) {
                            addToOutput(result[0]);
                            addToOutput(result[1]);
                        }
                        else {
                            addToOutput(result);
                        }
                    }
                    else if (token.type === Token.FUNCTION) {
                        // Get the next token and move along
                        const argsScope = rpn[++i];
                        // Parse it as an argument
                        const parsed = this.parseRPN(argsScope as Scope, values);

                        const args = parsed.dataType === COLLECTION ? (parsed as Collection).getElements() : [parsed];

                        // Call the function
                        // TODO: this needs to be fixed. A branching should occur between iterator functions calls and standard function calls
                        // It might even be worth it to add an entry to the functions to state what it supports
                        const result: Expression = (_.callFunction as ParserFunctionCall)(token.value, args);

                        addToOutput(result);
                    }
                    else if (token.type === Token.PREFIX) {
                        const e = output.pop()!;
                        const prefixAction = `${operators[token.value].action}Prefix`;
                        const fn = _[prefixAction] as PreFixFunction;
                        // TODO: Rethink. What happens when a prefix is applied to a vector
                        addToOutput(apply(e, undefined, fn));
                    }
                    else {
                        let expression;
                        // Substitute values from the values object. A number is not considered a proper LH value.
                        if (values && token.value in values && !token.is(Token.NUMBER)) {
                            // expression = this.parse(String(values[token.value]), values);
                            expression = Expression.toExpression(values[token.value], undefined, true);
                        }
                        // Substitute constants
                        else if (Settings.EVALUATE && token.value in this.CONSTANTS) {
                            const constant = this.CONSTANTS[token.value];
                            // If it's a function, call it. Otherwise just use its value.
                            // The reason for the callable is to make sure that we always use the correct precision 
                            // when evaluating pi, e
                            expression = this.parse(typeof constant === 'function' ? constant() : constant, values);
                        }
                        else {
                            // At this point the expression type is variable or a number
                            switch (token.type) {
                                case Token.FUNCTION:
                                    expression = Expression.Function(token.value);
                                    break;
                                case Token.VARIABLE:
                                    if (INFINITY.includes(token.value)) {
                                        expression = Expression.Inf();
                                    }
                                    else {
                                        expression = Expression.Variable(token.value);;
                                    }

                                    break;
                                default:
                                    expression = Expression.Number(token.value);
                                    break;
                            }
                        }

                        // Add it to output
                        addToOutput(expression);
                    }
                }
            }

            let retval: ParserSupportedType;
            // Since as function args can have multiple arguments in the output
            // the entire array gets returned. We do the same with 
            if (rpn.type === 'square') {
                retval = new Vector(output);
            }
            else if (output.length > 1) {
                retval = new Collection(output);
            }
            else {
                retval = output[0];
            }

            return retval;
        }

        /**
         * https://www.overleaf.com/learn/latex/Operators
         * Parses tokens from TeX format to a string
         * 
         * @param rpn 
         * @returns 
         */
        parseTeXRPN(rpn: Scope) {
            const commands = [
                'int', 'int_', 'frac', 'sum_', 'prod_', 'lim_', 'infty', 'mathrm'
            ];
            const functionMap = {
                'Re': 'realpart',
                'Im': 'imagpart',
                'arccos': 'acos',
                'arcsin': 'asin',
                'arctan': 'atan',
            }
            const output: string[] = [];
            const { FUNCTION, VARIABLE } = Token;
            // Declare globally since it get increment in multiple loops
            let i: number;

            type Condition = (token: Token | Scope) => boolean;

            const find = (condition: Condition) => {
                const retval = new Scope('', -1);
                for (; i < rpn.length; i++) {
                    const token = rpn[i];
                    retval.push(token);
                    if (condition(token)) {
                        break;
                    }
                }
                return retval;
            }

            const integral = (): [Scope, Token] => {
                // Get the tokens up until the first token that starts with d
                const tokens = find((token) => { return /^d/.test((token as Token).value); });;
                // The last items returned should be dx so we can remove that get the variable of integration but the remove the d
                const voi = Token.V(tokens.pop()!.text().substring(1))
                // Process the remainder
                if (tokens.at(-1)?.text() === COMMA) {
                    tokens.pop();
                }
                return [tokens, voi];
            }

            const getLimits = (limits: Scope): [Scope, Scope] => {
                const start = new Scope('', -1)
                const end = new Scope('', -1);
                let target = start;
                for (let j = 0; j < limits.length; j++) {
                    const token = limits[j]
                    if (token.text() === 'to') {
                        target = end;
                        continue;
                    }
                    target.push(token);
                }
                return [start, end];
            }

            // Begin parsing of tokens
            for (i = 0; i < rpn.length; i++) {
                // Grab the token or Scope
                const token: Token | Scope = rpn[i];

                if (token instanceof Scope) {
                    // Read it to an expression and put it to output
                    const parsed = this.parseTeXRPN(token);
                    output.push(`(${parsed})`);
                }
                else if (token.is(FUNCTION) || token.is(VARIABLE) && commands.includes(token.value)) {
                    // Move forward to skip over the command
                    i++;
                    // Provide a "cleaned" optional function name
                    const f = token.text().split('_')[0];

                    const command = token.text();

                    switch (token.value) {
                        case 'cos':
                        case 'sin':
                        case 'tan':
                        case 'sec':
                        case 'csc':
                        case 'cot':
                        case 'acos':
                        case 'arccos':
                        case 'arcsin':
                        case 'arctan':
                        case 'asec':
                        case 'acsc':
                        case 'acot':
                        case 'sqrt':
                        case 'gcd':
                        case 'Re':
                        case 'Im': {
                            output.push(`${functionMap[command] || command}(${this.parseTeXRPN(rpn[i] as Scope)})`);
                            break;
                        }
                        case 'sum_':
                        case 'prod_': {
                            const lower = rpn[i] as Scope;
                            const ios = lower.shift()!.text();
                            // Remove the equal sign
                            lower.shift();
                            const start = this.parseTeXRPN(lower);
                            // Just forward two spots
                            i += 2;
                            const end = this.parseTeXRPN(rpn[i] as Scope);
                            output.push(`${f}(${this.parseTeXRPN(rpn[++i] as Scope)},${ios},${start},${end})`);
                            break;
                        }
                        case 'lim_': {
                            const [start, end] = getLimits(rpn[i] as Scope);
                            output.push(`${f}(${this.parseTeXRPN(rpn[++i] as Scope)},${start},${end})`);
                            break;
                        }
                        case 'int_': {
                            // Get the tokens up until the first token that starts with d
                            const [tokens, voi] = integral();
                            const a = this.parseTeXRPN(tokens.shift()! as Scope);
                            // discard the caret
                            tokens.shift();
                            const b = this.parseTeXRPN(tokens.shift()! as Scope);
                            // return the output
                            output.push(`defint(${this.parseTeXRPN(tokens)},${a},${b},${voi})`);
                            break;
                        }
                        case 'int': {
                            // Get the tokens up until the first token that starts with d
                            const [tokens, voi] = integral();
                            // return the output
                            output.push(`${f}(${this.parseTeXRPN(tokens)},${voi})`);
                            break;
                        }
                        case 'frac': {
                            const a = this.parseTeXRPN(rpn[i] as Scope);
                            const b = this.parseTeXRPN(rpn[++i] as Scope);
                            output.push(`(${a})/(${b})`);
                            // Get the next two
                            break;
                        }
                        case 'infty': {
                            output.push(INFINITY[0]);
                            break;
                        }
                        case 'mathrm': {
                            output.push(`${this.parseTeXRPN(rpn[i] as Scope)}(${this.parseTeXRPN(rpn[++i] as Scope)})`)
                            break;
                        }
                    }
                }
                else {
                    // White space is only used when looking ahead and can be discarded at this point
                    if (!/\s+/.test(token.value)) {
                        output.push(token.value);
                    }
                }
            }

            return output.join('');
        }

        /**
         * This method reads a string into an expression
         * 
         * @param str The string being evaluated
         * @param values An optional object containing values to be substituted
         * @returns A parsed expression
         */
        parse(str: SupportedInputType, values?: ParserValuesObject) {
            // Convert the values to Expressions
            if (values) {
                for (const value in values) {
                    values[value] = Expression.toExpression(values[value]);
                }
            }
            // Tokenize the string and put it in RPN format
            const rpn: Scope = this.toRPN(this.tokenize(String(str)));
            // Read it into an expression.
            const retval = this.parseRPN(rpn, values);

            return retval;
        }

        /**
         * Converts an array of Tokens into Reverse Polish Notation using the Shunting Yard algorithm.
         * 
         * @param tokens
         */
        toRPN(scope: Scope) {
            // The output to be returned
            const output: Scope = new Scope(scope.type, scope.depth);
            // The operator stack
            const stack: Token[] = [];

            /**
             * Return the last bracket on the stack. Must be guarded against an empty stack.
             * @returns Bracket
             */
            const peek = (): Token | undefined => {
                const lastToken: Token | undefined = stack[stack.length - 1];
                return lastToken;
            }

            const peekOperator = (): Operator | undefined => {
                const operatorToken = peek();
                if (operatorToken) {
                    return this.operators[operatorToken.value];
                }
            }

            // Begin Shunting Yard
            for (let i = 0; i < scope.length; i++) {
                // Read the token
                const token: Token | Scope = scope[i];

                if (token instanceof Scope) {
                    // Send the contents of the scope to be put into RPN
                    output.push(this.toRPN(token));
                }
                else {
                    // If it's a number then there's nothing else to evaluate so it can go straight to output
                    switch (token.type) {

                        case Token.OPERATOR: {
                            // Get the operator
                            const operator: Operator = this.operators[token.value];
                            // Get the last operator on the stack
                            let lastOperator: Operator | undefined = peekOperator();

                            /******************** PREFIX OPERATORS ********************/
                            // We can now traverse the tokens since we've encountered an operator. Any remaining operators should be prefix operators
                            // If not then complain.
                            for (let j = i + 1; j < scope.length; j++) {

                                const prefixOperator = scope[j] as Token;

                                // If a non-operator token is encountered, then we're done. Or if we're at a postfix operator then the next operator may be a valid one and this assumption no longer holds true
                                if (!(prefixOperator) || prefixOperator.type !== Token.OPERATOR || operator.isPostfix) {
                                    break;
                                }

                                // If the encountered operator is not a prefix then complain
                                if (!this.operators[prefixOperator.value].isPrefix) {
                                    throw new ParserError(`Prefix operator expected but ${prefixOperator.value} encountered.`)
                                }

                                // We mark it so the next time it's encountered, it's placed to output immediately
                                prefixOperator.type = Token.PREFIX;
                            }

                            // If we're at the beginning then it's a prefix operator so put it to output and break
                            // If the last item on output is a prefix then this has to be a prefix 
                            const last = output[output.length - 1] as Token;
                            if (operator.isPrefix && (output.length === 0 || output.length > 0 && last && last.type === Token.PREFIX)) {
                                token.type = Token.PREFIX;
                                stack.push(token);
                                break;
                            }

                            const greaterPrecedence = (): boolean => {
                                // This operator has greater precedence and belongs on the stack
                                if (!lastOperator) {
                                    return false;
                                }

                                // The second operator belongs on the stack first. This check has to happen first
                                // to break the tie between ^ and ^ for instance.
                                if ((lastOperator.precedence === operator.precedence && operator.leftAssoc)) {
                                    return false;
                                }

                                // They're equal or the other is greater. For instance * goes before +, and + before - if + came first.
                                if (lastOperator.precedence >= operator.precedence) {
                                    return true;
                                }

                                // Prefixes have to happen first. For instance x^-1. The minus comes first but not for -x!.
                                const lastOnStack = stack[stack.length - 1];
                                if (lastOnStack && lastOnStack.type === Token.PREFIX && !operator.leftAssoc) {
                                    return true;
                                }

                                return false;
                            }

                            while (greaterPrecedence()) {
                                // Move it to the output
                                output.push(stack.pop() as Token);
                                // Get the next operator on the stack
                                lastOperator = peekOperator();
                            }

                            // Put the last operator on the stack
                            stack.push(token);

                            break;
                        }
                        case Token.BRACKET: {
                            // Add brackets to output right away since they have the highest precedence
                            const bracket: Bracket = brackets[String(token.value)];

                            if (bracket.isOpen) {
                                stack.push(token);
                            }
                            else {

                                output.push(token);
                                const lastToken: Token | undefined = peek();

                                while (lastToken) {
                                    const popped = stack.pop() as Token;

                                    output.push(popped);

                                    // Exit if it's a matching bracket
                                    // The resulting RPN will be a reverse bracket. Nonetheless, it's a good way to know that every operation is
                                    // within a new scope.
                                    if (popped.type === Token.BRACKET) {
                                        if (brackets[token.value].matches === popped.value) {
                                            // Done
                                            break;
                                        };
                                    }
                                }
                            }

                            break;
                        }

                        case Token.PREFIX: {
                            // The prefix belongs to the next token so it goes to output right away
                            stack.push(token);
                            break;
                        }
                        case Token.UNDEFINED:
                        case Token.SPACE: {
                            // Do nothing and discard
                            break;
                        }
                        default: {
                            output.push(token);
                            break;
                        }
                    }
                }

            }

            // Clear the stack
            while (stack.length) {
                const token = stack.pop() as Token

                output.push(token);
            }

            return output;
        }

        /**
         * This breaks up the string into an array of tokens. 
         *
         * @param inputStr The string being tokenized
         * @throws
         * @returns 
         */
        tokenize(inputStr: string, options?: OptionsObject) {
            options = Object.assign({ pure: false, keepWhiteSpace: false }, options);

            // A key element to be aware of is that a terminating character is appended to the string.
            // This avoids an extra step since the last item is ignored. Brackets are wrapped in a Scope object
            // which preserves the type for later parsing.
            const terminator = '\u0000';
            // Input must be a string and append a terminator. This avoids having to iterate over undefined will be ignored at the end.
            const str = String(inputStr) + terminator;
            // The list of operators supported at the time of tokenization
            const operators = Object.keys(this.operators).sort();
            // The column position that the token was found
            let col: number = 0;
            // The tokens container. A Scope object is used to denote tokens between brackets. This greatly simplifies
            // parsing in the future. This allows the tracking of the bracket type and enables parsing to be limited to one scope.
            const tokens = new Scope('top', 0);
            // The scope being appended to
            let scope = tokens;
            // The object to hold portions of the string between tokens. We create an object so we can pass it around by reference.
            const tokenBuffer: TokenBuffer = {
                tokenType: Token.UNDEFINED,
                chars: [],
                inputString: inputStr,
                last: function () {
                    return this.chars[this.chars.length - 1] as string
                },
                next: function (at: number) {
                    return this.inputString.charAt(at + 1);
                },
                is(tokenType: string) {
                    return this.tokenType === tokenType;
                },
                prev: function (at: number) {
                    return this.inputString.charAt(at - 1);
                },
                scientificNumber: false
            };

            // Traverse the string and look at each character
            for (; col < str.length; col++) {
                const ch = str.charAt(col);

                // Get the character type for comparison. We're searching for changes is the character type to determine
                // the end of a token.
                const charType = Token.getCharType(ch, col, tokenBuffer);

                // Brackets point to a new scope. Once one is encountered, we update the target and point to the new scope
                // Subsequent tokens are now pushed to that scope
                if (tokenBuffer.is(Token.BRACKET)) {
                    // Get the bracket. 
                    const bracket = brackets[tokenBuffer.last() as string];

                    if (bracket.isOpen) {
                        // Check to see if there's a variable on the token stack, if it's a variable, and if it's in functions
                        const lastToken = scope[scope.length - 1] as Token;

                        if (lastToken && lastToken.type === Token.VARIABLE && (lastToken.value in mathFunctions)) {
                            // Mark it as a function
                            lastToken.type = Token.FUNCTION;
                        }

                        // Implicit multiplication
                        if (lastToken && !(lastToken.type === Token.FUNCTION || lastToken.type === Token.OPERATOR)) {
                            if (Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
                                // Push a multiplication token with position -1 to indicate that it was added
                                if (!options.pure) {
                                    scope.push(new Token('*', Token.OPERATOR, -1));
                                }
                            }
                            else {
                                throw new UnexpectedTokenError(`Expected operator or function name but "${lastToken.value}" found!`);
                            }
                        }

                        // Go down in scope to the new bracket
                        scope = scope.addScope(bracket.type, col);
                    }
                    else {
                        // Ensure that the brackets match
                        const bracketsMatch = scope.type === bracket.type;

                        // We're done so we can go up in scope to the parent scope
                        scope = scope.upperScope() as Scope;

                        // If there's not scope or the types don't match then we have a mismatched bracket
                        if (scope === undefined || !bracketsMatch) {
                            throw new UnexpectedTokenError(`Missing opening bracket for "${tokenBuffer.last()}":${col}`);
                        }
                    }

                    // Discard the bracket since it's no longer needed
                    tokenBuffer.chars.pop();
                }

                // Handle single variables and brackets since we don't have compound brackets nor will we support them.
                // If the type has changed but doesn't equal UNDEFINED, then finalize it
                if (tokenBuffer.tokenType !== Token.UNDEFINED && tokenBuffer.tokenType !== charType) {
                    // Collapse the tokenBuffer
                    let tokenStr = tokenBuffer.chars.join(BLANK);
                    // Mark the beginning of the token
                    const SOT = col - tokenBuffer.chars.length;

                    // In order to support keyword operators, we can check here
                    if (operators.includes(tokenStr) && tokenBuffer.tokenType !== Token.PREFIX) {
                        tokenBuffer.tokenType = Token.OPERATOR;
                    }
                    // type prefix operators and compound operators
                    else if (tokenBuffer.is(Token.OPERATOR) && tokenBuffer.chars.length > 1) {
                        let compoundOperatorStr = tokenBuffer.chars[0];
                        // Get the largest possible operator chunks
                        for (let i = 1; i < tokenBuffer.chars.length + 1; i++) {
                            // Check if the current combination is an operator
                            const tempStr = compoundOperatorStr + tokenBuffer.chars[i];
                            // If it is then just make that the chunk
                            if (tempStr in this.operators) {
                                compoundOperatorStr = tempStr;
                            }
                            else {
                                // Place it on the tokens stack
                                scope.push(new Token(compoundOperatorStr, Token.OPERATOR, SOT + i - compoundOperatorStr.length));
                                // Reset the compound operator and move forward one position
                                compoundOperatorStr = tokenBuffer.chars[i];
                                // Clear the token string
                                tokenStr = BLANK;
                            }
                        }
                        // Reset the buffer
                        tokenBuffer.chars = [];
                        tokenBuffer.scientificNumber = false;
                    }

                    // Ignore blanks and spaces
                    // Don't add the token if it's been cleared
                    const isWhiteSpace = tokenStr === SPACE;
                    if (isWhiteSpace && options.keepWhiteSpace) {
                        scope.push(new Token(tokenStr, Token.SPACE, SOT));
                    }
                    else if (!(tokenStr === BLANK || isWhiteSpace)) {
                        if (tokenBuffer.scientificNumber) {
                            tokenStr = scientificToDecimal(tokenStr);
                            tokenBuffer.scientificNumber = false;
                        }

                        const lastToken = scope[scope.length - 1];
                        // Implicit multiplication
                        if (lastToken && tokenBuffer.is(Token.VARIABLE) && !(lastToken.type === Token.OPERATOR || lastToken.type === Token.PREFIX)) {
                            if (Settings.ALLOW_IMPLICIT_MULTIPLICATION) {
                                if (!options.pure) {
                                    // Push a multiplication token with position -1 to indicate that it was added
                                    scope.push(new Token('*', Token.OPERATOR, -1));
                                }
                            }
                            else {
                                throw new UnexpectedTokenError(`Expected operator or function name but "${(lastToken as Token).value}" found!`);
                            }
                        }

                        // Allows for each single letter in a variable to be treated like an individual variable
                        if (Settings.USE_SINGLE_LETTER_VARIABLES && !(tokenStr in mathFunctions)) {
                            // Insert a new multiplication token between them and add them to the scope
                            scope.push(...tokenStr.split('').map((x) => {
                                return new Token(x, tokenBuffer.tokenType, -1);
                                // Add the multiplication operator between them 
                            }).flatMap((x) => [new Token('*', Token.OPERATOR, -1), x]).slice(1));
                        }
                        else {
                            // We can collapse the buffer
                            scope.push(new Token(tokenStr, tokenBuffer.tokenType, SOT));
                        }
                    }

                    // Clear the buffer and place last character on stack
                    tokenBuffer.chars = [ch];
                }
                else {
                    tokenBuffer.chars.push(ch);
                }
                tokenBuffer.tokenType = charType;
            }

            // If the last item in the tokens array is a scope and it has a parent then it's missing a closing bracket
            const lastItem = tokens[tokens.length - 1];
            if (lastItem instanceof Scope && lastItem.isOpen) {
                throw new UnexpectedTokenError(`Missing closing bracket for "${str.charAt(lastItem.column - 1)}":${lastItem.column}`);
            }

            return tokens;
        };

        /**
         * Modifies a settings option
         * 
         * @param setting 
         * @param value 
         */
        set(setting: string | OptionsObject, value?: boolean | string | number | bigint) {
            if (typeof setting === 'object') {
                for (const x in setting) {
                    Settings[x] = setting[x];
                }
            }
            else {
                Settings[setting] = value;
            }

            return this;
        };

        get(setting: keyof typeof Settings) {
            return Settings[setting];
        }

        /**
         * Set a constant in the parser. The value can be string or a function that returns a string.
         * To delete the value, set it to an empty string.
         * 
         * @param constants 
         */
        setConstants(constants: ParserConstants) {
            for (const name in constants) {
                const value = constants[name];
                if (typeof value === 'string' && value === '' && name in this.CONSTANTS) {
                    delete this.CONSTANTS[name]
                }
                else {
                    this.CONSTANTS[name] = value;
                }
            }
        }

        /**
         * Sets the precision to be used by the parser.
         * 
         * @param precision 
         */
        setPrecision(precision: number) {
            Rational.set({ precision: precision });
        }

        getPrecision() {
            return Rational.get('precision');
        }

        /**
         * Gets the complex variable currently being used
         * 
         * @returns 
         */
        getI() {
            return Expression.imaginary;
        }

        /**
         * Set the complex variable to be used instead of the default "i"
         * 
         * @returns 
         */
        setI(variable: string) {
            Expression.imaginary = variable;
        }

        /**
         * Returns a new Parser instance
         * 
         * @returns 
         */
        create() {
            return new Parser();
        }

        /**
         * Extends the block function in which a setting runs with a particular value.
         * 
         * @param setting 
         * @param value 
         * @param callback 
         * @returns 
         */
        block(setting: string, value: boolean, callback: () => ParserSupportedType) {
            return block(setting, value, callback);
        }
    }

    return new Parser();
})();