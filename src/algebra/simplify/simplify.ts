import { Expression } from '../../core/classes/expression/Expression';
import { half, one, zero } from '../../core/classes/expression/shortcuts';
import { expressionToIntegerSparsePolynomial as toIntegerSparse } from '../../core/classes/polynomial/SparsePolynomialAdapter';
import { Rational } from '../../core/classes/rational/Rational';
import { ACOS, ACOT, ACSC, ASEC, ASIN, ATAN, CEIL, COS, COT, CSC, FACTORIAL, FLOOR, ROUND, SEC, SIN, TAN, TRUNC } from '../../core/constants/functionNames';
import { WRAP } from '../../core/constants/parserSyntax';
import { PolynomialError } from '../../core/errors';
import { product, sum } from '../../math/utils';
import { polyFactorExpressions } from '../factor/factor';

import { complexSimplify } from './complexsimp';
import { factorCommonPower } from './factorCommon';
import { simplifyLogRatio, simplifyFactorials, simplifyLogs } from './funcsimp';
import { hasDerivedInverseTrig, rewriteInverseTrig } from './invtrigrewrite';
import { cancelCommonFactors, rationalize, simplifyPerfectSquareRadical, simplifyRadicals, toCommonDenominator } from './ratsimp';
import { tryRewriteTrig } from './trigrewrite';
import { simplifyTrigSum } from './trigsimp';
import { hasFactorialRatio, hasIrrationalDenominator } from './utils';

/**
 * Applies Nerdamer's finite symbolic simplification strategy to an expression.
 *
 * @remarks
 * Simplification first normalizes rational structure, recursively simplifies function
 * arguments, and then selects targeted transformations for factorial ratios, complex
 * forms, irrational denominators, sums, or linear products. The final numerator and
 * denominator are factored. This is a heuristic transformation pipeline rather than a
 * proof of globally minimal form, and branch-sensitive identities are limited to the
 * safeguards implemented by the selected rewrite routines.
 *
 * Intermediate expressions may be reused while the pipeline runs, but callers should
 * treat the return value as the simplified result rather than expecting `x` to be updated
 * in place. Decimal-origin formatting is propagated to the result's outer multiplier.
 * The `modifiers` object is internal recursion state; its `image` value prevents another
 * simplification round when the canonical text has stopped changing.
 *
 * @param x - Expression or parser text to simplify.
 * @param modifiers - Internal recursion markers used to detect an unchanged image.
 * @returns The simplified expression, which may retain forms unsupported by the finite strategy set.
 */
export function simplify(x: Expression | string, modifiers: { [name: string]: string } = {}) {
	if (typeof x === 'string') {
		x = Expression.create(x);
	}
	const asDecimal = x.hasDecimal();

	// Extract a common positive rational square from a principal square root.
	// This does not split radicals with symbolic or unknown-sign factors.
	if (x.isSum() && x.getPower().eq(half()) && x.getMultiplier().isOne()) {
		const terms = x.getBase().elementsArray();
		if (terms.length > 1) {
			const common = Rational.GCD(...terms.map(term => term.getMultiplier().abs()));
			if (common.numerator > common.denominator) {
				const divisor = Expression.fromRational(common);
				const root = divisor.pow(half());
				if (root.isNUM()) {
					const reduced = sum(...terms.map(term => term.div(divisor)));
					x = root.times(Expression.setPower(reduced, half()));
				}
			}
		}
	}



	// Keep matching reciprocal trig pairs intact so their principal angles
	// can be reduced before the usual inverse-function rewrite.
	const inner = x.isFunction() ? x.getArguments()[0] : undefined;
	const matchingReciprocalPair = x.getPower().isOne() && x.getMultiplier().isOne() &&
		((x.isFunction(ACSC) && inner?.isFunction(CSC)) ||
			(x.isFunction(ASEC) && inner?.isFunction(SEC)) ||
			(x.isFunction(ACOT) && inner?.isFunction(COT)));
	if (hasDerivedInverseTrig(x) && !matchingReciprocalPair) {
		x = rewriteInverseTrig(x);
	}

	// Resolve nested roots before rational normalization obscures the outer root.
	if (x.isSum() && x.getPower().eq(half()) &&
		x.elementsArray().some(term => term.getPower().eq(half()))) {
		const variables = x.variables();
		if (variables.length === 1) {
			const square = Expression.create(variables[0]).pow(2);
			const radicand = sum(...x.elementsArray().map(term => simplify(term)));
			if (radicand.eq(square)) {
				x = square.pow(half());
			}
		}
	}

	x = toCommonDenominator(x);

	// Check polynomial numerators exactly before expanding large rational sums.
	const numerator = x.getNumerator();
	if (numerator.isSum() && numerator.isPolynomialLike() && !x.getDenominator().isOne()) {
		try {
			const sparse = toIntegerSparse(numerator, numerator.variables());
			if (sparse.polynomial.isZero()) {
				x = zero();
			}
		} catch (error) {
			// Expressions outside the sparse polynomial ring use ordinary simplification.
			if (!(error instanceof PolynomialError)) {
				throw error;
			}
		}
	}

	// Ordinary function arguments are expanded by recursive simplification below.
	// Expanding here traverses the same nested argument tree again at every level.
	const expandFunctionArguments = !x.isFunction() || !x.getPower().isOne() ||
		!x.getMultiplier().isOne() || x.name === FACTORIAL || x.name === WRAP;
	if (expandFunctionArguments) {
		x = x.getNumerator().expand().div(x.getDenominator().expand());
	}

	// No changes from last round — nothing left to do
	let retval = x;
	const unchanged = modifiers.image === x.text();

	if (!unchanged) {
		retval = simplifyArguments(retval);

		// Different positive integer bases can represent the same power.
		// Check exact whole-number powers before leaving symbolic terms uncancelled.
		if (retval.isSum() && retval.elementsArray().length === 2) {
			const [a, b] = retval.elementsArray();
			if (a.isEXP() && b.isEXP() && a.getMultiplier().eq(b.getMultiplier().neg())) {
				const baseA = a.getBase();
				const baseB = b.getBase();
				if (baseA.isNUM() && baseB.isNUM() &&
					baseA.isInteger() && baseB.isInteger() &&
					baseA.gt(one()) && baseB.gt(one())) {
					const small = baseA.lt(baseB) ? a : b;
					const large = baseA.lt(baseB) ? b : a;
					const smallBase = small.getBase().getMultiplier().numerator;
					const largeBase = large.getBase().getMultiplier().numerator;
					let candidate = smallBase;
					for (let power = 2; power <= 32 && candidate < largeBase; power++) {
						candidate *= smallBase;
						if (candidate === largeBase &&
							large.getPower().times(Expression.Number(power)).eq(small.getPower())) {
							retval = zero();
							break;
						}
					}
				}
			}
		}

		// Early factorial simplification for bare factorial ratios
		if (retval.isProduct() && hasFactorialRatio(retval)) {
			retval = simplifyFactorials(retval);
		}

		// Only enter the main simplification if factorials didn't fully resolve,
		// or the expression wasn't a factorial ratio to begin with
		if (hasFactorialRatio(retval) || !x.isProduct() || !hasFactorialRatio(x)) {
			if (x.isComplex()) {
				retval = complexSimplify(retval);
			} else if (
				hasIrrationalDenominator(retval) ||
				(retval.getDenominator().isSum() &&
					retval.getDenominator().elementsArray().length === 2 &&
					retval.getDenominator().elementsArray().every(term => term.pow(2).isNUM()))
			) {
				retval = rationalize(retval);
			} else if (retval.isSum()) {
				retval = tryRewriteTrig(retval);
				retval = simplifyTrigSum(retval);
				// Combine known-positive numeric radicals before common-factor extraction.
				if (retval.isSum() && retval.getMultiplier().isOne() && retval.getPower().isOne()) {
					const terms = retval.elementsArray();
					const reduced = terms.map(term => {
						const numericRadicals = term.isProduct()
							? term.elementsArray().filter(factor =>
								factor.hasRadical() && factor.getBase().isNUM() && factor.getBase().gt(zero()))
							: [];
						return numericRadicals.length > 1 ? simplifyRadicals(term) : term;
					});
					if (reduced.some((term, i) => term.text() !== terms[i].text())) {
						retval = sum(...reduced);
					}
				}
				retval = factorCommonPower(retval);
				// Factoring can expose a trig identity inside a product's sum factor.
				// Check that factor without changing how other sums are simplified.
				if (retval.isProduct() && retval.getPower().isOne()) {
					const factors = retval.elementsArray().map(e => e.isSum() ? simplifyTrigSum(e) : e);
					retval = product(...factors).times(Expression.fromRational(retval.getMultiplier()));
				}
				retval = simplifyLogs(retval);
			} else if (retval.isProduct() && retval.isLinear()) {
				retval = simplifyFactorials(retval);
				retval = simplifyRadicals(retval);

				retval = cancelNestedFactors(retval);
				retval = cancelCommonFactors(retval);
				const numerator = retval.getNumerator();
				if (numerator.isSum()) {
					const combined = simplifyLogs(numerator);
					if (combined !== numerator) {
						retval = combined.div(retval.getDenominator());
					}
				}
				retval = tryRewriteTrig(retval);
			}
		}
	}

	retval = simplifyLogRatio(retval);
	retval = factorResult(retval);
	if (asDecimal) {
		retval.getMultiplier().asDecimal = true;
	}

	return retval;
}

function simplifyArguments(x: Expression): Expression {
	let retval: Expression | undefined = undefined;
	const m = x.getMultiplier();
	const p = x.getPower();
	if (x.isFunction()) {
		const args = x.getArguments().map(e => simplify(e));
		const arg = args[0];
		const outerIntegerFunction =
			(x.name === FLOOR || x.name === CEIL || x.name === TRUNC) ||
			(x.name === ROUND && args.length === 2 && args[1].isZero());
		const innerIntegerFunction =
			arg &&
			arg.getPower().isOne() &&
			arg.getMultiplier().isOne() &&
			(arg.isFunction(FLOOR) || arg.isFunction(CEIL) || arg.isFunction(TRUNC) ||
				(arg.isFunction(ROUND) && arg.getArguments()[1]?.isZero()));
		retval = outerIntegerFunction && innerIntegerFunction
			? arg
			: Expression.toFunction(x.name, args);

		// Inverse trig functions return angles in their principal ranges.
		// Matching reciprocal functions use the same ranges as sine or cosine.
		const sinePair = (x.name === ASIN && arg?.isFunction(SIN)) ||
			(x.name === ACSC && arg?.isFunction(CSC));
		const cosinePair = (x.name === ACOS && arg?.isFunction(COS)) ||
			(x.name === ASEC && arg?.isFunction(SEC));
		const tangentPair = x.name === ATAN && arg?.isFunction(TAN);
		const cotangentPair = x.name === ACOT && arg?.isFunction(COT);
		if (arg?.getPower().isOne() && arg.getMultiplier().isOne() &&
			(sinePair || cosinePair || tangentPair || cotangentPair)) {
			const angle = arg.getArguments()[0];
			if (angle.isNUM()) {
				const value = angle.getMultiplier();
				const pi = Rational.PI;
				const halfPi = pi.div('2');

				// Use rational arithmetic for range selection, rather than rounding
				// angles to native numbers near a principal-branch boundary.
				const shifted = sinePair || tangentPair ? value.plus(halfPi) : value;
				const quotient = shifted.div(pi);
				let n = quotient.numerator / quotient.denominator;
				if (quotient.numerator < 0n && quotient.numerator % quotient.denominator !== 0n) {
					n--;
				}
				const multiple = Expression.Pi().times(Expression.Number(n.toString()));
				const reduced = angle.minus(multiple);
				const offset = value.minus(pi.times(n.toString()));
				const defined = (!(tangentPair || cosinePair && x.name === ASEC) ||
					!offset.eq(halfPi) && !offset.eq(halfPi.neg())) &&
					(!(sinePair && x.name === ACSC || cotangentPair) || !offset.isZero());
				if (defined) {
					if (cosinePair) {
						retval = n % 2n === 0n ? reduced : Expression.Pi().minus(reduced);
					} else if (cotangentPair || tangentPair) {
						retval = reduced;
					} else {
						retval = n % 2n === 0n ? reduced : reduced.neg();
					}
				}
			}
		}
	} else if (x.isProduct()) {
		retval = one();
		for (const element of x.elementsArray()) {
			const simplified = simplifyArguments(element);
			retval = retval.times(simplified);
		}
	} else if (x.isSum()) {
		retval = zero();
		for (const element of x.elementsArray()) {
			retval = retval.plus(simplifyArguments(element));
		}
	}

	if (retval) {
		retval = simplifyPerfectSquareRadical(retval.pow(p).times(m));
	} else {
		retval = simplifyPerfectSquareRadical(x);
	}
	return retval;
}

/** Shared exit: factor numerator and denominator, or return as-is for pure numbers. */
function factorResult(x: Expression): Expression {
	if (x.isNUM()) {
		return x;
	}

	function rebuildFactorResult(original: Expression, factors: Expression[]): Expression {
		let retval = product(...factors);
		if (original.hasDecimal() && factors.length === 1 && factors[0].eq(original)) {
			retval = original;
		}
		return retval;
	}

	const numerator = x.getNumerator();
	const denominator = x.getDenominator();
	const num = rebuildFactorResult(numerator, polyFactorExpressions(numerator));
	const den = rebuildFactorResult(denominator, polyFactorExpressions(denominator));

	return num.div(den);
}
/**
 * Cancels common factors between top-level elements and elements nested inside
 * inverted products. Handles cases like fact(n) * (fact(n)*(1+n))^-1 → (1+n)^-1
 * where the denominator is a product raised to -1 and contains a factor that
 * matches a numerator element.
 */
function cancelNestedFactors(x: Expression): Expression {
	if (!x.isProduct()) {
		return x;
	}

	const numFactors: Expression[] = [];
	const denCompounds: { base: Expression; index: number }[] = [];
	const otherDen: Expression[] = [];

	let idx = 0;
	for (const element of x.elementsArray()) {
		const p = element.getPower();
		if (p.sign() === -1 && p.isMinusOne?.()) {
			// This is something^-1. Check if the base is a product.
			const base = element.invert();
			if (base.isProduct()) {
				denCompounds.push({ base, index: idx });
			} else {
				otherDen.push(element);
			}
		} else if (p.sign() === 1) {
			numFactors.push(element);
		} else {
			otherDen.push(element);
		}
		idx++;
	}

	// Nothing to do if there are no compound denominators
	if (denCompounds.length === 0 || numFactors.length === 0) {
		return x;
	}

	let changed = false;
	const usedNum = new Set<number>();

	for (const compound of denCompounds) {
		const denElements = compound.base.elementsArray();
		const denMultiplier = compound.base.getMultiplier();
		const survivingDen: Expression[] = [];
		let compoundChanged = false;

		for (const de of denElements) {
			let cancelled = false;
			for (let i = 0; i < numFactors.length; i++) {
				if (usedNum.has(i)) {
					continue;
				}
				// Compare ignoring multipliers
				const numUnit = numFactors[i].toUnitMultiplier();
				const denUnit = de.toUnitMultiplier();
				if (numUnit.eq(denUnit)) {
					// Cancel, keeping ratio of multipliers
					const mRatio = numFactors[i].getMultiplier().div(de.getMultiplier());
					if (!mRatio.isOne()) {
						// Replace the numerator factor with the multiplier ratio
						numFactors[i] = Expression.fromRational(mRatio);
					} else {
						usedNum.add(i);
					}
					cancelled = true;
					compoundChanged = true;
					changed = true;
					break;
				}
			}
			if (!cancelled) {
				survivingDen.push(de);
			}
		}

		if (compoundChanged) {
			// Rebuild the denominator from surviving elements
			if (survivingDen.length === 0) {
				// Entire denominator cancelled — just the multiplier remains
				otherDen.push(Expression.fromRational(denMultiplier).invert());
			} else {
				let newDen = Expression.fromRational(denMultiplier);
				for (const s of survivingDen) {
					newDen = newDen.times(s);
				}
				otherDen.push(newDen.invert());
			}
		} else {
			otherDen.push(compound.base.invert());
		}
	}

	if (!changed) {
		return x;
	}

	let result = Expression.fromRational(x.getMultiplier());
	for (let i = 0; i < numFactors.length; i++) {
		if (!usedNum.has(i)) {
			result = result.times(numFactors[i]);
		}
	}
	for (const d of otherDen) {
		result = result.times(d);
	}

	return result;
}
