import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import {
	ABS,
	ACOS,
	ACOSH,
	ACOT,
	ACOTH,
	ACSC,
	ACSCH,
	ASEC,
	ASECH,
	ASIN,
	ASINH,
	ATAN,
	ATANH,
	CHI,
	CI,
	COS,
	COSH,
	COT,
	COTH,
	CSC,
	CSCH,
	DIFF,
	EI,
	ERF,
	LI,
	LOG,
	SEC,
	SECH,
	SGN,
	SHI,
	SI,
	SIN,
	SINH,
	TAN,
	TANH,
} from '../../core/classes/parser/constants';
import { _ } from '../../core/classes/parser/helpers';
import { message, UnsupportedOperationError } from '../../core/errors';
import { log } from '../../math/math';

import type { ExpressionInput } from '../../core/types';

/**
 * Applies the product rule to an expression
 *
 * @param expression
 * @param variable
 * @returns
 */
function productRule(expression: Expression, variable: Expression): Expression {
	//grab all the symbols within the CB symbol
	const elements = expression.elementsArray();
	let result = zero();

	//loop over all the symbols
	for (let i = 0; i < elements.length; i++) {
		let df = diff(elements[i], variable);
		for (let j = 0; j < elements.length; j++) {
			//skip the symbol of which we just pulled the derivative
			if (i !== j) {
				//multiply out the remaining symbols
				df = df.times(elements[j]);
			}
		}
		//add the derivative to the result
		result = result.plus(df);
	}
	return result; //done
}

/**
 * Differentiates an expression symbolically.
 *
 * The chain, product, sum, and power rules are applied recursively, together
 * with the built-in derivative table for recognized functions. An omitted
 * variable is inferred as the first variable in the expression. Existing
 * Expression input is reused during normalization.
 *
 * @remarks
 * `n` requests a repeated derivative. A non-integer order, a non-variable
 * differentiation target, or an unsupported derivative is preserved as an
 * unevaluated `diff(...)` expression. Constants and expressions independent of
 * the selected variable differentiate to zero.
 *
 * @param x - Expression to differentiate.
 * @param variable - Variable with respect to which the derivative is taken.
 * @param n - Positive integer derivative order. Defaults to the first derivative.
 * @returns The symbolic derivative, or an unevaluated `diff(...)` call when the
 * requested operation cannot be resolved.
 * @throws {@link core!UnsupportedOperationError} If `variable` is numeric.
 *
 * @example
 * ```ts
 * diff('sin(x^2)', 'x').text();
 * diff('x^4', 'x', 2).text();
 * ```
 */
export function diff(
	x: ExpressionInput,
	variable?: ExpressionInput,
	n?: Expression | number
): Expression {
	x = Expression.create(x);

	const variables = x.variables();
	// Set the variable if none was provided
	variable ??= Expression.Variable(variables[0]);

	variable = Expression.create(variable);
	const nth = typeof n === 'number' ? Expression.create(n) : n;
	// If the variable is a number then complain
	if (variable?.isNUM()) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	let retval: Expression | undefined;

	if (variables.length === 0 || !x.hasVariable(variable.value) || x.isConstant()) {
		retval = zero();
	}
	// If the variable is not of type VAR or nth is not an integer then return it untouched until either or both are resolved
	else if ((variable && !variable.isVAR()) || (nth && !nth.isInteger())) {
		retval = Expression.toFunction(DIFF, [x, variable, nth]);
	} else if (x.isEXP()) {
		// Apply rule a^x*(d/dx x*log(a))
		const a = log(x.getBase());
		const p = x.getPower();
		const dx = diff(a.times(p), variable);
		retval = x.times(dx);
	}
	// If the expression doesn't have a variable or if it's a constant then we're done
	else {
		// Reduce the nth call of the derivative
		const n = nth ? Number(nth) - 1 : 0;

		// Pull the derivate of the outside. At this point we've already performed all the required checks.
		const m = x.getMultiplier().times(x.getPower());
		const p = x.getPower().minus('1');
		const f = Expression.create(x.value);
		const fp = f.pow(p).times(m);
		// Pull the derivative of the inside
		if (f.isVAR()) {
			retval = one();
		} else if (f.isSum()) {
			let sum = zero();
			f.elementsArray().forEach(e => {
				sum = sum.plus(diff(e, variable));
			});
			retval = sum;
		} else if (f.isProduct()) {
			retval = productRule(f, variable);
		} else if (f.isFunction()) {
			const x = f.getArguments()[0];
			const m = f.getMultiplier();
			switch (f.name) {
				case LOG:
					retval = _(`(${m})/(${x})`);
					break;
				case COS:
					retval = _(`-sin(${x})`);
					break;
				case SIN:
					retval = _(`cos(${x})`);
					break;
				case TAN:
					retval = _(`sec(${x})^2`);
					break;
				case SEC:
					retval = _(`tan(${x})*sec(${x})`);
					break;
				case CSC:
					retval = _(`-cot(${x})*csc(${x})`);
					break;
				case COT:
					retval = _(`-csc(${x})^2`);
					break;
				case ACOS:
					retval = _(`-1/sqrt(1-(${x})^2)`);
					break;
				case ASIN:
					retval = _(`1/sqrt(1-(${x})^2)`);
					break;
				case ATAN:
					retval = _(`1/(1+(${x})^2)`);
					break;
				case ASEC:
					retval = _(`1/(sqrt(1-1/(${x})^2)*(${x})^2)`);
					break;
				case ACSC:
					retval = _(`-1/(sqrt(1-1/(${x})^2)*(${x})^2)`);
					break;
				case ACOT:
					retval = _(`-1/(1+(${x})^2)`);
					break;
				case COSH:
					retval = _(`sinh(${x})`);
					break;
				case SINH:
					retval = _(`cosh(${x})`);
					break;
				case TANH:
					retval = _(`sech(${x})^2`);
					break;
				case SECH:
					retval = _(`-sech(${x})*tanh(${x})`);
					break;
				case CSCH:
					retval = _(`-coth(${x})*csch(${x})`);
					break;
				case COTH:
					retval = _(`-csch(${x})^2`);
					break;
				case ASINH:
					retval = _(`1/sqrt(1+(${x})^2)`);
					break;
				case ACOSH:
					retval = _(`1/(sqrt(-1+(${x}))*sqrt(1+(${x})))`);
					break;
				case ATANH:
					retval = _(`1/(1-(${x})^2)`);
					break;
				case ASECH:
					retval = _(`-1/(sqrt(-1+1/(${x}))*sqrt(1+1/(${x}))*(${x})^2)`);
					break;
				case ACSCH:
					retval = _(`-1/(sqrt(1+1/(${x})^2)*(${x})^2)`);
					break;
				case ACOTH:
					retval = _(`1/(1-(${x})^2)`);
					break;
				case ABS:
					// d/dx abs(u) = sign(u) * u'
					retval = _(`sign(${x})`);
					break;
				case CI:
					retval = _(`cos(${x})/${x}`);
					break;
				case CHI:
					retval = _(`cosh(${x})/${x}`);
					break;
				case SI:
					retval = _(`sin(${x})/${x}`);
					break;
				case SHI:
					retval = _(`sinh(${x})/${x}`);
					break;
				case EI:
					retval = _(`e^(${x})/${x}`);
					break;
				case LI:
					retval = _(`1/${LOG}(${x})`);
					break;
				case ERF:
					retval = _(`(2*e^(-(${x})^2))/sqrt(pi)`);
					break;
				case SGN:
					retval = zero();
					break;
				// Missing: S, Si, Shi, Ci, Chi, Ei, Li, erf, atan2, sinc, heaviside
				// case '':
				//     retval = _(``);
				//     break;
			}
			// Multiply times the derivative of the inside
			if (retval) {
				retval = retval.times(diff(x, variable));
			}
		}

		if (retval) {
			retval = retval.times(fp);
		}

		// Pull the nth -1 derivative if that was requested
		if (n > 0 && retval) {
			retval = diff(retval, variable, Expression.Number(n));
		}
	}

	return retval || Expression.toFunction(DIFF, [x, variable, nth]);
}
