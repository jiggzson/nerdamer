import {Token} from './Token';
import {Settings} from '../Settings';
import {Symbol} from '../Core/Symbol';
import {Collection} from './Collection';
import {Slice} from './Slice';
import {Vector} from './Vector';
import {Set} from './Set';
import {OperatorError, OutOfRangeError, UnexpectedTokenError} from '../Core/Errors';
import {parse} from '../Core/parse';

export class RPN {
    deps;

    constructor(deps) {
        this.deps = deps;
    }

    /**
     * Puts token array in Reverse Polish Notation
     * @param {Token[] | Token} tokens
     * @returns {Token[]}
     */
    static TokensToRPN(tokens) {
        const fn = tokens.type;
        const l = tokens.length;
        const output = [];
        const stack = [];
        const prefixes = [];
        const collapse = function (target, destination) {
            while(target.length) {
                destination.push(target.pop());
            }
        };

        let i;
        //mark all the prefixes and add them to the stack
        for (i = 0; i < l; i++) {
            let token = tokens[i];
            if (token.type !== Token.OPERATOR)
                break;
            if (!token.prefix)
                throw new OperatorError('Not a prefix operator');
            token.is_prefix = true;
            stack.push(token);
        }
        //begin with remaining tokens
        for (; i < l; i++) {
            let e = tokens[i];
            if (e.type === Token.OPERATOR) {
                let operator = e;

                //create the option for the operator being overloaded
                if (operator.overloaded) {
                    let next = tokens[i + 1];
                    //if it's followed by a number or variable then we assume it's not a postfix operator
                    if (next && next.type === Token.VARIABLE_OR_LITERAL) {
                        operator.postfix = false;
                        //override the original function with the overload function
                        operator.action = operator.overloadAction;
                        operator.leftAssoc = operator.overloadLeftAssoc;
                    }
                }

                //if the stack is not empty
                while (stack.length) {
                    let last = stack[stack.length - 1];
                    //if (there is an operator at the top of the operator stack with greater precedence)
                    //or (the operator at the top of the operator stack has equal precedence and is left associative)) ~ wikipedia
                    //the !prefixes.length makes sure that the operator on stack isn't prematurely taken from the stack.
                    if (!(last.precedence > operator.precedence || !operator.leftAssoc && last.precedence === operator.precedence))
                        break;
                    output.push(stack.pop());
                }

                //change the behavior of the operator if it's a vector and we've been asked to do so
                if ((fn === 'vector' || fn === 'set') && 'vectorFn' in operator)
                    operator.action = operator.vectorFn;


                //if the operator is a postfix operator then we're ready to go since it belongs
                //to the preceding token. However the output cannot be empty. It must have either
                //an operator or a variable/literal
                if (operator.postfix) {
                    let previous = tokens[i - 1];
                    if (!previous)
                        throw new OperatorError("Unexpected prefix operator '" + e.value + "'! at " + e.column);
                    else if (previous.type === Token.OPERATOR) {
                        //a postfix can only be followed by a postfix
                        if (!previous.postfix)
                            throw new OperatorError("Unexpected prefix operator '" + previous.value + "'! at " + previous.column);
                    }
                }
                else {
                    let next_is_operator;
                    //we must be at an infix so point the operator this
                    do {
                        //the first one is an infix operator all others have to be prefix operators so jump to the end
                        let next = tokens[i + 1]; //take a look ahead
                        next_is_operator = next ? next.type === Token.OPERATOR : false; //check if it's an operator
                        if (next_is_operator) {
                            //if it's not a prefix operator then it not in the right place
                            if (!next.prefix) {
                                throw new OperatorError('A prefix operator was expected at ' + next.column);
                            }
                            //mark it as a confirmed prefix
                            next.is_prefix = true;
                            //add it to the prefixes
                            prefixes.push(next);
                            i++;
                        }
                    }
                    while (next_is_operator)
                }

                //if it's a prefix it should be on a special stack called prefixes
                //we do this to hold on to prefixes because of left associative operators.
                //they belong to the variable/literal but if placed on either the stack
                //or output there's no way of knowing this. I might be wrong so I welcome
                //any discussion about this.

                if (operator.is_prefix) //ADD ALL EXCEPTIONS FOR ADDING TO PREFIX STACK HERE. !!!
                    prefixes.push(operator);
                else
                    stack.push(operator);
                //move the prefixes to the stack
                while(prefixes.length) {
                    if (operator.leftAssoc || !operator.leftAssoc && prefixes[prefixes.length - 1].precedence >= operator.precedence) //revisit for commas
                        stack.push(prefixes.pop());
                    else
                        break;
                }
            }
            else if (e.type === Token.VARIABLE_OR_LITERAL) {
                //move prefixes to stack at beginning of scope
                if (output.length === 0)
                    collapse(prefixes, stack);
                //done with token
                output.push(e);
                let last_on_stack = stack[stack.length - 1];
                //then move all the prefixes to the output
                if (!last_on_stack || !last_on_stack.leftAssoc)
                    collapse(prefixes, output);
            }
            else if (e.type === Token.FUNCTION) {
                stack.push(e);
            }
            else if (e.type === Token.UNIT) {
                //if it's a unit it belongs on the stack since it's tied to the previous token
                output.push(e);
            }
            //if it's an additional scope then put that into RPN form
            if (Array.isArray(e)) {
                output.push(RPN.TokensToRPN(e));
                if (e.type)
                    output.push(new Token(e.type, Token.FUNCTION, e.column)); //since it's hidden it needs no column

            }
        }
        //collapse the remainder of the stack and prefixes to output
        collapse(stack, output);
        collapse(prefixes, output);

        return output;
    }

    /*
 * Parses the tokens
 * @param {Tokens[]} rpn
 * @param {object} substitutions
 * @returns {Symbol}
 */
    parseRPN(rpn, substitutions = {}) {
        let deps = this.deps;
        let VARS = deps.VARS;

        // try {
        //prepare the substitutions.
        substitutions = substitutions || {};
        //we first parse them out as-is
        for (let x in substitutions)
            substitutions[x] = parse(substitutions[x], {});

        //Although technically constants,
        //pi and e are only available when evaluating the expression so add to the subs.
        //Doing this avoids rounding errors
        //link e and pi
        if (Settings.PARSE2NUMBER) {
            //use the value provided if the individual for some strange reason prefers this.
            //one reason could be to sub e but not pi or vice versa
            if (!('e' in substitutions))
                substitutions.e = new Symbol(Settings.E);
            if ((!('pi' in substitutions)))
                substitutions.pi = new Symbol(Settings.PI);
        }

        let Q = [];
        for (let i = 0, l = rpn.length; i < l; i++) {
            let e = rpn[i];

            //Arrays indicate a new scope so parse that out
            if (Array.isArray(e)) {
                e = this.parseRPN(e, substitutions);
            }

            if (e) {
                if (e.type === Token.OPERATOR) {
                    if (e.is_prefix || e.postfix) {
                        //resolve the operation assocated with the prefix
                        Q.push(e.operation(Q.pop()));
                    }
                    else {
                        let b = Q.pop();
                        let a = Q.pop();
                        //Throw an error if the RH value is empty. This cannot be a postfix since we already checked
                        if (typeof a === 'undefined')
                            throw new OperatorError(e + ' is not a valid postfix operator at ' + e.column);

                        let is_comma = e.action === 'comma';
                        //convert Sets to Vectors on all operations at this point. Sets are only recognized functions or individually
                        if (a instanceof Set && !is_comma)
                            a = Vector.fromSet(a);

                        if (b instanceof Set && !is_comma)
                            b = Vector.fromSet(b);

                        //call all the pre-operators
                        deps.callPeekers('pre_operator', a, b, e);

                        let action = deps.getAction(e.action);
                        let ans = action(a, b);

                        //call all the pre-operators
                        deps.callPeekers('post_operator', ans, a, b, e);

                        Q.push(ans);
                    }
                }
                else if (e.type === Token.FUNCTION) {
                    let args = Q.pop();
                    let parent = args.parent; //make a note of the parent
                    if (!(args instanceof Collection))
                        args = Collection.create(args);
                    //the return value may be a vector. If it is then we check
                    //Q to see if there's another vector on the stack. If it is then
                    //we check if has elements. If it does then we know that we're dealing
                    //with an "getter" object and return the requested values

                    //call the function. This is the _.callfunction method in nerdamer
                    //call the function. This is the _.callfunction method in nerdamer
                    let fn_name = e.value;
                    let fn_args = args.getItems();

                    //call the pre-function peekers
                    deps.callPeekers('pre_function', fn_name, fn_args);

                    let ret = deps.callfunction(fn_name, fn_args);

                    //call the post-function peekers
                    deps.callPeekers('post_function', ret, fn_name, fn_args);

                    let last = Q[Q.length - 1];
                    let next = rpn[i + 1];
                    let next_is_comma = next && next.type === Token.OPERATOR && next.value === ',';

                    if (!next_is_comma && ret instanceof Vector && last && last.elements && !(last instanceof Collection)) {
                        //remove the item from the queue
                        let item = Q.pop();

                        let getter = ret.elements[0];
                        //check if it's symbolic. If so put it back and add the item to the stack
                        if (!getter.isConstant()) {
                            item.getter = getter;
                            Q.push(item);
                            Q.push(ret);
                        }
                        else if (getter instanceof Slice) {
                            //if it's a Slice return the slice
                            Q.push(Vector.fromArray(item.elements.slice(getter.start, getter.end)));
                        }
                        else {
                            let index = Number(getter);
                            let il = item.elements.length;
                            //support for negative indices
                            if (index < 0)
                                index = il + index;
                            //it it's still out of bounds
                            if (index < 0 || index >= il) //index should no longer be negative since it's been reset above
                                //range error
                                throw new OutOfRangeError('Index out of range ' + (e.column + 1));

                            let element = item.elements[index];
                            //cyclic but we need to mark this for future reference
                            item.getter = index;
                            element.parent = item;

                            Q.push(element);
                        }
                    }
                    else {
                        //extend the parent reference
                        if (parent)
                            ret.parent = parent;
                        Q.push(ret);
                    }

                }
                else {
                    let subbed;
                    let v = e.value;

                    if (v in Settings.ALIASES)
                        e = parse(Settings.ALIASES[e]);
                    //wrap it in a symbol if need be
                    else if (e.type === Token.VARIABLE_OR_LITERAL)
                        e = new Symbol(v);
                    else if (e.type === Token.UNIT) {
                        e = new Symbol(v);
                        e.isUnit = true;
                    }

                    //make substitutions
                    //Always constants first. This avoids the being overridden
                    if (v in deps.CONSTANTS) {
                        subbed = e;
                        e = new Symbol(deps.CONSTANTS[v]);
                    }
                        //next substitutions. This allows declared variable to be overridden
                        //check if the values match to avoid erasing the multiplier.
                    //Example:/e = 3*a. substutiting a for a will wipe out the multiplier.
                    else if (v in substitutions && v !== substitutions[v].toString()) {
                        subbed = e;
                        e = substitutions[v].clone();
                    }
                    //next declare variables
                    else if (v in VARS) {
                        subbed = e;
                        e = VARS[v].clone();
                    }
                    //make notation of what it was before
                    if (subbed)
                        e.subbed = subbed;

                    Q.push(e);
                }
            }
        }

        let retval = Q[0];

        if (['undefined', 'string', 'number'].indexOf(typeof retval) !== -1) {
            throw new UnexpectedTokenError(`Unexpected token: ${typeof retval}, ${retval}`);
        }

        return retval;
        // }
        // catch(error) {
        //     throw error;
        //     // let rethrowErrors = [OutOfFunctionDomainError];
        //     // // Rethrow certain errors in the same class to preserve them
        //     // rethrowErrors.forEach(function (E) {
        //     //     if (error instanceof E) {
        //     //         throw new E(error.message + ': ' + e.column);
        //     //     }
        //     // });
        //     //
        //     // throw new ParseError(error.message + ': ' + e.column);
        // }
    }
}
