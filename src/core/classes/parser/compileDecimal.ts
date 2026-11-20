import Decimal from 'decimal.js';

import { Scope } from '../../common/classes/Scope';
import { getOperators } from '../../common/functions/functions';
import { PARSER_CONSTANTS } from '../../constants/parserValues';
import { mathFunctionRegistry } from '../../dispatch';
import { message, UndefinedError, UnsupportedOperationError } from '../../errors';
import { connectedNumericalFunctions } from '../../functions/connectFunctions';
import { Settings } from '../../Settings';

import { Parser } from './Parser';
import { Token } from './Token';

import type { DecimalFunction, MathFunctionEntry } from '../../dispatch';

/** Evaluates a supported real scalar expression without symbolic intermediates. */
export type DecimalEvaluator = (value: Decimal) => Decimal;

interface NumericNode {
	evaluate: DecimalEvaluator;
	integer?: Decimal;
}

/**
 * Compiles Nerdamer's shared syntax to reusable, Decimal-only arithmetic.
 *
 * Unsupported syntax returns undefined so the caller can retain normal parser
 * behavior. The intentionally limited subset has one variable, real constants,
 * basic arithmetic, integer powers and registered unary numerical functions.
 * No new grammar, generated JavaScript or native-number numerical operations.
 *
 * Noninteger powers are excluded because principal-branch and complex behavior
 * can differ from Decimal.pow. Non-finite results must be passed to the ordinary
 * parser by the caller.
 * Numerical functions are provided by mathFunctionRegistry.decimalFn, never
 * by the registry's symbolic Expression-based fn.
 */
export function compileDecimal(source: string, variable: string): DecimalEvaluator | undefined {
	// Parser constants have priority over scoped values.
	if (variable in PARSER_CONSTANTS ||
		(Settings.SUBSTITUTE && variable in Parser.KNOWN_VALUES)) {
		return undefined;
	}

	const registrations = new Map<string, {
		fn: MathFunctionEntry['fn'];
		decimalFn: DecimalFunction;
	}>();
	const operators = new Map<string, string>();

	function unsupported(): never {
		throw new UnsupportedOperationError(message('unsupportedParserEntity'));
	}

	function compileScope(scope: Scope): NumericNode[] {
		if (scope.deferLHSResolution || scope.deferRHSResolution || scope.implicitMultiply) {
			unsupported();
		}

		const stack: NumericNode[] = [];

		for (let i = 0; i < scope.length; i++) {
			const token = scope[i];

			if (Scope.isScope(token)) {
				if (token.type !== 'parenthesis') {unsupported();}
				const values = compileScope(token);
				if (values.length !== 1) {unsupported();}
				stack.push(values[0]);
				continue;
			}

			if (token.type === Token.NUMBER) {
				const constant = new Decimal(token.value);
				stack.push({
					evaluate: () => constant,
					integer: constant.isInteger() ? constant : undefined,
				});
				continue;
			}

			if (token.type === Token.VARIABLE) {
				// Precision-sensitive constants and other variables use the parser.
				if (token.value !== variable) {unsupported();}
				stack.push({ evaluate: x => x });
				continue;
			}

			if (token.type === Token.FUNCTION) {
				const argsScope = scope[++i];
				if (!Scope.isScope(argsScope) || argsScope.type !== 'parenthesis') {
					unsupported();
				}
				const args = compileScope(argsScope);
				// An alias is compiled as the function it stands for.
				const name = mathFunctionRegistry[token.value]?.aliasOf ?? token.value;
				const registration = mathFunctionRegistry[name];
				const fn = registration?.decimalFn;
				if (
					!registration || !fn || args.length !== 1 ||
					registration.level !== 'system' ||
					registration.deferArguments ||
					(registration.minArgs !== -1 && registration.minArgs > 1) ||
					(registration.maxArgs !== -1 && registration.maxArgs < 1) ||
					connectedNumericalFunctions[name] !== undefined ||
					mathFunctionRegistry[token.value].deprecated
				) {
					unsupported();
				}
				registrations.set(name, { fn: registration.fn, decimalFn: fn });
				const argument = args[0].evaluate;
				stack.push({ evaluate: x => {
					const result = fn(argument(x));
					if (result === undefined) {unsupported();}
					return result;
				} });
				continue;
			}

			if (token.type === Token.PREFIX) {
				const argument = stack.pop();
				if (!argument) {unsupported();}

				if (token.value === '-') {
					stack.push({
						evaluate: x => argument.evaluate(x).neg(),
						integer: argument.integer?.neg(),
					});
				} else if (token.value === '+') {
					stack.push(argument);
				} else {
					unsupported();
				}
				continue;
			}

			if (token.type !== Token.OPERATOR) {unsupported();}
			const right = stack.pop();
			const left = stack.pop();
			if (!right || !left) {unsupported();}

			const operator = token.resolvedOperator ?? getOperators()[token.value];
			if (!operator) {unsupported();}
			operators.set(token.value, operator.action);

			const a = left.evaluate;
			const b = right.evaluate;

			switch (token.value) {
				case '+':
					if (operator.action !== 'plus') {unsupported();}
					stack.push({ evaluate: x => a(x).plus(b(x)) });
					break;
				case '-':
					if (operator.action !== 'minus') {unsupported();}
					stack.push({ evaluate: x => a(x).minus(b(x)) });
					break;
				case '*':
					if (operator.action !== 'times') {unsupported();}
					stack.push({ evaluate: x => a(x).times(b(x)) });
					break;
				case '/':
					if (operator.action !== 'div') {unsupported();}
					stack.push({ evaluate: x => a(x).div(b(x)) });
					break;
				case '^': {
					if (operator.action !== 'pow' || !right.integer) {unsupported();}
					const exponent = right.integer;
					// A square is one correctly rounded product, the same value pow gives, but
					// cheaper. Higher powers would round more than once, so they keep pow.
					if (exponent.eq(2)) {
						stack.push({
							evaluate: x => {
								const base = a(x);
								return base.times(base);
							},
						});
					} else {
						stack.push({ evaluate: x => a(x).pow(exponent) });
					}
					break;
				}
				default:
					unsupported();
			}
		}
		return stack;
	}

	try {
		const nodes = compileScope(Parser.parseSyntax(source));
		if (nodes.length !== 1) {return undefined;}
		const evaluate = nodes[0].evaluate;

		return x => {
			// Preserve dynamically connected functions and parser registrations.
			for (const [name, registration] of registrations) {
				const current = mathFunctionRegistry[name];
				if (
					connectedNumericalFunctions[name] !== undefined ||
					current?.fn !== registration.fn ||
					current?.decimalFn !== registration.decimalFn
				) {
					throw new UnsupportedOperationError(message('unsupportedParserEntity'));
				}
			}
			if (variable in PARSER_CONSTANTS ||
				(Settings.SUBSTITUTE && variable in Parser.KNOWN_VALUES)) {
				throw new UnsupportedOperationError(message('unsupportedParserEntity'));
			}
			for (const [name, action] of operators) {
				if (getOperators()[name]?.action !== action) {
					throw new UnsupportedOperationError(message('unsupportedParserEntity'));
				}
			}

			const result = evaluate(x);
			if (!result.isFinite()) {
				throw new UndefinedError(message('undefinedValue'));
			}
			return result;
		};
	} catch {
		return undefined;
	}
}
