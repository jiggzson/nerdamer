import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { LOG } from '../../core/classes/parser/constants';
import { _ } from '../../core/classes/parser/helpers';
import { message, UnsupportedOperationError } from '../../core/errors';
import { log } from '../../math/math';

import type { ExpressionInputType } from '../../core/classes/parser/types';

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
 * Calculates the derivative of a given expression
 *
 * @param expression The expression from which the derivative is calculated
 * @param variable The variable with respect to the derivative is calculated
 * @param nth The nth derivative
 * @returns
 */
export function diff(
	expression: ExpressionInputType,
	variable?: ExpressionInputType,
	n?: Expression | number
): Expression {
	expression = Expression.create(expression);

	const variables = expression.variables();
	// Set the variable if none was provided
	variable ??= Expression.Variable(variables[0]);

	variable = Expression.create(variable);
	const nth = typeof n === 'number' ? Expression.create(n) : n;
	// If the variable is a number then complain
	if (variable?.isNUM()) {
		throw new UnsupportedOperationError(message('unsupportedOperation'));
	}

	let retval: Expression | undefined;

	if (
		variables.length === 0 ||
		!expression.hasVariable(variable.value) ||
		expression.isConstant()
	) {
		retval = zero();
	}
	// If the variable is not of type VAR or nth is not an integer then return it untouched until either or both are resolved
	else if ((variable && !variable.isVAR()) || (nth && !nth.isInteger())) {
		retval = Expression.toFunction('diff', [expression, variable, nth]);
	} else if (expression.isEXP()) {
		// Apply rule a^x*(d/dx x*log(a))
		const a = log(expression.getBase());
		const p = expression.getPower();
		const dx = diff(a.times(p), variable);
		retval = expression.times(dx);
	}
	// If the expression doesn't have a variable or if it's a constant then we're done
	else {
		// Reduce the nth call of the derivative
		const n = nth ? Number(nth) - 1 : 0;

		// Pull the derivate of the outside. At this point we've already performed all the required checks.
		const m = expression.getMultiplier().times(expression.getPower());
		const p = expression.getPower().minus('1');
		const f = Expression.create(expression.value);
		const fp = f.pow(p).times(m);
		// Pull the derivative of the inside
		if (f.isVAR()) {
			retval = one();
		} else if (f.isSum()) {
			retval = zero();
			f.elementsArray().forEach(e => {
				retval = retval!.plus(diff(e, variable));
			});
		} else if (f.isProduct()) {
			retval = productRule(f, variable);
		} else if (f.isFunction()) {
			const x = f.getArguments()[0];
			const m = f.getMultiplier();
			switch (f.name) {
				case 'log':
					retval = _(`(${m})/(${x})`);
					break;
				case 'cos':
					retval = _(`-sin(${x})`);
					break;
				case 'sin':
					retval = _(`cos(${x})`);
					break;
				case 'tan':
					retval = _(`sec(${x})^2`);
					break;
				case 'sec':
					retval = _(`tan(${x})*sec(${x})`);
					break;
				case 'csc':
					retval = _(`-cot(${x})*csc(${x})`);
					break;
				case 'cot':
					retval = _(`-csc(${x})^2`);
					break;
				case 'acos':
					retval = _(`-1/sqrt(1-(${x})^2)`);
					break;
				case 'asin':
					retval = _(`1/sqrt(1-(${x})^2)`);
					break;
				case 'atan':
					retval = _(`1/(1+(${x})^2)`);
					break;
				case 'asec':
					retval = _(`1/(sqrt(1-1/(${x})^2)*(${x})^2)`);
					break;
				case 'acsc':
					retval = _(`-1/(sqrt(1-1/(${x})^2)*(${x})^2)`);
					break;
				case 'acot':
					retval = _(`-1/(1+(${x})^2)`);
					break;
				case 'cosh':
					retval = _(`sinh(${x})`);
					break;
				case 'sinh':
					retval = _(`cosh(${x})`);
					break;
				case 'tanh':
					retval = _(`sech(${x})^2`);
					break;
				case 'sech':
					retval = _(`-sech(${x})*tanh(${x})`);
					break;
				case 'csch':
					retval = _(`-coth(${x})*csch(${x})`);
					break;
				case 'coth':
					retval = _(`-csch(${x})^2`);
					break;
				case 'asinh':
					retval = _(`1/sqrt(1+(${x})^2)`);
					break;
				case 'acosh':
					retval = _(`1/(sqrt(-1+(${x}))*sqrt(1+(${x})))`);
					break;
				case 'atanh':
					retval = _(`1/(1-(${x})^2)`);
					break;
				case 'asech':
					retval = _(`-1/(sqrt(-1+1/(${x}))*sqrt(1+1/(${x}))*(${x})^2)`);
					break;
				case 'acsch':
					retval = _(`-1/(sqrt(1+1/(${x})^2)*(${x})^2)`);
					break;
				case 'acoth':
					retval = _(`1/(1-(${x})^2)`);
					break;
				case 'abs':
					// d/dx abs(u) = sign(u) * u'
					retval = _(`sign(${x})`);
					break;
				case 'Ci':
					retval = _(`cos(${x})/${x}`);
					break;
				case 'Chi':
					retval = _(`cosh(${x})/${x}`);
					break;
				case 'Si':
					retval = _(`sin(${x})/${x}`);
					break;
				case 'Shi':
					retval = _(`sinh(${x})/${x}`);
					break;
				case 'Ei':
					retval = _(`e^(${x})/${x}`);
					break;
				case 'Li':
					retval = _(`1/${LOG}(${x})`);
					break;
				case 'erf':
					retval = _(`(2*e^(-(${x})^2))/sqrt(pi)`);
					break;
				case 'sign':
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

	return retval || Expression.toFunction('diff', [expression, variable, nth]);
}
