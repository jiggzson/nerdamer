import { Expression } from '../../classes/expression/Expression';
import { zero } from '../../classes/expression/shortcuts';
import { FACTORIAL } from '../../constants/functionNames';
import { WRAP } from '../../constants/parserSyntax';

type PowerExpansionTerm = { powers: number[]; coefficient: bigint };

/**
 * Expands the powers of a sum by multiplying its terms one step at a time.
 *
 * Each input string represents one term of the sum, even when that term contains
 * products or powers. For (a+b), multiply the first row by the same terms:
 *
 *     +---+----+----+
 *     |   | a  | b  |
 *     +---+----+----+
 *     | a | aa | ab |
 *     | b | ba | bb |
 *     +---+----+----+
 *
 * The two middle products have the same powers, so the result is
 * a^2 + 2*a*b + b^2. Each term stores its powers separately from its
 * coefficient, for example { powers: [1, 1], coefficient: 2n } for 2*a*b.
 * Repeat this multiplication for higher powers, combining matching terms
 * after each step. Coefficients use bigint so large values remain exact.
 */
export function powerExpandToArray(variables: string[], power: number): PowerExpansionTerm[] {
	let row: PowerExpansionTerm[] = variables.map((_, i) => ({
		powers: variables.map((_, j) => i === j ? 1 : 0),
		coefficient: 1n,
	}));

	for (let n = 1; n < power; n++) {
		const sumMap = new Map<string, PowerExpansionTerm>();
		for (const term of row) {
			for (let j = 0; j < variables.length; j++) {
				const powers = [...term.powers];
				powers[j]++;
				const key = powers.join(',');
				const existing = sumMap.get(key);
				if (existing) {
					existing.coefficient += term.coefficient;
				} else {
					sumMap.set(key, { powers, coefficient: term.coefficient });
				}
			}
		}
		row = Array.from(sumMap.values());
	}

	return row;
}

/**
 * Converts multinomial terms back into a parseable expression.
 *
 * For variables [a, b], terms with powers [1, 1] and coefficient 2n,
 * and powers [2, 0] and coefficient 1n, produce 2*a*b + a^2.
 * Parentheses preserve each input term when its power is greater than one.
 */
export function expandArrayToExpression(row: PowerExpansionTerm[], variables: string[], multiplier?: string) {
	const termsArray: string[] = [];
	// Put the multiplication in front of the multiplier if provided
	const m = multiplier ? `${multiplier}*` : '';

	for (let i = 0; i < row.length; i++) {
		const term = row[i];
		const varStringArray: string[] = [];
		// Coefficients are stored separately from the powers.
		for (let j = 0; j < term.powers.length; j++) {
			const variable = variables[j];
			const p = term.powers[j];
			if (p === 1) {
				varStringArray.push(`(${variable})`);
			} else if (p !== 0) {
				varStringArray.push(`(${variable})^${p}`);
			}
		}

		let termsString = varStringArray.join('*');
		const coeff = term.coefficient;
		if (coeff !== 1n) {
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
	const power = x.getPower();
	// Reparsing this shape as a power of one makes no progress and can feed the
	// same complex radical back through component expansion indefinitely.
	const skipExpansion = x.isSum() && power.isOne() && x.isComplex() &&
		x.elementsArray().some(element => element.hasRadical() ||
			element.elementsArray().some(factor => factor.hasRadical()));

	if (x.isSum() && power.isInteger() && !skipExpansion) {
		const sgn = power.sign();
		const absolutePower = power.abs();
		const variables = x.elementsArray().map(e => {
			return e.text();
		});

		const multiplier = x.getMultiplier().isOne()
			? undefined
			: (sgn < 0 ? x.getMultiplier().invert() : x.getMultiplier()).text();

		const termsArray = powerExpandToArray(variables, Number(absolutePower));

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
export function sumExpandMultiply(x: Expression, y: Expression): Expression {
	// Expand both

	let retval: Expression;

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
export function expand(x: Expression): Expression {
	let retval: Expression;

	x = unwrap(x);

	if (isExpandable(x)) {
		if (x.isNUM() || x.isVAR()) {
			retval = x.copy();
		} else {
			// At the very least the multiplier must be distributed along the expression
			retval = x.distributeMultiplier();

			// First expand the power if it's a GRP or SUM
			if (retval.isSum()) {
				// First expand each term
				retval = powerExpand(retval);
				if (retval.isSum()) {
					retval = expandTerms(retval);
				}
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
					let t = Expression.toFunction(retval.name, args);
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
		retval = x.copy();
	}

	return retval;
}
