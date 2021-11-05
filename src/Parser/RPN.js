const {Token} = require('./Token');

class OperatorError extends Error {
    name = 'OperatorError';
}

class RPN {
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
}

module.exports = {
    RPN
};
