import { Parser } from '../../core/classes/parser/Parser';
import { Token } from '../../core/classes/parser/Token';
import { Scope } from '../../core/common/classes/Scope';
import { message, UnsupportedOperationError } from '../../core/errors';
import { definitions } from '../../core/functions/build/definitions';
import { connectedNumericalFunctions } from '../../core/functions/connectFunctions';

import type { Expression } from '../../core/classes/expression/Expression';

type ScalarEvaluator = (value: number) => number;

function unsupported(source: string): never {
	throw new UnsupportedOperationError(
		message('buildFunctionUnsupportedFunction', { function: source })
	);
}

/** Compiles the shared parser's RPN into native-number closures. */
function compileScope(scope: Scope, variable: string, source: string): ScalarEvaluator[] {
	const stack: ScalarEvaluator[] = [];

	for (let index = 0; index < scope.length; index++) {
		const entry = scope[index];
		if (Scope.isScope(entry)) {
			if (entry.type !== 'parenthesis') {
				unsupported(source);
			}
			const values = compileScope(entry, variable, source);
			if (values.length !== 1) {
				unsupported(source);
			}
			stack.push(values[0]);
		} else if (entry.type === Token.FUNCTION) {
			const argsScope = scope[++index];
			if (!Scope.isScope(argsScope) || argsScope.type !== 'parenthesis') {
				unsupported(entry.value);
			}
			const args = compileScope(argsScope, variable, source);
			const fn: ((...args: number[]) => number | boolean) | undefined =
				connectedNumericalFunctions[entry.value] ?? definitions[entry.value]?.[0] ??
				(entry.value === 'log10' ? Math.log10 : entry.value === 'ln' ? Math.log : undefined);
			if (!fn) {
				unsupported(entry.value);
			}
			stack.push(x => Number(fn(...args.map(arg => arg(x)))));
		} else if (entry.type === Token.NUMBER) {
			const constant = Number(entry.value);
			stack.push(() => constant);
		} else if (entry.type === Token.VARIABLE) {
			if (entry.value === variable) {
				stack.push(x => x);
			} else if (entry.value === 'pi') {
				stack.push(() => Math.PI);
			} else if (entry.value === 'e') {
				stack.push(() => Math.E);
			} else {
				unsupported(entry.value);
			}
		} else if (entry.type === Token.PREFIX) {
			const operand = stack.pop();
			if (!operand) {
				unsupported(source);
			}
			if (entry.value === '-') {
				stack.push(x => -operand(x));
			} else if (entry.value === '+') {
				stack.push(operand);
			} else {
				unsupported(entry.value);
			}
		} else if (entry.type === Token.OPERATOR) {
			if (entry.value === ',') {
				continue;
			}
			const right = stack.pop();
			const left = stack.pop();
			if (!left || !right) {
				unsupported(source);
			}
			switch (entry.value) {
				case '+': stack.push(x => left(x) + right(x)); break;
				case '-': stack.push(x => left(x) - right(x)); break;
				case '*': stack.push(x => left(x) * right(x)); break;
				case '/': stack.push(x => left(x) / right(x)); break;
				case '^': stack.push(x => Math.pow(left(x), right(x))); break;
				default: unsupported(entry.value);
			}
		} else {
			unsupported(source);
		}
	}

	return stack;
}

/** Compiles a scalar expression to closures without evaluating generated JavaScript. */
export function numericalIntegrand(expression: Expression, variable: string): ScalarEvaluator {
	const source = expression.text({ wrapPow: true });
	const values = compileScope(Parser.parseSyntax(source), variable, source);
	if (values.length !== 1) {
		unsupported(source);
	}
	return values[0];
}
