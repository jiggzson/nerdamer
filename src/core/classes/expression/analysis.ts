import { product } from '../../../math/utils';
import { LCM } from '../../functions/bigint/bigint';
import { expand } from '../../functions/expand/expand';

import { CoeffObject } from './CoeffObject';
import { Expression } from './Expression';
import { one, zero } from './shortcuts';

/**
 * Separates the variable and coefficient for the specified variable
 *
 * @param x
 * @param variable
 * @returns
 */

export function separateVar(x: Expression, variables: (string | Expression)[]) {
	// Extract the value of the variable if a Expression was provided
	const vars = variables.map(x => {
		if (typeof x !== 'string') {
			return x.value;
		}
		return x;
	});

	function isLike(x: Expression, vars: string[]) {
		return vars.includes(x.value);
	}

	let retval;

	// You can only separate in a product and not a sum. e.g. 3*a*x
	if (x.isProduct()) {
		const coeff = [Expression.fromRational(x.getMultiplier())];
		const v: Expression[] = [];
		x.each(e => {
			// GRP should be separated as well so we have to perform an additional check.
			if (isLike(e, vars)) {
				v.push(e);
			} else {
				coeff.push(e);
			}
		});

		retval = [product(...coeff), product(...v) || one()];
	}

	// E.g. 3*x^2 or 5*(x^2+x) or 4*x^x
	else if (isLike(x, vars)) {
		retval = [Expression.fromRational(x.getMultiplier()), x.toUnitMultiplier()];
	}

	// e.g. 3*b or 6
	else {
		retval = [Expression.create(x), one()];
	}

	return retval;
}
/**
 * Gets the coefficients wrt to a given variable
 *
 * @param wrt
 */

export function coeffs(x: Expression, variables: string[], coeffsObj?: CoeffObject) {
	const cObj = coeffsObj || new CoeffObject(variables);
	// First sanitize the expression
	if (x.isProduct()) {
		const constantsKey = variables.map(() => '0').join(',');
		let t = Expression.fromRational(x.getMultiplier());
		const elements = x.getElements();
		for (const c in elements) {
			const element = elements[c];
			if (element.isSum() && element.getPower().sign() < 0) {
				cObj.add(constantsKey, element);
			} else {
				t = t.times(element);
			}
		}
		x = t;
	}
	// Expand the expression
	const f = expand(x);
	if (f.isSum()) {
		// Loop through the expression and get the coefficient for each
		f.each(e => {
			coeffs(e, variables, cObj);
		});
	} else {
		// const [coeff, v] = x.separateVar(...variables);
		const [coeff, v] = separateVar(x, variables);
		// const p = v.getPower().text();
		const powers = variables.map(x => v.getVariable(x).getPower().text());
		// cObj[p] = cObj[p] ? cObj[p].plus(coeff) : coeff;
		cObj.add(powers.join(','), coeff);
	}

	return cObj;
}
export function getDenominator(x: Expression) {
	let retval = Expression.Number(x.getMultiplier().denominator);
	const isProduct = x.isProduct();
	const sign = x.getPower().sign();
	// Using sign === -1 is not a bug since the power gets distributed by default.
	if (sign === -1) {
		retval = retval.times(x.toUnitMultiplier().invert());
	} else if (isProduct && x.isLinear()) {
		for (const element of x.elementsArray()) {
			if (element.isProduct()) {
				retval = retval.times(getDenominator(element));
			} else if (element.getPower().sign() < 0) {
				retval = retval.times(element.invert());
				// retval = retval.times(element.invert());
			}
		}
	}

	return retval;
}

export function getNumerator(x: Expression) {
	// Initialize with the value of the multiplier's numerator. e.g. (1/2)*x = 1*x as the numerator
	let retval = Expression.Number(x.getMultiplier().numerator);
	const isProduct = x.isProduct();
	const sign = x.getPower().sign();
	// If it's not a product and the sign is positive then we're done e.g. x, (1+x)^2, ...
	if ((!isProduct && sign > 0) || (isProduct && sign > 1)) {
		retval = retval.times(x.toUnitMultiplier());
	}

	// Otherwise, we loop through the product
	else if (isProduct && x.isLinear()) {
		const elements = x.elementsArray();
		for (const e of elements) {
			const num = getNumerator(e);
			retval = retval.times(num);
		}
	}

	return retval;
} /**
 * Returns true fo polynomial with coefficients in Z or Q.
 * @param x
 * @returns
 */

export function isPolynomialLike(x: Expression) {
	const power = x.getPower();
	// Instantly disqualify elements under the denominator, radicals, exponential functions, infinity, ...
	if (!power.isInteger() || power.sign() === -1 || x.isEXP() || x.isFunction() || x.isInf()) {
		return false;
	}

	// Check within nested sums and products
	else if (x.isSum() || x.isProduct()) {
		// Check the elements
		for (const element of x.elementsArray()) {
			if (!isPolynomialLike(element)) {
				return false;
			}
		}
	}
	// Return true for all else x, x^2, etc
	return true;
}

export function getVariable(x: Expression, variable: string) {
	if (x.value === variable) {
		return x;
	} else if (x.isProduct()) {
		const elements = x.getElements();
		for (const x in elements) {
			if (elements[x].value === variable) {
				return elements[x];
			}
		}
	}

	return zero();
} // Example 1/2*x+3/5*y+2/7*z
// Returns 1/70 (35 x + 42 y + 20 z)

export function normalizeMultiplierDenominators(x: Expression) {
	let retval: Expression;
	if (x.isSum()) {
		const distributed = x.distributeMultiplier();
		const terms = distributed.elementsArray();

		const denominators: bigint[] = [];
		for (const term of terms) {
			denominators.push(term.getMultiplier().denominator);
		}

		const denominator = LCM(...denominators);
		const expression = distributed.times(denominator).distributeMultiplier();

		retval = expression.div(denominator);
	} else {
		retval = x;
	}
	return retval;
}
