import { Settings } from '../../Settings';
import { RATIONAL, SYMBOLIC_ACCESSOR } from '../parser/constants';
import { EXPRESSION_TYPES } from '../parser/constants';

import type { TextOptions } from '../parser/types';
import type { Expression } from './Expression';

type ExpressionSortFunction = (a: Expression, b: Expression) => number;
type ExpressionTextOptions = TextOptions & {
	internalAccessor?: boolean;
	exactScientific?: boolean;
};

const { NUM, FUN, VAR, INF, GRP, EXP, PRD, SUM } = EXPRESSION_TYPES;

/**
 * Formats the multiplier string for string output.
 * The multiplier string can be blank, include an *, or be formatted as a decimal or fraction.
 *
 * @param x
 * @param options
 * @returns
 */
export function formatMultiplierString(x: Expression, options?: ExpressionTextOptions) {
	let retval = '';
	const m = x.getMultiplier();
	const mString = m.text(options);
	const isScientific = options?.scientific !== undefined;
	const isUnit = isScientific ? m.isOne() : mString === '1' || mString === '1.0';

	if (!isUnit) {
		retval = mString;

		if (!m.isInteger() && !(m.asDecimal || options?.decimal || options?.scientific)) {
			retval = `(${retval})`;
		}

		// Keep the established display behavior for approximate decimal values that render as -1.0.
		const isMinusUnit = isScientific
			? m.isMinusOne()
			: mString === '-1' || mString === '-1.0';
		if (isMinusUnit && !options?.wrapPow) {
			retval = '-';
		} else {
			retval += '*';
		}
	}

	return retval;
}

/**
 * The power string can be blank, include a ^, or be formatted as a decimal or fraction.
 * Since it can be fraction or an expression, it will also determine if brackets are needed.
 *
 * @param x
 * @param options
 * @param powerOperator
 * @returns
 */
export function formatPowerString(
	x: Expression,
	options: ExpressionTextOptions | undefined,
	powerOperator: string
) {
	let retval = '';
	const power = x.getPower();
	const powerOptions: ExpressionTextOptions = {
		...options,
		exactScientific: true,
	};
	const powerString: string = power.text(powerOptions);

	if (powerString !== '1' && powerString !== '1.0') {
		retval = powerString;

		// Wrap fractions in brackets
		if (power.dataType === RATIONAL && !power.isInteger()) {
			retval = `(${retval})`;
		} else {
			const power = x.getPower();
			let needsBrackets = false;

			if (power.type === SUM || power.type === PRD) {
				needsBrackets = true;
			} else if (x.type === EXP) {
				if (power.isNUM() && !power.isInteger()) {
					needsBrackets = true;
				} else if (!power.isNUM() && !power.getMultiplier().isOne()) {
					needsBrackets = true;
				}
			}

			if (needsBrackets || retval.includes('/')) {
				retval = `(${retval})`;
			}
		}

		if (options?.wrapPow && !retval.startsWith('(')) {
			retval = `(${retval})`;
		}

		retval = `${powerOperator}${retval}`;
	}

	return retval;
}

function formatDefaultPowerString(
	x: Expression,
	powerOperator: string,
	sortFunction: ExpressionSortFunction
): string {
	let retval = '';
	const power = x.getPower();
	const powerString = toDefaultText(power, powerOperator, sortFunction);

	if (powerString !== '1' && powerString !== '1.0') {
		retval = powerString;

		if (power.dataType === RATIONAL && !power.isInteger()) {
			retval = `(${retval})`;
		} else {
			let needsBrackets = false;

			if (power.type === SUM || power.type === PRD) {
				needsBrackets = true;
			} else if (x.type === EXP) {
				if (power.isNUM() && !power.isInteger()) {
					needsBrackets = true;
				} else if (!power.isNUM() && !power.getMultiplier().isOne()) {
					needsBrackets = true;
				}
			}

			if (needsBrackets || retval.includes('/')) {
				retval = `(${retval})`;
			}
		}

		retval = `${powerOperator}${retval}`;
	}

	return retval;
}

function formatDefaultExpressionString(
	x: Expression,
	powerOperator: string,
	sortFunction: ExpressionSortFunction
): string {
	const glue = x.type === PRD ? '*' : '+';
	const elements = Object.values(x.getElements());

	if (Settings.SORT_TERMS) {
		elements.sort(sortFunction);
	}

	return elements
		.map(element => {
			let value = toDefaultText(element, powerOperator, sortFunction);
			if (x.type === PRD && element.isSum()) {
				value = `(${value})`;
			}
			return value;
		})
		.join(glue)
		.replace('+-', '-');
}

/**
 * Formats the ordinary no-options text form without creating formatting option objects
 * while descending the expression tree.
 *
 * This routine follows the same default rendering rules as {@link toText}. Calls that
 * request explicit formatting options continue through {@link toText}.
 */
export function toDefaultText(
	x: Expression,
	powerOperator: string,
	sortFunction: ExpressionSortFunction
): string {
	let retval = '';

	if (x.type === NUM) {
		retval = x.getMultiplier().text();
	} else {
		const multiplier = formatMultiplierString(x);
		const power = formatDefaultPowerString(x, powerOperator, sortFunction);
		let value: string;

		switch (x.type) {
			case VAR:
			case INF:
				retval = `${multiplier}${x.value}`;
				break;
			case FUN: {
				if (x.name === SYMBOLIC_ACCESSOR) {
					const args = x.getArguments();
					const target = args[0];
					const indices = args.slice(1);
					retval = `${multiplier}${toDefaultText(
						target,
						powerOperator,
						sortFunction
					)}[${indices
						.map(index => toDefaultText(index, powerOperator, sortFunction))
						.join(', ')}]`;
				} else {
					retval = `${multiplier}${x.name || ''}(${x
						.getArguments()
						.map(argument => toDefaultText(argument, powerOperator, sortFunction))
						.join(', ')})`;
				}
				break;
			}
			case GRP:
			case SUM:
				value = formatDefaultExpressionString(x, powerOperator, sortFunction);
				value = multiplier || power ? `(${value})` : value;
				retval = `${multiplier}${value}`;
				break;
			case PRD:
				value = formatDefaultExpressionString(x, powerOperator, sortFunction);
				value = power ? `(${value})` : value;
				retval = `${multiplier}${value}`;
				break;
			case EXP: {
				const arg = x.getBase();
				const p = arg.getPower();
				value = toDefaultText(arg, powerOperator, sortFunction);
				if (
					arg.elements ||
					value.startsWith('-') ||
					value.includes('/') ||
					!(p.isOne() || p.isZero())
				) {
					value = `(${value})`;
				}
				retval = `${multiplier}${value}`;
				break;
			}
		}

		retval += power;
	}

	return retval.replace(/\+-/g, '-');
}

/**
 * Formats an expression using the current formatting policy supplied by Expression.
 *
 * @param x
 * @param options
 * @param asId
 * @param powerOperator
 * @param sortFunction
 * @returns
 */
export function toText(
	x: Expression,
	options: ExpressionTextOptions | undefined,
	asId: boolean | undefined,
	powerOperator: string,
	sortFunction: ExpressionSortFunction
) {
	options = { ...{ precision: x.precision!, scientific: x.scientific }, ...options };

	let retval: string = '';
	if (x.type === NUM) {
		retval = x.getMultiplier().text(options);
	} else {
		// Get the multiplier but don't add it for the top level. Only
		// format sub-elements
		const multiplier = asId && !x.elements ? '' : formatMultiplierString(x, options);
		const power = formatPowerString(x, options, powerOperator);
		let value: string;
		switch (x.type) {
			case VAR:
			case INF:
				if (options?.wrapPow && power) {
					retval = `${multiplier}(${x.value})`;
				} else {
					retval = `${multiplier}${x.value}`;
				}
				break;
			case FUN: {
				// Symbolic access is stored as an ordinary function node so it can participate
				// in Expression logic without allowing Vector or Matrix objects into args.
				if (x.name === SYMBOLIC_ACCESSOR) {
					const args = x.getArguments();
					if (options?.internalAccessor) {
						// Evaluation needs a parseable form that cannot be confused with
						// implicit multiplication when the target type is still unknown.
						retval = `${multiplier}${SYMBOLIC_ACCESSOR}(${args
							.map(argument => argument.text(options))
							.join(', ')})`;
					} else {
						const target = args[0];
						const indices = args.slice(1);
						retval = `${multiplier}${target.text(options)}[${indices
							.map(index => index.text(options))
							.join(', ')}]`;
					}
				} else {
					// TODO: See Expression.toFunction for possible refactoring.
					retval = `${multiplier}${x.name || ''}(${x
						.getArguments()
						.map(x => x.text(options))
						.join(', ')})`;
				}
				break;
			}
			case GRP:
			case SUM: {
				value = formatExpressionString(x, options, sortFunction);
				value = multiplier || power ? `(${value})` : value;
				// The value has already been calculated when the values were added
				retval = `${multiplier}${value}`;
				break;
			}
			case PRD: {
				value = formatExpressionString(x, options, sortFunction);
				value = power ? `(${value})` : value;
				retval = `${multiplier}${value}`;
				break;
			}
			case EXP: {
				const arg = x.getBase();
				const p = arg.getPower();
				value = toText(arg, options, undefined, powerOperator, sortFunction);
				// The following cases get brackets.
				// 1 - (x+1)^x
				// 2 - (-x)^x
				// 3 - (2/3)^x
				// 4 - (x^x)^x
				if (
					options?.wrapPow ||
					arg.elements ||
					value.startsWith('-') ||
					value.includes('/') ||
					!(p.isOne() || p.isZero())
				) {
					value = `(${value})`;
				}
				retval = `${multiplier}${value}`;

				break;
			}
		}

		retval += power;
	}

	return retval.replace(/\+-/g, '-');
}

// export function toTeX(x: Expression, options?: ExpressionTextOptions) {

// }

export function formatExpressionString(
	x: Expression,
	options: ExpressionTextOptions | undefined,
	sortFunction: ExpressionSortFunction
) {
	const glue = x.type === PRD ? '*' : '+';
	const elements: Expression[] = Object.values(x.getElements());

	if (Settings.SORT_TERMS || options?.sort) {
		elements.sort(sortFunction);
	}

	return elements
		.map(e => {
			let value = e.text(options);
			// Wrap it in brackets for certain conditions
			if (x.type === PRD && e.isSum()) {
				value = `(${value})`;
			}
			return value;
		})
		.join(glue)
		.replace('+-', '-');
}

/**
 * Converts to capital letter e.g. 1=A, 2=B, ..., 100=CV
 *
 * @param n
 * @returns
 */
export function convertToTitle(n: number) {
	let result = '';
	while (n > 0) {
		n--;
		result = String.fromCharCode(65 + (n % 26)) + result;
		n = Math.floor(n / 26);
	}
	return result;
}
