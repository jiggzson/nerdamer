import { partfrac } from '../../algebra/partfrac';
import { simplify } from '../../algebra/simplify/simplify';
import { Expression } from '../../core/classes/expression/Expression';
import { constantsFreeProduct } from '../../core/classes/expression/products';
import { four, half, minusOne, one, two, zero } from '../../core/classes/expression/shortcuts';
import { assertPlainVariableAndGetString } from '../../core/classes/expression/utils';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { divide } from '../../core/classes/polynomial/utils';
import { getU, subst } from '../../core/functions/subst';
import { log } from '../../math/math';

import { tryIntegrationByParts } from './byParts';
import {
	tryIntegrateByLogSubstitution,
	tryIntegrateByPowerSubstitution,
	tryIntegrateBySubstitution,
	tryIntegrateByWrappedFactorSubstitution,
} from './bySubstitution';
import { tableOfIntegrals } from './integrationTable';
import { hasTranscendental, radicalSubstitution } from './utils';

import type { ExpressionInputType } from '../../core/classes/parser/types';

const MAX_DEPTH = 10;

export function integrate(
	expr: ExpressionInputType,
	dx: ExpressionInputType,
	depth = 0
): Expression {
	expr = Expression.create(expr);
	dx = assertPlainVariableAndGetString(Expression.create(dx));

	const fn = Expression.create(expr);
	let retval: Expression | undefined;

	if (depth++ > MAX_DEPTH) {
		retval = Expression.toFunction('integrate', [fn, dx]);
	} else {
		let constants: Expression;
		({ constants, expression: expr } = constantsFreeProduct(expr, dx));

		if (!expr.hasVariable(dx)) {
			retval = expr.times(dx);
		} else if (expr.isSum() && expr.isLinear()) {
			retval = zero();
			expr.each(e => {
				retval = retval!.plus(integrate(e, dx, depth));
			});
		} else {
			retval = tableOfIntegrals.lookup(expr, dx, depth);
		}

		if (!retval) {
			retval = tryIntegrateByRadicalSubstitutionFastPath(expr, dx, depth);
		}

		if (!retval) {
			retval = tryIntegrateSqrtQuadratic(expr, dx);
		}

		if (!retval && expr.isProduct()) {
			const wrapped = tryIntegrateByWrappedFactorSubstitution(expr, expr.elementsArray(), dx);
			if (wrapped) {
				retval = wrapped;
			}
		}

		if (!retval && expr.isProduct()) {
			// If any factor of the product is a sum, expand and retry.
			// This distributes e.g. x*sec(u)^2*(1+tan(u)^2) into
			// x*sec(u)^2 + x*sec(u)^2*tan(u)^2, enabling linearity.
			let hasSumFactor = false;
			for (const factor of expr.elementsArray()) {
				if (factor.isSum() && hasTranscendental(factor, dx)) {
					hasSumFactor = true;
					break;
				}
			}
			if (hasSumFactor) {
				const expanded = expr.expand();
				if (expanded.isSum() && expanded.isLinear()) {
					let expandedResult = zero();
					let allResolved = true;
					expanded.each((term: Expression) => {
						const termResult = integrate(term, dx, depth);
						if (termResult.isFunction('integrate')) {
							allResolved = false;
						}
						expandedResult = expandedResult!.plus(termResult);
					});
					if (allResolved) {
						retval = expandedResult;
					}
				}
			}
		}

		if (!retval) {
			const result = tryIntegrationByParts(expr, dx, integrate, depth);
			if (result) {
				retval = result;
			}
		}

		if (!retval) {
			const logResult = tryIntegrateByLogSubstitution(expr, dx);
			if (logResult) {
				retval = log(logResult.fx).times(logResult.constant);
			}
		}

		if (!retval) {
			const subsResult = tryIntegrateBySubstitution(expr, dx);
			if (subsResult) {
				const n = subsResult.power;
				const nPlusOne = n.plus(one());
				retval = subsResult.fx.pow(nPlusOne).div(nPlusOne).times(subsResult.constant);
			}
		}

		if (!retval) {
			retval = tryIntegratePowerQuotient(expr, dx, depth);
		}

		if (!retval) {
			retval = tryIntegrateRational(expr, dx, depth);
		}

		if (retval) {
			retval = retval.times(constants);
		}
	}

	return retval ?? Expression.toFunction('integrate', [fn, dx]);
}

function isRationalFunctionInVariable(expr: Expression, variable: string): boolean {
	try {
		new Polynomial(expr.getNumerator(), [variable]);
		new Polynomial(expr.getDenominator(), [variable]);
		return true;
	} catch {
		return false;
	}
}

function tryIntegrateByRadicalSubstitutionFastPath(
	expr: Expression,
	dx: string,
	depth: number
): Expression | undefined {
	const newVariable = getU(expr);
	const sub = radicalSubstitution(expr, dx, newVariable);
	if (!sub) {
		return undefined;
	}

	const transformed = simplify(sub.integrand);
	if (!isRationalFunctionInVariable(transformed, sub.newVariable)) {
		return undefined;
	}

	const inner = tryIntegrateRational(transformed, sub.newVariable, depth);
	if (!inner || inner.isFunction('integrate')) {
		return undefined;
	}

	return simplify(subst(inner, Expression.create(sub.newVariable), sub.backSub));
}

function tryIntegrateSqrtQuadratic(expr: Expression, dx: string): Expression | undefined {
	const power = expr.getPower();
	if (!power.eq(half())) {
		return undefined;
	}

	const base = expr.getBase();
	if (hasTranscendental(base, dx)) {
		return undefined;
	}

	let p: Polynomial;
	try {
		p = new Polynomial(base, [dx]);
	} catch {
		return undefined;
	}

	if (p.deg() !== 2) {
		return undefined;
	}

	const coeffs = p.toArray(false, dx);
	const c = coeffs[0] ?? zero();
	const b = coeffs[1] ?? zero();
	const a = coeffs[2] ?? zero();
	if (a.isZero()) {
		return undefined;
	}

	const x = Expression.create(dx);
	const u = x.plus(b.div(two().times(a)));
	const k = c.minus(b.pow(two()).div(four().times(a)));
	const sqrtQ = expr;
	const leadingTerm = half().times(u).times(sqrtQ);

	if (k.isZero()) {
		return undefined;
	}

	if (a.gt(zero())) {
		const sqrtA = a.pow(half());
		if (k.gt(zero())) {
			const sqrtK = k.pow(half());
			const arg = sqrtA.times(u).div(sqrtK);
			return leadingTerm.plus(
				k.div(two().times(sqrtA)).times(Expression.toFunction('asinh', [arg]))
			);
		}
		if (k.lt(zero())) {
			const arg = sqrtA.times(u).plus(sqrtQ);
			return leadingTerm.plus(k.div(two().times(sqrtA)).times(log(arg)));
		}
		return undefined;
	}

	if (a.lt(zero()) && k.gt(zero())) {
		const sqrtNegA = a.times('-1').pow(half());
		const sqrtK = k.pow(half());
		const arg = sqrtNegA.times(u).div(sqrtK);
		return leadingTerm.plus(
			k.div(two().times(sqrtNegA)).times(Expression.toFunction('asin', [arg]))
		);
	}

	return undefined;
}

function tryIntegrateRational(expr: Expression, dx: string, depth: number): Expression | undefined {
	const num = expr.getNumerator();
	const den = expr.getDenominator();

	if (den.isOne() || !den.hasVariable(dx)) {
		return undefined;
	}

	if (hasTranscendental(num, dx) || hasTranscendental(den, dx)) {
		return undefined;
	}

	let pNum: Polynomial;
	let pDen: Polynomial;
	try {
		pNum = new Polynomial(num, [dx]);
		pDen = new Polynomial(den, [dx]);
	} catch {
		return undefined;
	}

	const degNum = pNum.deg();
	const degDen = pDen.deg();
	if (degDen < 2) {
		return undefined;
	}

	let result = zero();
	let remainder = num;
	if (degNum >= degDen) {
		try {
			const [quotient, rem] = divide(num, den);
			const polyIntegral = integrate(quotient, dx, depth);
			if (polyIntegral.isFunction('integrate')) {
				return undefined;
			}
			result = result.plus(polyIntegral);
			remainder = rem;
		} catch {
			return undefined;
		}

		if (Expression.create(remainder).isZero()) {
			return result;
		}
	}

	const properFraction = Expression.create(remainder).div(den);
	if (degNum >= degDen) {
		const directIntegral = integrate(properFraction, dx, depth);
		if (!directIntegral.isFunction('integrate')) {
			result = result.plus(directIntegral);
			return result;
		}
	}

	const quadraticIntegral = tryIntegrateLinearOverQuadratic(properFraction, dx);
	if (quadraticIntegral) {
		return result.plus(quadraticIntegral);
	}

	let decomposed: Expression;
	try {
		decomposed = partfrac(properFraction, dx);
	} catch {
		return undefined;
	}

	if (decomposed.text() === properFraction.text()) {
		return undefined;
	}

	const decomposedIntegral = integrate(decomposed, dx, depth);
	if (decomposedIntegral.isFunction('integrate')) {
		return undefined;
	}

	return result.plus(decomposedIntegral);
}

function tryIntegrateLinearOverQuadratic(expr: Expression, dx: string): Expression | undefined {
	const num = expr.getNumerator();
	const den = expr.getDenominator();

	if (den.isOne() || !den.hasVariable(dx)) {
		return undefined;
	}

	if (hasTranscendental(num, dx) || hasTranscendental(den, dx)) {
		return undefined;
	}

	let nCoeffs: Expression[];
	let dCoeffs: Expression[];
	try {
		const nc = num.coeffs(dx);
		const dc = den.coeffs(dx);
		if (dc.max() !== 2 || nc.max() > 1) {
			return undefined;
		}
		nCoeffs = nc.toArray();
		dCoeffs = dc.toArray();
	} catch {
		return undefined;
	}

	const a = dCoeffs[2] ?? zero();
	const b = dCoeffs[1] ?? zero();
	const c = dCoeffs[0] ?? zero();
	const m = nCoeffs[1] ?? zero();
	const n = nCoeffs[0] ?? zero();

	if (a.isZero()) {
		return undefined;
	}

	const x = Expression.create(dx);

	const A = m.div(two().times(a));
	const B = n.minus(A.times(b));

	let result = zero();
	if (!A.isZero()) {
		result = result.plus(A.times(log(den)));
	}
	if (B.isZero()) {
		return result;
	}

	const twoAxPlusB = two().times(a).times(x).plus(b);
	const delta = four().times(a).times(c).minus(b.pow('2'));

	let reciprocalIntegral: Expression;
	if (delta.isZero()) {
		reciprocalIntegral = two().times('-1').div(twoAxPlusB);
	} else if (delta.gt(zero())) {
		const sqrtDelta = delta.pow(half());
		const arg = twoAxPlusB.div(sqrtDelta);
		reciprocalIntegral = two()
			.div(sqrtDelta)
			.times(Expression.toFunction('atan', [arg]));
	} else if (delta.lt(zero())) {
		const sqrtNegDelta = delta.times('-1').pow(half());
		const ratio = twoAxPlusB.minus(sqrtNegDelta).div(twoAxPlusB.plus(sqrtNegDelta));
		reciprocalIntegral = log(ratio).div(sqrtNegDelta);
	} else {
		return undefined;
	}

	return result.plus(B.times(reciprocalIntegral));
}

function tryIntegratePowerQuotient(
	expr: Expression,
	dx: string,
	depth: number
): Expression | undefined {
	const powResult = tryIntegrateByPowerSubstitution(expr, dx);
	if (powResult) {
		const n = powResult.power;
		const oneMinusN = one().plus(n.times(minusOne()));
		return powResult.fx.pow(oneMinusN).div(oneMinusN).times(powResult.constant);
	}

	const num = expr.getNumerator();
	const den = expr.getDenominator();
	if (den.isOne() || !den.hasVariable(dx)) {
		return undefined;
	}

	const denBase = den.getBase();
	const denPower = den.getPower();
	if (denPower.isOne()) {
		return undefined;
	}
	if (hasTranscendental(num, dx) || hasTranscendental(denBase, dx)) {
		return undefined;
	}

	let pNum: Polynomial;
	try {
		pNum = new Polynomial(num, [dx]);
		new Polynomial(denBase, [dx]);
	} catch {
		return undefined;
	}
	if (pNum.deg() < 1) {
		return undefined;
	}

	let quotient: Expression;
	let remainder: Expression;
	try {
		[quotient, remainder] = divide(num, denBase);
	} catch {
		return undefined;
	}
	if (Expression.create(quotient).isZero()) {
		return undefined;
	}

	const term1 = Expression.create(quotient).times(
		denBase.pow(one().plus(denPower.times(minusOne())))
	);
	const term2Num = Expression.create(remainder);
	const term2 = term2Num.isZero() ? zero() : term2Num.div(den);

	const integral1 = integrate(term1, dx, depth);
	if (integral1.isFunction('integrate')) {
		return undefined;
	}

	let result = integral1;
	if (!term2Num.isZero()) {
		const integral2 = integrate(term2, dx, depth);
		if (integral2.isFunction('integrate')) {
			return undefined;
		}
		result = result.plus(integral2);
	}

	return result;
}
