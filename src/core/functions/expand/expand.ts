import { Expression } from '../../classes/expression/Expression';
import { zero } from '../../classes/expression/shortcuts';
import { FACTORIAL, WRAP } from '../../classes/parser/constants';

export function powerExpandToArray(variables: string[], power: number) {
	/**
	 * The row will take on the form of [a_power, b_power, ..., coeff]. The polynomial gets
	 * flattened so we'll disregard their powers. We'll let the parser handle that at a later point.
	 * So x^2 + x*y become two flat variables with the value x^2 and x*y but for this example let's
	 * think of a & b. Since the variable is flattened each "term" becomes [0, 0, 1]. We'll construct
	 * a table multiplying out the row and column. For the first iteration the column = row. Our table
	 * becomes something like this
	 * +---+----+----+
	 * |   | a  | b  |
	 * +---+----+----+
	 * | a | aa | ba |
	 * | b | ab | bb |
	 * +---+----+----+
	 */

	// Constructs the row. You get back the array with zeros and a coefficient of one at the end
	// Given the expression (a+b) becomes [[0,0,1], [0,0,1]] where representing[[power a, power b, coeff a], [power a, power b, coeff b]]
	// The powers for each term are zero since they're just the value 1
	function constructRow() {
		return variables.map((x, i) => {
			const row = new Array(variables.length).fill(0);
			row.push(1);
			row[i] = 1;
			return row;
		});
	}

	// We now perform piecewise multiplication incrementing the power each time like values are multiplied.
	let row = constructRow();

	for (let n = 0; n < power - 1; n++) {
		const result: number[][] = [];
		for (let i = 0; i < row.length; i++) {
			for (let j = 0; j < variables.length; j++) {
				const term = [...row[i]];
				term[j]++;
				result.push(term);
			}
		}

		const sumMap = new Map<string, number[]>();
		for (const term of result) {
			const key = term.slice(0, -1).join(',');
			const existing = sumMap.get(key);
			if (existing) {
				existing[existing.length - 1] += term[term.length - 1];
			} else {
				sumMap.set(key, [...term]);
			}
		}

		row = Array.from(sumMap.values());
	}

	return row;
}

/**
 * Converts an array of number[] back to its expression form. Given a set of arrays in
 * the form [[1,1,2], [2,0,1]] and the variables [a, b] it gets converted back to
 * a*b*2 + (a)^2. At the time of this documentation the brackets are always added for power > 1
 *
 * @param row
 * @param variables
 * @returns
 */
export function expandArrayToExpression(row: number[][], variables: string[], multiplier?: string) {
	const termsArray: string[] = [];
	// Put the multiplication in front of the multiplier if provided
	const m = multiplier ? `${multiplier}*` : '';

	for (let i = 0; i < row.length; i++) {
		const term = row[i];
		const varStringArray: string[] = [];
		// We skip the last element since that's the coefficient
		for (let j = 0; j < term.length - 1; j++) {
			const variable = variables[j];
			const p = term[j];
			if (p === 1) {
				varStringArray.push(`(${variable})`);
			} else if (p !== 0) {
				varStringArray.push(`(${variable})^${p}`);
			}
		}

		let termsString = varStringArray.join('*');
		const coeff = term[term.length - 1];
		if (coeff !== 1) {
			termsString = `(${coeff})*${termsString}`;
		}

		termsArray.push(m + termsString);
	}

	return termsArray.join('+');
}

/**
 * Checks to see if a sum or product is expandable.
 *
 * @param x
 */
export function isExpandable(x: Expression) {
	return x.isComplex() || !x.getMultiplier().isOne() || x.value.includes('(') || !x.isLinear();
}

/**
 * Expands the Expression with integer powers > 1. It does this by first flattening out the expression.
 * The multiplier and power then become one. This enables us to focus on expanding the power by using
 * integers. So give (x*y+z*y^6)^2 we substitute x*y for 1*($1)^1 and z*y^6 for 1*($2)^1. We then end up with
 * 1*($1)^2 + 2*($1*$2)^1 + 1*($2)^2 after which we back substitute to get 1*(x*y)^2 + 2*(x*y*z*y^6)^1 + 1*(z*y^6)^2
 * and run it through the parser for evaluation.
 *
 * @param x
 */
export function powerExpand(x: Expression) {
	let retval = x;

	if (x.isSum() && x.getPower().isInteger()) {
		const sgn = x.getPower().sign();
		const power = x.getPower().abs();
		const variables = x.elementsArray().map(e => {
			return e.text();
		});

		const multiplier = x.getMultiplier().isOne()
			? undefined
			: (sgn < 0 ? x.getMultiplier().invert() : x.getMultiplier()).text();

		const termsArray = powerExpandToArray(variables, Number(power));

		const expression = expandArrayToExpression(termsArray, variables, multiplier);

		retval = Expression.create(expression);

		if (sgn === -1) {
			retval = retval.invert();
		}
	}

	return retval;
}

/**
 * Performs multiplication but expands out the sum.
 *
 * @param x
 * @param y
 * @returns
 */
export function sumExpandMultiply(x: Expression, y: Expression) {
	// Expand both

	let retval;

	if (y.isSum() && !x.isSum()) {
		retval = sumExpandMultiply(y, x);
	}
	// Expand but only if the power is one
	else if (x.isSum()) {
		if (!x.isLinear()) {
			// Expand if the power is not one.
			x = powerExpand(x);
		}

		// Expand if expandable
		if (x.isLinear()) {
			retval = zero();
			x.each(element => {
				if (isExpandable(element)) {
					element = expand(element);
				}
				// If either is a sum then call this function recursively
				if (y.isSum() || element.isSum()) {
					retval = retval.plus(sumExpandMultiply(y, element));
				} else {
					const result = y.times(element);
					retval = retval.plus(result);
				}
			});
		}
		// Since it turns out that x is not expandable likely due to it being under the denominator,
		// we can try to see if y is expandable. We send it back to sumExpandMultiply.
		// Only swap if y is linear to avoid infinite ping-pong between two non-linear sums.
		else if (y.isSum() && y.isLinear()) {
			retval = sumExpandMultiply(y, x);
		}
		// Since x cannot be expanded and y is not a linear sum, then multiply and return
		else {
			retval = x.times(y);
		}
	} else {
		retval = expand(x).times(expand(y));
	}

	return retval;
}

/**
 * Expands the product of expressions. The power gets distributed when expanding.
 *
 * @param x
 * @returns
 */
function productExpand(x: Expression) {
	/*
	 * Only expand if needed. This eliminates unnecessary multiplication. Note this this is not an all inclusive tests and contains false positives.
	 * In that case it will just be a wasted effort. The test is performed against x value instead of x.text().
	 * Test to see if:
	 * - It has a element with an integer power.
	 * - It has a scoped multiplier
	 * - Contains a sum
	 */
	// We start with the multiplier
	let retval: Expression;

	retval = Expression.fromRational(x.getMultiplier());
	// Store the power
	const pow = x.getPower();
	// Store the check to see if the power is one. If it is then don't raise it
	const powIsOne = pow.isOne();
	// Loop through the remaining elements
	x.each(element => {
		// The power does not equal one then raise it to that power
		if (!powIsOne) {
			element = element.pow(pow);
		}

		// Unwrap the elements
		element = unwrap(element);
		// Expand it if expandable
		// if(isExpandable(element)) {
		element = expand(element);
		// }

		// Store the power
		const power = element.getPower();
		// If it's a product with a power != 1 then expand otherwise just put it back
		if (element.isProduct() && power.isInteger() && !power.isOne()) {
			element.each(subElement => {
				retval = retval.times(subElement.pow(power));
			});
		}
		// retval may have been multiplied out and become a sum at this point so we need to check
		// if retval or the element is a sum
		else if (retval.isSum() || element.isSum()) {
			retval = sumExpandMultiply(retval, element);
		}
		// Otherwise just multiply it out but to check if it's expandable first
		else {
			retval = retval.times(element);
		}
	});

	return retval;
}

/**
 * Expands each term of the sum. Expects a fully expanded sum
 *
 * @param x
 * @returns
 */
function expandTerms(x: Expression) {
	// Only expand into individual terms if the sum has power 1.
	// For non-linear sums like (b^2-4*a)^(1/2), we must preserve the outer power.
	if (!x.isLinear()) {
		return x;
	}

	let retval = zero();
	x.each(e => {
		retval = retval.plus(expand(e));
	});

	return retval;
}

/**
 * Removes the expression from the `parens` function
 * @param x
 * @returns
 */
function unwrap(x: Expression) {
	if (x.isFunction(WRAP)) {
		const arg = x.getArguments()[0].pow(x.getPower()).times(x.getMultiplier());
		return arg;
	}

	return x;
}

/**
 * Expands factorials in the form of (an+m)!
 * @param x
 * @returns
 */
function factorialExpand(x: Expression) {
	const args = x.getArguments();
	let retval = x;
	const argElements = args[0].elementsArray().sort((a, _b) => {
		if (a.isNUM()) {
			return 1;
		}
		return -1;
	});

	if (argElements.length === 2) {
		const a = argElements[0];
		const b = argElements[1];

		if (a.isVAR() && a.isLinear() && b.isInteger()) {
			const p = x.getPower();
			const iterations = Number(b.getMultiplier().numerator);

			// Start with the base factorial: fact(a) e.g., fact(2*n)
			const baseFact = Expression.toFunction(FACTORIAL, [a]);
			retval = baseFact;

			// Multiply by (a+1) * (a+2) * ... * (a+b)
			// NOT by fact(a+1) * fact(a+2) * ...
			for (let i = 1; i <= iterations; i++) {
				const term = a.plus(i); // (2n+1), (2n+2), etc.
				retval = retval.times(term); // multiply by the term, not its factorial
			}
			retval = retval.pow(p);
		} else {
			let t = Expression.toFunction(retval.name!, args);
			t.multiplier = retval.multiplier;
			t = Expression.setPower(t, retval.getPower());
			retval = t;
		}
	} else {
		let t = Expression.toFunction(retval.name!, args);
		t.multiplier = retval.multiplier;
		t = Expression.setPower(t, retval.getPower());
		retval = t;
	}
	return retval;
}

/**
 * Expands the function by distributing the power and the multiplier whenever possible
 *
 * @param x
 */
export function expand(x: Expression) {
	let retval;

	x = unwrap(x);

	if (isExpandable(x)) {
		if (x.isNUM() || x.isVAR()) {
			retval = new Expression(x);
		} else {
			// At the very least the multiplier must be distributed along the expression
			retval = x.distributeMultiplier();

			// First expand the power if it's a GRP or SUM
			if (retval.isSum()) {
				// First expand each term
				retval = powerExpand(retval);
				retval = expandTerms(retval);
			}
			// Expand products
			if (retval.isProduct()) {
				retval = productExpand(retval);
			}
			// Expand arguments
			if (retval.isFunction()) {
				// Just parse it. This can probably be more efficient
				const args = retval.getArguments().map(x => {
					return expand(x);
				});

				if (retval.name === FACTORIAL) {
					retval = factorialExpand(retval);
				} else {
					let t = Expression.toFunction(retval.name!, args);
					// Copy over the power and multiplier
					t.multiplier = retval.multiplier;
					t = Expression.setPower(t, retval.getPower());

					retval = t;
				}
			}

			if (retval.isEXP()) {
				const pow = expand(retval.getPower());
				const expression = expand(retval.getBase());
				const t = expression.pow(pow);
				t.multiplier = t.getMultiplier().times(retval.getMultiplier());
				retval = t;
			}
		}
	} else {
		retval = new Expression(x);
	}

	return retval;
}
