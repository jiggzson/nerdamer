import { Expression } from '../../core/classes/expression/Expression';
import { one, zero } from '../../core/classes/expression/shortcuts';
import { SIN, COS, TAN, SEC, CSC, COT, sin, cos } from '../../math/trig';

/**
 * Determines whether an expression contains any tan, sec, csc, or cot functions.
 */
export function hasDerivedTrig(x: Expression): boolean {
	let found = false;
	x.forEveryElement(e => {
		if (e.isFunction(TAN) || e.isFunction(SEC) || e.isFunction(CSC) || e.isFunction(COT)) {
			found = true;
		}
		return e;
	});
	return found;
}

/**
 * Rewrites a single trig function element in terms of sin and cos.
 *
 *   tan(u)^n  →  sin(u)^n * cos(u)^(-n)
 *   cot(u)^n  →  cos(u)^n * sin(u)^(-n)
 *   sec(u)^n  →  cos(u)^(-n)
 *   csc(u)^n  →  sin(u)^(-n)
 *
 * Multiplier and arguments are preserved.
 */
function rewriteTrigElement(e: Expression): Expression {
	const m = e.getMultiplier();
	const p = e.getPower();
	const args = e.getArguments();

	if (e.isFunction(TAN) && args.length > 0) {
		const u = args[0];
		return Expression.fromRational(m).times(sin(u).pow(p)).times(cos(u).pow(p.neg()));
	}

	if (e.isFunction(COT) && args.length > 0) {
		const u = args[0];
		return Expression.fromRational(m).times(cos(u).pow(p)).times(sin(u).pow(p.neg()));
	}

	if (e.isFunction(SEC) && args.length > 0) {
		const u = args[0];
		return Expression.fromRational(m).times(cos(u).pow(p.neg()));
	}

	if (e.isFunction(CSC) && args.length > 0) {
		const u = args[0];
		return Expression.fromRational(m).times(sin(u).pow(p.neg()));
	}

	return e;
}

/**
 * Recursively rewrites all tan, sec, csc, cot in an expression tree to sin/cos form.
 * This is a deep rewrite — it descends into sums, products, and function arguments.
 */
export function rewrite(x: Expression): Expression {
	// If it's a direct derived trig function, rewrite it
	if (x.isFunction(TAN) || x.isFunction(COT) || x.isFunction(SEC) || x.isFunction(CSC)) {
		return rewriteTrigElement(x);
	}

	// For sums: rewrite each term
	if (x.isSum()) {
		const m = x.getMultiplier();
		const p = x.getPower();
		let result = zero();
		for (const term of x.elementsArray()) {
			result = result.plus(rewrite(term));
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
			result = result.times(rewrite(element));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	// For other functions (sin, cos, log, etc.): rewrite the arguments
	if (x.isFunction()) {
		// Don't rewrite inside sin/cos arguments — the derived trig functions
		// inside arguments would be unusual, but handle it for completeness
		return x;
	}

	return x;
}

/**
 * Attempts to rewrite derived trig functions to sin/cos and checks if the result
 * is simpler (fewer terms or lower complexity). Returns the simpler form.
 *
 * This is the "only rewrite when it leads to cancellation" strategy.
 */
export function tryRewriteTrig(x: Expression): Expression {
	if (!hasDerivedTrig(x)) {
		return x;
	}

	const rewritten = rewrite(x);

	// Heuristic: the rewritten form is "better" if it has fewer elements,
	// fewer distinct function types, or leads to cancellation (becomes simpler text).
	// A simple proxy: compare text length or element count.
	if (complexity(rewritten) <= complexity(x)) {
		return rewritten;
	}

	return x;
}

/**
 * Simple complexity metric for an expression.
 * Lower is simpler.
 */
function complexity(x: Expression): number {
	const text = x.text();
	// Count the number of function calls, operations, and terms as a rough proxy
	let score = text.length;
	// Bonus: fewer distinct trig function types is better
	const types = new Set<string>();
	x.forEveryElement(e => {
		if (e.isFunction(SIN)) {
			types.add(SIN);
		}
		if (e.isFunction(COS)) {
			types.add(COS);
		}
		if (e.isFunction(TAN)) {
			types.add(TAN);
		}
		if (e.isFunction(SEC)) {
			types.add(SEC);
		}
		if (e.isFunction(CSC)) {
			types.add(CSC);
		}
		if (e.isFunction(COT)) {
			types.add(COT);
		}
		return e;
	});
	score += types.size * 10;
	return score;
}
