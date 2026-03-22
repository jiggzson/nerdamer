import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { ASEC, ACSC, ACOT } from '../../math/trig';

/**
 * Determines whether an expression contains any asec, acsc, or acot functions.
 */
export function hasDerivedInverseTrig(x: Expression): boolean {
	let found = false;
	x.forEveryElement(e => {
		if (e.isFunction(ASEC) || e.isFunction(ACSC) || e.isFunction(ACOT)) {
			found = true;
		}
		return e;
	});
	return found;
}

/**
 * Rewrites a single inverse trig element to its primary form.
 *
 *   asec(u)^n  →  acos(1/u)^n
 *   acsc(u)^n  →  asin(1/u)^n
 *   acot(u)^n  →  atan(1/u)^n
 *
 * Multiplier and power are preserved.
 */
function rewriteInverseTrigElement(e: Expression): Expression {
	const m = e.getMultiplier();
	const p = e.getPower();
	const args = e.getArguments();

	if (e.isFunction(ASEC) && args.length > 0) {
		const u = args[0];
		// asec(u) = acos(1/u)
		const rewritten = Expression.create(`acos(x)`, { x: one().div(u) });
		return Expression.fromRational(m).times(rewritten.pow(p));
	}

	if (e.isFunction(ACSC) && args.length > 0) {
		const u = args[0];
		// acsc(u) = asin(1/u)
		const rewritten = Expression.create(`asin(x)`, { x: one().div(u) });
		return Expression.fromRational(m).times(rewritten.pow(p));
	}

	if (e.isFunction(ACOT) && args.length > 0) {
		const u = args[0];
		// acot(u) = atan(1/u)
		const rewritten = Expression.create(`atan(x)`, { x: one().div(u) });
		return Expression.fromRational(m).times(rewritten.pow(p));
	}

	return e;
}

/**
 * Recursively rewrites all asec, acsc, acot in an expression tree to acos, asin, atan.
 * Descends into sums, products, and function arguments.
 */
export function rewriteInverseTrig(x: Expression): Expression {
	// Direct derived inverse trig function
	if (x.isFunction(ASEC) || x.isFunction(ACSC) || x.isFunction(ACOT)) {
		return rewriteInverseTrigElement(x);
	}

	// For sums: rewrite each term
	if (x.isSum()) {
		const m = x.getMultiplier();
		const p = x.getPower();
		let result = zero();
		for (const term of x.elementsArray()) {
			result = result.plus(rewriteInverseTrig(term));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	// For products: rewrite each factor
	if (x.isProduct()) {
		const m = x.getMultiplier();
		const p = x.getPower();
		let result = one();
		for (const element of x.elementsArray()) {
			result = result.times(rewriteInverseTrig(element));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	return x;
}
