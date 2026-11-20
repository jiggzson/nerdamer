import { RANK } from '../../../constants/entityTypes';
import { ABS } from '../../../constants/functionNames';
import { WRAP } from '../../../constants/parserSyntax';
import { message, UndefinedError } from '../../../errors';
import { simplifyImaginary } from '../../../functions/complex';
import { Settings } from '../../../Settings';
import { Expression } from '../../expression/Expression';
import { minusOne, one, zero } from '../../expression/shortcuts';

import { power, rationalizeRadical } from './power';

/**
 * Multiplies two Expressions
 *
 * @param a
 * @param b
 * @returns
 */
export function multiply(a: Expression, b: Expression): Expression {
	let retval;
	// TODO: The DEFER_SIMPLIFICATION flag currently does not work as intended. The intent is for it
	// to defer simplification and return an expression providing the user with a fully reconstructed AST.
	// The mechanisms required to achieve this are currently not in place. Use Parser.parseRPN for now
	// and manually construct it.
	if (Settings.DEFER_SIMPLIFICATION) {
		// The wrap function is just a function to allow us to encapsulate the value
		retval = merge(Expression.toFunction(WRAP, [a]), Expression.toFunction(WRAP, [b]));
		retval.deferred = true;
	} else {
		// The sign of a non-numeric real factor of something infinite, such as Inf or i*Inf,
		// when it can be established.
		let factorSign = 0;
		if (a.isInfinite() !== b.isInfinite()) {
			const factor = a.isInfinite() ? b : a;
			if (!factor.isNUM() && !factor.isComplex()) {
				factorSign = factor.gt(zero()) ? 1 : factor.lt(zero()) ? -1 : 0;
			}
		}

		if (a.isZero()) {
			if (b.isInf()) {
				throw new UndefinedError(message('undefinedExpression', { expression: '0*Infinity' }));
			}
			retval = Expression.Number('0');
		} else if (a.isNUM() && b.isNUM()) {
			retval = Expression.fromRational(a.getMultiplier().times(b.getMultiplier()));
		} else if (a.isComplex() && b.isComplex() && a.isSum() && b.isSum()) {
			const realA = a.realPart();
			const realB = b.realPart();
			const imA = a.imagPart();
			const imB = b.imagPart();
			retval = realA
				.times(realB)
				.minus(imA.times(imB))
				.plus(realA.times(imB).plus(imA.times(realB)).times(Expression.Img()));
		} else if (a.isNUM() && !b.isInf()) {
			retval = b.copy();
			retval.multiplier = a.getMultiplier().times(b.getMultiplier());
		}
		// Multiplication of infinity
		else if ((a.isInf() || a.isNUM()) && b.isInf()) {
			// The default value for infinity is Inf
			retval = Expression.Inf();
			// Infinity times anything including itself is infinity.
			// It's just a matter of determining the sign at this point.
			if (a.getMultiplier().times(b.getMultiplier()).isNegative()) {
				retval = retval.neg();
			} else if (a.isZero() || b.isZero()) {
				throw new UndefinedError(message('undefinedExpression', { expression: '0*Infinity' }));
			}
		}
		// Something infinite times a real factor of known sign keeps its direction and takes
		// the combined sign, such as log(2)*Inf = Inf, (1-sqrt(2))*Inf = -Inf or
		// sqrt(2)*i*Inf = i*Inf. A factor whose sign isn't established, like an unrestricted
		// x, stays as a product.
		else if (factorSign !== 0) {
			const infinite = a.isInfinite() ? a : b;
			retval = factorSign > 0 ? infinite.copy() : infinite.neg();
		} else if (a.isInfinite() && b.isInfinite() && !(a.isInf() && b.isInf())) {
			if (a.isInf() || b.isInf()) {
				// Infinity absorbs another infinite factor, so (i*Inf)*Inf is i*Inf. Only the sign
				// of the bare infinity can change it.
				const [bare, product] = a.isInf() ? [a, b] : [b, a];
				retval = bare.isNegInf() ? product.neg() : product.copy();
			} else {
				// Two infinite products multiply their directions: (i*Inf)*(i*Inf) is
				// i^2*Inf = -Inf. Multiplying in one factor at a time reaches the case above
				// when the two infinities meet.
				retval = Object.values(b.getElements())
					.reduce((product, element) => product.times(element), a)
					.times(Expression.fromRational(b.getMultiplier()));
			}
		} else if (a.value === b.value) {
			// Define Rule: i * i = -1
			retval = a.copy();

			retval.multiplier = retval.getMultiplier().times(b.getMultiplier());
			const power = a.getPower().plus(b.getPower());
			if (power.isZero()) {
				retval = Expression.fromRational(retval.getMultiplier());
			} else if (retval.isProduct() && power.isInteger()) {
				// An integer power of a product distributes over its factors, as it does when the
				// power is taken directly, so (x*y)*(x*y) is x^2*y^2 like (x*y)^2.
				const base = Expression.setPower(retval.toUnitMultiplier(), one());
				retval = base.pow(power).times(Expression.fromRational(retval.getMultiplier()));
			} else {
				retval = Expression.setPower(retval, power);
			}

			const pow = retval.getPower();

			// Simplify powers of i
			if (retval.isI()) {
				retval = simplifyImaginary(retval);
			}
			// The abs is redundant for even powers for abs
			else if (retval.isFunction(ABS) && pow.isEven()) {
				retval = retval.getArguments()[0].pow(pow).times(retval.getMultiplier());
			}
			// Else just leave it undefined
		}
		// We can just flip because of commutativity. Add can figure out the rest.
		// ******************** RECIPROCALS ******************** //
		else if (RANK[a.type] > RANK[b.type]) {
			retval = multiply(b, a);
		}

		// Do not use else since this is a catchall for all unhandled cases.
		retval = retval || merge(a, b);

		// Check to make sure that the EXP can be unwrapped. Consider 3^(2/3)*3^(1/3)
		// This started out as an EXP but since its power is now 1, (3)^1, it can be downgraded
		// to a simple NUM
		if (retval.isEXP() && retval.isLinear()) {
			retval = retval.getBase().times(retval.getMultiplier());
		}

		// This ensures that imaginary numbers are properly expanded.
		if (Settings.EVALUATE) {
			retval = retval.distributeMultiplier();
		}

		// A product with an infinite factor, such as 2*sqrt(2)*i*Inf, has no finite size, so
		// its coefficient and any real factor of known sign only contribute their signs:
		// 2*sqrt(2)*i*Inf is i*Inf and -3*pi*i*Inf is -i*Inf. Complex factors give the
		// direction and factors of unknown sign stay.
		if (retval.isInfinite() && !retval.isInf()) {
			let negative = retval.getMultiplier().isNegative();
			const kept: Expression[] = [];
			for (const element of Object.values(retval.getElements())) {
				const real = !element.isInf() && !element.isComplex();
				if (real && element.gt(zero())) {
					continue;
				} else if (real && element.lt(zero())) {
					negative = !negative;
				} else {
					kept.push(element);
				}
			}
			const unchanged =
				kept.length === Object.keys(retval.getElements()).length &&
				retval.getMultiplier().abs().isOne();
			if (!unchanged) {
				retval = kept.reduce((product, element) => product.times(element));
				if (negative) {
					retval = retval.neg();
				}
			}
		}
	}

	return retval;
}

function transfer(a: Expression, b: Expression, but: string) {
	let retval = a.getMultiplier(true);
	const elements = a.getElements();
	// Transfer over the remaining elements
	for (const x in elements) {
		if (x !== but) {
			retval = multiply(retval, elements[x]);
		}
	}

	// Transfer over the existing element
	const result = multiply(elements[but], b);
	//Exit early
	return multiply(retval, result);
}

function combine(a: Expression, b: Expression, keyA: string, keyB: string): Expression {
	const retval = Expression.Number('1');
	// We want the multiplier at the top so remove from a and b
	retval.elements = {};
	// Copy the elements
	// TODO: This check should probably be handled by the keyValue method
	retval.elements[keyA] = a.copy();
	retval.elements[keyB] = b.copy();
	return retval;
}

function canMerge(a: Expression) {
	return a.isProduct() && a.isLinear();
}

export function merge(a: Expression, b: Expression): Expression {
	let retval;
	const expressionType = Expression.TYPES.PRD;
	let aCanMerge = canMerge(a);
	let bCanMerge = canMerge(b);
	let setProperties = true;

	// The multiplier is carried at the top of the expression they get moved and stripped from a and b;
	const aHasMultiplier = a.multiplier !== undefined;
	const bHasMultiplier = b.multiplier !== undefined;
	let multiplier =
		aHasMultiplier || bHasMultiplier
			? a.getMultiplier().times(b.getMultiplier())
			: undefined;
	if (multiplier) {
		if (aHasMultiplier) {
			a = a.copy();
			a.multiplier = undefined;
		}
		if (bHasMultiplier) {
			b = b.copy();
			b.multiplier = undefined;
		}
	}

	if (a.elements && !b.elements) {
		[b, a] = [a, b]; // Swap them
		[bCanMerge, aCanMerge] = [aCanMerge, bCanMerge];
	}

	// Case 1: Neither has an expression object so make an empty container and append a copy of the second.
	// If skipAction is true then it will just append and skip everything else. Remember, a != b
	if (!bCanMerge) {
		const keyA = a.type === Expression.TYPES.GRP ? a.value : a.keyValue();
		const keyB = b.type === Expression.TYPES.GRP ? b.value : b.keyValue();
		const aIsProductAndLinear = a.isProduct() && a.isLinear();
		// Check if it has the element
		if (aIsProductAndLinear && b.isProduct() && b.getPower().isMinusOne()) {
			let at = a;
			let bt = one();
			const aElements = a.getElements();
			const bElements = b.getElements();
			for (const x in bElements) {
				const e = bElements[x];
				if (x in aElements) {
					at = multiply(at, power(e, minusOne()));
				} else {
					bt = multiply(bt, e);
				}
			}

			retval = combine(
				at,
				multiply(power(bt, minusOne()), a.getMultiplier(true)),
				a.keyValue(),
				b.keyValue()
			);
		} else if (aIsProductAndLinear && a.getElements()[keyB]) {
			retval = transfer(a, b, keyB);

			setProperties = false;
		} else {
			const p = a.getPower();
			const q = b.getPower();
			if (p.sign() === -1 && q.sign() === -1) {
				const _a = a.invert();
				const _b = b.invert();
				retval = multiply(_a, _b);
				retval = retval.invert();
				// multiply returns a complete expression, which need not be a product:
				// x^-1/(x^-1*y) is y^-1, and rebuilding it as a product would leave it empty.
				setProperties = false;
			} else {
				retval = combine(a, b, keyA, keyB);
			}
		}
	}
	// Case 2: The second has an expression object and the other doesn't. This has to of course be of the
	// the right type. The first object gets added to the second object's expression container.
	else if (!aCanMerge && bCanMerge) {
		// Products store a GRP under its value, as in Case 1. Its keyValue is the shared base,
		// e.g. x for 2*x-x^2, which would find the factor x instead.
		const key = a.type === Expression.TYPES.GRP ? a.value : a.keyValue();
		retval = b.copy();
		const subExpressions = retval.getElements();

		let result: Expression;
		// No need to move the multiplier since sub elements don't carry one
		// and it has already been moved from a
		if (key in subExpressions) {
			result = multiply(a, subExpressions[key]);
		} else {
			let existing: Expression | undefined = undefined;
			// See if you can find a product since we prefer it going there before creating a new one
			// This is an early simplification step that pays off.
			for (const x in subExpressions) {
				if (subExpressions[x].isProduct()) {
					existing = subExpressions[x];
					delete subExpressions[x];
					break;
				}
			}
			if (existing) {
				result = multiply(a, existing);
			} else {
				result = a.copy();
			}
		}

		// remove it if it resulted in one
		if (result.isNUM()) {
			// If it's a number and not one then move it to the multiplier
			if (!result.isOne()) {
				multiplier = multiplier?.times(result.getMultiplier());
			}
			delete subExpressions[key];
		} else {
			subExpressions[key] = result;
		}
	}
	// Case 3: They both have expression objects
	else {
		retval = a.copy();
		retval.multiplier = a.getMultiplier().times(b.getMultiplier());
		const retvalElements = retval.getElements();
		const bExpressions = b.getElements();

		for (const x in bExpressions) {
			const e = bExpressions[x];
			if (x in retvalElements) {
				const result = multiply(e, retvalElements[x]);
				// Don't multiply 1
				if (expressionType === Expression.TYPES.PRD && result.isOne()) {
					delete retvalElements[x];
				} else {
					retvalElements[x] = result;
				}
			} else {
				retvalElements[x] = e.copy();
			}
		}
	}

	// Don't set the properties for recursive calls since those have already been set.
	if (setProperties) {
		// Set the type
		retval.type = expressionType;

		// Update derived aggregate state after the element collection changes.
		retval.updateValue();
	}

	// Put the multiplier back
	if (multiplier && !multiplier.isOne()) {
		retval.multiplier = multiplier;
	}

	// Remove unnecessary complexity. If the type is PRD and can be made a lesser type then do so
	if (retval.isProduct() && Object.keys(retval.getElements()).length === 1) {
		const onlyElement = Object.values(retval.getElements())[0];
		onlyElement.multiplier = onlyElement.getMultiplier().times(retval.getMultiplier());
		retval = onlyElement;
	}

	return retval;
}

export function canonicalizeRadicals(x: Expression): Expression {
	let retval: Expression | undefined;
	// Direct numeric radical: e.g. 2^(-1/2)
	if (x.isEXP() && x.isConstant() && x.hasRadical()) {
		retval = rationalizeRadical(x, true);
	}

	// Function: canonicalize arguments
	else if (x.isFunction()) {
		const args = x.getArguments().map(arg => canonicalizeRadicals(arg));
		let t = Expression.toFunction(x.name, args);
		t.multiplier = x.multiplier;
		t = Expression.setPower(t, x.getPower());
		retval = t;
	}

	// Product containing radicals: walk elements
	else if (x.isProduct()) {
		let retval = Expression.fromRational(x.getMultiplier());
		x.each(element => {
			retval = retval.times(canonicalizeRadicals(element));
		});
	}

	// Sum: walk terms
	else if (x.isSum() && x.isLinear()) {
		let retval = zero();
		x.each(term => {
			retval = retval.plus(canonicalizeRadicals(term));
		});
	}

	// EXP with non-numeric base: canonicalize the base and power
	else if (x.isEXP()) {
		const base = canonicalizeRadicals(x.getBase());
		const pow = canonicalizeRadicals(x.getPower());
		const retval = base.pow(pow);
		retval.multiplier = x.multiplier;
	}

	return retval ?? x;
}
