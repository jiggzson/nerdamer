import { Token } from '../classes/parser/Token';
import { Scope } from '../common/classes/Scope';
import { COMMA } from '../constants/parserSyntax';
import { INFINITY } from '../constants/symbolNames';

export function convertTeXScope(rpn: Scope) {
	const commands = ['int', 'int_', 'frac', 'sum_', 'prod_', 'lim_', 'infty', 'mathrm'];
	const functionMap = {
		Re: 'realpart',
		Im: 'imagpart',
		arccos: 'acos',
		arcsin: 'asin',
		arctan: 'atan',
	};
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
	};

	const integral = (): [Scope, Token] => {
		// Get the tokens up until the first token that starts with d
		const tokens = find(token => {
			return /^d/.test((token as Token).value);
		});
		// The last items returned should be dx so we can remove that get the variable of integration but the remove the d
		const voi = Token.V(tokens.pop()!.text().substring(1));
		// Process the remainder
		if (tokens.at(-1)?.text() === COMMA) {
			tokens.pop();
		}
		return [tokens, voi];
	};

	const getLimits = (limits: Scope): [Scope, Scope] => {
		const start = new Scope('', -1);
		const end = new Scope('', -1);
		let target = start;
		for (let j = 0; j < limits.length; j++) {
			const token = limits[j];
			if (token.text() === 'to') {
				target = end;
				continue;
			}
			target.push(token);
		}
		return [start, end];
	};

	// Begin parsing of tokens
	for (i = 0; i < rpn.length; i++) {
		// Grab the token or Scope
		const token: Token | Scope = rpn[i];

		if (Scope.isScope(token)) {
			// Read it to an expression and put it to output
			const parsed = convertTeXScope(token);
			output.push(`(${parsed})`);
		} else if (
			token.is(FUNCTION) ||
			(token.is(VARIABLE) && commands.includes(token.value))
		) {
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
					output.push(
						`${(functionMap as Record<string, string>)[command] || command}(${convertTeXScope(rpn[i] as Scope)})`
					);
					break;
				}
				case 'sum_':
				case 'prod_': {
					const lower = rpn[i] as Scope;
					const ios = lower.shift()!.text();
					// Remove the equal sign
					lower.shift();
					const start = convertTeXScope(lower);
					// Just forward two spots
					i += 2;
					const end = convertTeXScope(rpn[i] as Scope);
					output.push(
						`${f}(${convertTeXScope(rpn[++i] as Scope)},${ios},${start},${end})`
					);
					break;
				}
				case 'lim_': {
					const [start, end] = getLimits(rpn[i] as Scope);
					output.push(`${f}(${convertTeXScope(rpn[++i] as Scope)},${start},${end})`);
					break;
				}
				case 'int_': {
					// Get the tokens up until the first token that starts with d
					const [tokens, voi] = integral();
					const a = convertTeXScope(tokens.shift()! as Scope);
					// discard the caret
					tokens.shift();
					const b = convertTeXScope(tokens.shift()! as Scope);
					// return the output
					output.push(`defint(${convertTeXScope(tokens)},${a},${b},${voi})`);
					break;
				}
				case 'int': {
					// Get the tokens up until the first token that starts with d
					const [tokens, voi] = integral();
					// return the output
					output.push(`${f}(${convertTeXScope(tokens)},${voi})`);
					break;
				}
				case 'frac': {
					const a = convertTeXScope(rpn[i] as Scope);
					const b = convertTeXScope(rpn[++i] as Scope);
					output.push(`(${a})/(${b})`);
					// Get the next two
					break;
				}
				case 'infty': {
					output.push(INFINITY[0]);
					break;
				}
				case 'mathrm': {
					output.push(
						`${convertTeXScope(rpn[i] as Scope)}(${convertTeXScope(rpn[++i] as Scope)})`
					);
					break;
				}
				default: {
					output.push(`${command}(${convertTeXScope(rpn[i] as Scope)})`);
				}
			}
		} else {
			// White space is only used when looking ahead and can be discarded at this point
			if (!/\s+/.test(token.value)) {
				output.push(token.value);
			}
		}
	}

	return output.join('');
}
