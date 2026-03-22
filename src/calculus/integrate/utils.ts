import { Expression } from '../../core/classes/expression/Expression';
import { zero, one } from '../../core/classes/expression/shortcuts';
import { bigintLCM } from '../../core/functions/bigint/bigint';

import type { ExpressionInputType } from '../../core/classes/parser/types';

/**
 * Collects all fractional power denominators of a given variable in an expression.
 * Walks into sums, products, and function arguments.
 */
function collectPowerDenominators(expr: Expression, variable: string): bigint[] {
	const denoms: bigint[] = [];

	function walk(e: Expression) {
		if (e.isVAR() && e.value === variable) {
			const p = e.getPower();
			if (p.isNUM()) {
				const r = p.getMultiplier();
				const d = r.denominator < 0n ? -r.denominator : r.denominator;
				if (d !== 1n) {
					denoms.push(d);
				}
			}
			return;
		}

		if (e.isSum() || e.isProduct()) {
			for (const el of e.elementsArray()) {
				walk(el);
			}
			return;
		}

		if (e.isFunction()) {
			for (const arg of e.getArguments()) {
				walk(arg);
			}
		}
	}

	walk(expr);
	return denoms;
}

/**
 * Walks the expression tree and replaces every occurrence of `variable^(p/q)`
 * with `newVar^(n*p/q)` — which is always an integer power since n is the LCM
 * of all denominators. Also rewrites plain `variable` (power = 1) as `newVar^n`.
 *
 * This avoids going through the engine's radical simplification which would
 * produce abs() terms (since √(t²) = |t| in general).
 */
function rewriteRadicals(
	e: Expression,
	variable: string,
	newVar: Expression,
	n: bigint
): Expression {
	if (e.isVAR() && e.value === variable) {
		const m = e.getMultiplier();
		const p = e.getPower();

		if (p.isNUM()) {
			const r = p.getMultiplier();
			const newNum = n * r.numerator;
			const newDen = r.denominator < 0n ? -r.denominator : r.denominator;

			if (newNum % newDen !== 0n) {
				return Expression.fromRational(m).times(newVar.pow(`${newNum}/${newDen}`));
			}

			const intPower = newNum / newDen;
			return Expression.fromRational(m).times(newVar.pow(intPower.toString()));
		}

		return Expression.fromRational(m).times(newVar.pow(p.times(n.toString())));
	}

	if (e.isSum()) {
		const m = e.getMultiplier();
		const p = e.getPower();
		let result = zero();
		for (const term of e.elementsArray()) {
			result = result.plus(rewriteRadicals(term, variable, newVar, n));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	if (e.isProduct()) {
		const m = e.getMultiplier();
		const p = e.getPower();
		let result = one();
		for (const element of e.elementsArray()) {
			result = result.times(rewriteRadicals(element, variable, newVar, n));
		}
		if (!p.isOne()) {
			result = result.pow(p);
		}
		if (!m.isOne()) {
			result = result.times(Expression.fromRational(m));
		}
		return result;
	}

	if (e.isFunction()) {
		const args = e.getArguments();
		if (args.length > 0) {
			const newArgs = args.map(a => rewriteRadicals(a, variable, newVar, n));
			const argStr = newArgs.map(a => a.text()).join(',');
			let result = Expression.create(`${e.name}(${argStr})`);
			const m = e.getMultiplier();
			const p = e.getPower();
			if (!p.isOne()) {
				result = result.pow(p);
			}
			if (!m.isOne()) {
				result = result.times(Expression.fromRational(m));
			}
			return result;
		}
	}

	return e;
}

export interface RadicalSubstitutionResult {
	integrand: Expression;
	newVariable: string;
	originalVariable: string;
	n: number;
	backSub: Expression;
}

/**
 * Performs a radical substitution on an integrand to eliminate fractional powers.
 */
export function radicalSubstitution(
	expr: ExpressionInputType,
	variable?: string,
	newVar: string = 't'
): RadicalSubstitutionResult | null {
	const e = Expression.create(expr);

	if (!variable) {
		const vars = e.variables();
		if (vars.length === 0) {
			return null;
		}
		variable = vars[0];
	}

	const denoms = collectPowerDenominators(e, variable);
	if (denoms.length === 0) {
		return null;
	}

	const nBig = bigintLCM(denoms);
	const n = Number(nBig);
	const t = Expression.create(newVar);
	const substituted = rewriteRadicals(e, variable, t, nBig);
	const dxdt = Expression.create(String(n)).times(t.pow(n - 1));
	const integrand = substituted.times(dxdt);
	const backSub = Expression.create(variable).pow(Expression.create(`1/${n}`));

	return {
		integrand,
		newVariable: newVar,
		originalVariable: variable,
		n,
		backSub,
	};
}

export function hasTranscendental(expr: Expression, v: string): boolean {
	if (expr.isFunction() && expr.hasVariable(v)) {
		return true;
	}

	if (expr.isEXP() && expr.hasVariable(v)) {
		return true;
	}

	let found = false;
	if (expr.isProduct() || expr.isSum()) {
		expr.each((child: Expression) => {
			if (hasTranscendental(child, v)) {
				found = true;
			}
		});
	}

	return found;
}
