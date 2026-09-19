import { Expression } from '../../core/classes/expression/Expression';
import { bigintLCM } from '../../core/functions/bigint/bigint';
import { rewriteRadicals } from '../../core/functions/subst';

import type { ExpressionInput } from '../../core/types';

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

/** Description of the substitution `x = t^n` used to clear fractional powers. */
export interface RadicalSubstitutionResult {
	/** Integrand after substitution and multiplication by `dx/dt`. */
	integrand: Expression;
	/** Fresh variable used in the transformed integrand. */
	newVariable: string;
	/** Variable replaced in the original integrand. */
	originalVariable: string;
	/** Least common multiple of the fractional-power denominators. */
	n: number;
	/** Expression in the original variable used to replace the fresh variable. */
	backSub: Expression;
}

/**
 * Builds the substitution `x = t^n` needed to eliminate fractional powers.
 *
 * @param expr - Integrand to inspect and transform.
 * @param variable - Variable whose fractional powers should be cleared. The
 * first expression variable is used when omitted.
 * @param newVar - Fresh substitution variable. Defaults to `t`.
 * @returns Substitution metadata, or `null` if the expression is constant or
 * contains no fractional powers of the selected variable.
 */
export function radicalSubstitution(
	expr: ExpressionInput,
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

/** Returns whether `expr` contains a variable-dependent function or exponential. */
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
