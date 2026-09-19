import { Expression } from '../../core/classes/expression/Expression';
import {
	eight,
	four,
	half,
	one,
	sixteen,
	three,
	twentySeven,
	two,
	twoHundredFiftySix,
	zero,
} from '../../core/classes/expression/shortcuts';
import { LOG, ABS } from '../../core/classes/parser/constants';
import { Polynomial } from '../../core/classes/polynomial/Polynomial';
import { message, UnexpectedInputError } from '../../core/errors';
import { cbrt, exp, sqrt, log } from '../../math/math';
import {
	SIN,
	COS,
	TAN,
	SINH,
	TANH,
	ASIN,
	ACOS,
	ATAN,
	COT,
	ASINH,
	ACOSH,
	ATANH,
	ASEC,
	asin,
	acos,
	atan,
	asinh,
	acosh,
	atanh,
	COSH,
	sin,
	cos,
	tan,
	sinh,
	cosh,
	tanh,
} from '../../math/trig';
import { stripPower } from '../../math/utils';
import { solve } from '../solve';

import type { ExpressionInput } from '../../core/types';

/**
 * Applies a defined set of exact transformations to one equation in one variable.
 *
 * Polynomial equations through degree four use closed-form formulas. Other
 * recognized forms are solved by isolating and inverting elementary functions,
 * exponentials, logarithmic sums, or a single square-root term. Unsupported
 * input is reported by {@link solve} as `unsolved` so a caller can select a
 * different strategy.
 *
 * @remarks
 * This class is the symbolic strategy used by the ordinary solver; it is not a
 * general proof procedure. Inverse-function results follow the symbolic forms
 * implemented here, including parameterized families for direct trigonometric
 * functions. The supplied Expression is retained, while Polynomial input is
 * converted to its Expression representation.
 */
export class SymbolicSolver {
	private static readonly MAX_FN_SOLVE_STEPS = 64;
	private input: Expression;
	private x: string;

	/**
	 * Creates a symbolic solver for `input = 0`.
	 *
	 * @param input - Polynomial or expression whose zeros are sought.
	 * @param v - Plain variable to solve for.
	 * @throws {@link core!UnexpectedInputError} If `v` is not a plain variable.
	 */
	constructor(input: Polynomial | string | Expression, v: ExpressionInput) {
		v = Expression.create(v);
		this.x = v.value;
		if (!v.isPlainVariable()) {
			throw new UnexpectedInputError(message('plainVariableExpected', { input: v.text() }));
		}

		if (typeof input === 'string') {
			// Default to Expression
			this.input = Expression.create(input);
		} else if (Polynomial.isPolynomial(input)) {
			this.input = input.getExpression();
		} else {
			this.input = input;
		}
	}

	/**
	 * Solves `coeffs[3]x^3 + coeffs[2]x^2 + coeffs[1]x + coeffs[0] = 0`
	 * with Cardano's formula.
	 *
	 * @param coeffs - Four coefficients in ascending-power order.
	 * @returns Three symbolic root expressions.
	 */
	static cubic(coeffs: Expression[]): Expression[] {
		const d = coeffs[0];
		const c = coeffs[1];
		const b = coeffs[2];
		const a = coeffs[3];

		// Normalize
		const b1 = b.div(a);
		const c1 = c.div(a);
		const d1 = d.div(a);

		// Depressed cubic coefficients
		const p = c1.minus(b1.pow(two()).div(three()));
		const q = d1
			.minus(b1.times(c1).div(three()))
			.plus(two().times(b1.pow(three())).div(twentySeven()));

		// Discriminant
		const discriminant = q.pow(two()).div(four()).plus(p.pow(three()).div(twentySeven()));

		// Shift for converting back from depressed cubic
		const shift = zero().minus(b1).div(three());

		// General Cardano solution
		const sqrtDisc = sqrt(discriminant);
		const negQOver2 = zero().minus(q).div(two());

		const u = cbrt(negQOver2.plus(sqrtDisc));
		const v = cbrt(negQOver2.minus(sqrtDisc));

		// First root: t = u + v
		const t1 = u.plus(v);
		// Other roots using cube roots of unity
		const sqrt3 = sqrt(three());
		// const half = one.div(two());
		const negHalf = zero().minus(half());
		const i = sqrt(zero().minus(one()));

		const uPlusV = u.plus(v);
		const uMinusV = u.minus(v);

		const t2 = negHalf.times(uPlusV).plus(sqrt3.div(two()).times(uMinusV).times(i));
		const t3 = negHalf.times(uPlusV).minus(sqrt3.div(two()).times(uMinusV).times(i));

		return [t1.plus(shift), t2.plus(shift), t3.plus(shift)];
	}

	/**
	 * Solves `coeffs[2]x^2 + coeffs[1]x + coeffs[0] = 0` symbolically.
	 *
	 * @param coeffs - Three coefficients in ascending-power order.
	 * @returns The two quadratic-formula roots.
	 */
	static quadratic(coeffs: Expression[]): Expression[] {
		const c = coeffs[0];
		const b = coeffs[1];
		const a = coeffs[2];

		// console.log(`${a}, ${b}, ${c}`);

		const discriminant = b.pow(two()).minus(four().times(a).times(c));
		const sqrtDisc = sqrt(discriminant);
		const twoA = two().times(a);
		const negB = zero().minus(b);

		const root1 = negB.plus(sqrtDisc).div(twoA);
		const root2 = negB.minus(sqrtDisc).div(twoA);

		return [root1, root2];
	}

	/**
	 * Solves a quartic from five ascending-power coefficients with Ferrari's method.
	 *
	 * @param coeffs - Coefficients from the constant through fourth-degree term.
	 * @returns Four symbolic root expressions.
	 */
	static quartic(coeffs: Expression[]): Expression[] {
		const e = coeffs[0];
		const d = coeffs[1];
		const c = coeffs[2];
		const b = coeffs[3];
		const a = coeffs[4];

		// Normalize: x^4 + A x^3 + B x^2 + C x + D = 0
		const A = b.div(a);
		const B = c.div(a);
		const C = d.div(a);
		const D = e.div(a);

		// Depressed quartic: t^4 + p t^2 + q t + r = 0 via x = t - A/4
		const p = B.minus(three().times(A.pow(two())).div(eight()));
		const q = C.minus(A.times(B).div(two())).plus(A.pow(three()).div(eight()));
		const r = D.minus(A.times(C).div(four()))
			.plus(A.pow(two()).times(B).div(sixteen()))
			.minus(three().times(A.pow(four())).div(twoHundredFiftySix()));

		const shift = zero().minus(A).div(four());

		// Special case: biquadratic (q == 0) => solve t^4 + p t^2 + r = 0 as quadratic in z = t^2
		// This avoids the Ferrari division by s (and in particular avoids 0/0 when q=0 and y=0 is chosen).
		if (q.isZero()) {
			// z^2 + p z + r = 0
			const zRoots = SymbolicSolver.quadratic([r, p, one()]);

			// Readability + stability for common unit-imaginary cases in biquadratics.
			// Examples:
			//   x^4 + 1  => z^2 + 1 = 0 => z = ±i
			//   x^4 + 16 => z^2 + 16 = 0 => z = ±4i
			// Using explicit forms avoids ambiguous i^(1/2) formatting and prevents
			// branch-related simplification from collapsing distinct roots.
			const I = Expression.Img();
			const sqrt2 = sqrt(two());
			const sqrtSpecial = (z: Expression): Expression | undefined => {
				if (z.value !== Expression.imaginary) {
					return undefined;
				}
				const m = z.getMultiplier();
				if (m.isOne()) {
					return one().plus(I).div(sqrt2);
				} // sqrt(i)
				if (m.isMinusOne()) {
					return one().minus(I).div(sqrt2);
				} // sqrt(-i)
				if (m.eq('4')) {
					return sqrt2.times(one().plus(I));
				} // sqrt(4i)
				if (m.eq('-4')) {
					return sqrt2.times(one().minus(I));
				} // sqrt(-4i)
				return undefined;
			};

			const tA = sqrtSpecial(zRoots[0]) ?? sqrt(zRoots[0]);
			const tB = sqrtSpecial(zRoots[1]) ?? sqrt(zRoots[1]);

			return [
				tA.plus(shift),
				zero().minus(tA).plus(shift),
				tB.plus(shift),
				zero().minus(tB).plus(shift),
			];
		}

		// Ferrari's method (general case, q != 0)

		// Resolvent cubic: y^3 + 2 p y^2 + (p^2 - 4 r) y - q^2 = 0
		const cubicCoeffs = [
			zero().minus(q.pow(two())), // constant: -q^2
			p.pow(two()).minus(four().times(r)), // linear: p^2 - 4r
			two().times(p), // quadratic: 2p
			one(), // cubic: 1
		];

		const cubicRoots = SymbolicSolver.cubic(cubicCoeffs);

		// Choose a root y such that s = sqrt(y) is non-zero (required because q != 0).
		let y: Expression | undefined = undefined;
		for (const rt of cubicRoots) {
			if (!rt.isZero()) {
				y = rt;
				break;
			}
		}
		y = y ?? cubicRoots[0];

		let s = sqrt(y);
		// Last-resort: if s still ends up zero (can happen if cubic returned 0 first and "isZero" didn't catch),
		// try remaining roots.
		if (s.isZero()) {
			for (const rt of cubicRoots) {
				if (!rt.isZero()) {
					const cand = sqrt(rt);
					if (!cand.isZero()) {
						y = rt;
						s = cand;
						break;
					}
				}
			}
		}

		// u and v derived from:
		// v - u = q / s, and u + v = p + y
		const pPlusY = p.plus(y);
		const u = pPlusY.div(two()).minus(q.div(two().times(s)));
		const v = pPlusY.div(two()).plus(q.div(two().times(s)));

		// Factor: (t^2 + s t + u)(t^2 - s t + v) = 0
		const roots1 = SymbolicSolver.quadratic([u, s, one()]);
		const roots2 = SymbolicSolver.quadratic([v, zero().minus(s), one()]);

		return [
			roots1[0].plus(shift),
			roots1[1].plus(shift),
			roots2[0].plus(shift),
			roots2[1].plus(shift),
		];
	}

	/**
	 * Attempts the supported elementary-function and radical transformations.
	 *
	 * @returns Symbolic solutions, or `undefined` when no supported transformation
	 * closes the equation.
	 */
	private fnSolve(): Expression[] | undefined {
		const input = this.input;
		const x = this.x;

		const solveForX = (u: Expression, value: Expression): Expression[] => {
			const vars = u.variables();
			if (vars.length === 1 && vars[0] === x && u.text() === x && !value.hasVariable(x)) {
				return [value];
			}
			const eq = u.minus(value);
			const solver = new SymbolicSolver(eq, x);
			const result = solver.solve();
			if (!result.unsolved) {
				return result.solutions;
			}
			return solve(eq, x).elements;
		};

		const n = Expression.N();
		const pi = Expression.Pi();
		const nPi = n.times(pi);
		const oddPiOver2 = two().times(n).plus(one()).times(pi).div(two());

		//  Sum decomposition: f(u) + c = 0
		if (input.isSum()) {
			const elements = input.elementsArray();
			const logTerms = elements.filter(
				e =>
					e.isFunction(LOG) &&
					e.isLinear() &&
					e.getMultiplier().isInteger() &&
					e.getArguments().length > 0
			);
			if (logTerms.length === elements.length && logTerms.some(e => e.hasVariable(x))) {
				let product = one();
				for (const logTerm of logTerms) {
					const exponent = Expression.fromRational(logTerm.getMultiplier());
					product = product.times(logTerm.getArguments()[0].pow(exponent));
				}
				return solve(product.minus(one()), x).elements;
			}

			const radicalTerms = elements.filter(
				e => e.hasVariable(x) && e.getPower().eq(half())
			);
			if (radicalTerms.length === 1) {
				const radicalTerm = radicalTerms[0];
				let remainder = zero();
				for (const element of elements) {
					if (element !== radicalTerm) {
						remainder = remainder.plus(element);
					}
				}
				const base = stripPower(radicalTerm.toUnitMultiplier());
				const isolated = remainder.neg().div(radicalTerm.getMultiplier());
				return solve(base.minus(isolated.sq()), x).elements;
			}

			const negativeHalf = half().neg();
			const reciprocalRadicals: { term: Expression; factor: Expression }[] = [];
			for (const element of elements) {
				if (element.hasVariable(x)) {
					const factors = element.isProduct() ? element.elementsArray() : [element];
					const variableFactors = factors.filter(factor => factor.hasVariable(x));
					if (
						variableFactors.length === 1 &&
						variableFactors[0].getPower().eq(negativeHalf)
					) {
						reciprocalRadicals.push({
							term: element,
							factor: variableFactors[0],
						});
					}
				}
			}

			if (reciprocalRadicals.length === 1) {
				const { term: radicalTerm, factor: radicalFactor } = reciprocalRadicals[0];
				let remainder = zero();
				for (const element of elements) {
					if (element !== radicalTerm) {
						remainder = remainder.plus(element);
					}
				}

				// A reciprocal square root can be nested inside a product. Isolate only
				// that factor, leaving the established direct-square-root path unchanged.
				const unitFactor = radicalFactor.toUnitMultiplier();
				const coefficient = radicalTerm.div(unitFactor);
				if (!coefficient.hasVariable(x) && !remainder.hasVariable(x)) {
					const base = radicalFactor.getBase();
					const isolated = remainder.neg().div(coefficient);
					return solveForX(base, isolated.pow(two().neg()));
				}
			}

			if (elements.length === 2) {
				let sinArg: Expression | undefined;
				let sinCoeff: Expression | undefined;
				let cosArg: Expression | undefined;
				let cosCoeff: Expression | undefined;
				let validTrigCombination = true;

				for (const element of elements) {
					const factors = element.isProduct() ? element.elementsArray() : [element];
					const trigFactors = factors.filter(
						factor =>
							(factor.isFunction(SIN) || factor.isFunction(COS)) &&
							factor.getPower().isOne()
					);

					if (trigFactors.length !== 1) {
						validTrigCombination = false;
						break;
					}

					const trig = trigFactors[0].toUnitMultiplier();
					const coeff = element.div(trig);
					if (coeff.hasVariable(x)) {
						validTrigCombination = false;
						break;
					}

					if (trigFactors[0].isFunction(SIN)) {
						sinArg = trig.getArguments()[0];
						sinCoeff = coeff;
					} else {
						cosArg = trig.getArguments()[0];
						cosCoeff = coeff;
					}
				}

				if (
					validTrigCombination &&
					sinArg &&
					sinCoeff &&
					cosArg &&
					cosCoeff &&
					sinArg.eq(cosArg) &&
					!sinCoeff.isZero()
				) {
					return solveForX(sinArg, atan(cosCoeff.neg().div(sinCoeff)));
				}
			}

			const fnTerms = elements.filter(
				(e): e is Expression & { name: string } => e.isFunction() && e.hasVariable(x)
			);
			if (fnTerms.length === 1) {
				const fnTerm = fnTerms[0];
				let remainder = zero();
				for (const element of elements) {
					if (element !== fnTerm) {
						remainder = remainder.plus(element);
					}
				}

				if (!remainder.hasVariable(x) || fnTerm.name === ABS) {
					const fname = fnTerm.name;
					const u = fnTerm.getArguments()[0];
					const m = fnTerm.getMultiplier();
					const p = fnTerm.getPower();

					// f(u) = -remainder / m
					let c = remainder.neg().div(m);
					// f(u)^n = c => f(u) = c^(1/n)
					if (!p.isOne()) {
						c = c.pow(p.invert());
					}

					const values = this.invertFunction(fname, c);
					if (values !== undefined) {
						const results: Expression[] = [];
						for (const v of values) {
							results.push(...solveForX(u, v));
						}
						return results.length > 0 ? results : undefined;
					}
				}
			}
			if (elements.length === 2) {
				const expIdx = elements.findIndex(e => {
					let retval = false;
					if (e.isEXP()) {
						const base = e.getBase();
						// Symbolic bases independent of x can use the same formal logarithmic
						// inversion. Explicit numeric bases retain the real-log domain restriction.
						retval =
							e.hasVariable(x) &&
							!base.hasVariable(x) &&
							(!base.isNUM() || (base.gt(zero()) && !base.isOne()));
					}
					return retval;
				});
				if (expIdx !== -1) {
					const expTerm = elements[expIdx];
					const constTerm = elements[1 - expIdx];

					if (!constTerm.hasVariable(x)) {
						const base = expTerm.getBase();
						const u = expTerm.getPower();
						const m = expTerm.getMultiplier();
						const c = constTerm.neg().div(m);
						return solveForX(u, log(c).div(log(base)));
					}
				}
			}
		}

		//  Direct function: f(u) = 0
		if (input.isFunction(SIN)) {
			const u = input.getArguments()[0];
			return solveForX(u, nPi);
		}

		if (input.isFunction(COS)) {
			const u = input.getArguments()[0];
			return solveForX(u, oddPiOver2);
		}

		if (input.isFunction(TAN)) {
			const u = input.getArguments()[0];
			return solveForX(u, nPi);
		}

		if (input.isFunction(COT)) {
			const u = input.getArguments()[0];
			return solveForX(u, oddPiOver2);
		}

		if (input.isFunction(LOG)) {
			const u = input.getArguments()[0];
			return solveForX(u, one());
		}

		if (input.isFunction(SINH)) {
			const u = input.getArguments()[0];
			return solveForX(u, zero());
		}

		if (input.isFunction(TANH)) {
			const u = input.getArguments()[0];
			return solveForX(u, zero());
		}

		if (input.isFunction(ASIN)) {
			const u = input.getArguments()[0];
			return solveForX(u, zero());
		}

		if (input.isFunction(ACOS)) {
			const u = input.getArguments()[0];
			return solveForX(u, one());
		}

		if (input.isFunction(ATAN)) {
			const u = input.getArguments()[0];
			return solveForX(u, zero());
		}

		if (input.isFunction(ASEC)) {
			const u = input.getArguments()[0];
			return solveForX(u, one());
		}

		if (input.isFunction(ASINH)) {
			const u = input.getArguments()[0];
			return solveForX(u, zero());
		}

		if (input.isFunction(ACOSH)) {
			const u = input.getArguments()[0];
			return solveForX(u, one());
		}

		if (input.isFunction(ATANH)) {
			const u = input.getArguments()[0];
			return solveForX(u, zero());
		}

		if (input.isFunction(ABS)) {
			const u = input.getArguments()[0];
			return solveForX(u, zero());
		}

		return undefined;
	}

	private invertFunction(fname: string, c: Expression): Expression[] | undefined {
		switch (fname) {
			case SIN:
				return [asin(c)];
			case COS:
				return [acos(c)];
			case TAN:
				return [atan(c)];
			case COT:
				return [atan(one().div(c))];
			case LOG:
				return [exp(c)];
			case SINH:
				return [asinh(c)];
			case COSH:
				return [acosh(c)];
			case TANH:
				return [atanh(c)];
			case ASIN:
				return [sin(c)];
			case ACOS:
				return [cos(c)];
			case ATAN:
				return [tan(c)];
			case ASEC:
				return [one().div(cos(c))];
			case ASINH:
				return [sinh(c)];
			case ACOSH:
				return [cosh(c)];
			case ATANH:
				return [tanh(c)];
			case ABS:
				return [c, zero().minus(c)];
			default:
				return undefined;
		}
	}

	/** Returns whether any node in the configured input is a function call. */
	inputContainsFunction() {
		let found = false;
		this.input.forEveryElement(e => {
			if (e.isFunction()) {
				found = true;
			}
			return e;
		});
		return found;
	}
	/**
	 * Attempts polynomial formulas and then supported function transformations.
	 *
	 * @returns An object containing `solutions` and, when the strategy cannot
	 * solve the equation, the original `unsolved` expression.
	 */
	solve() {
		let solutions: Expression[] | undefined;
		let unsolved: Expression | undefined;

		if (this.input.hasVariable(this.x)) {
			let coeffs: Expression[] | undefined;
			const negativeHalf = half().neg();
			const containsRadicalTerm =
				this.input.isSum() &&
				this.input.elementsArray().some(term => {
					let retval = term.hasVariable(this.x) && term.getPower().eq(half());

					if (!retval && term.isProduct() && term.hasVariable(this.x)) {
						const variableFactors = term
							.elementsArray()
							.filter(factor => factor.hasVariable(this.x));

						retval =
							variableFactors.length === 1 &&
							variableFactors[0].getPower().eq(negativeHalf);
					}

					return retval;
				});
			if (!containsRadicalTerm) {
				try {
					coeffs = this.input.coeffs(this.x).toArray();
				} catch { }
			}

			if (coeffs) {
				const deg = coeffs.length - 1;

				let cleanCoeffs = true;
				for (const c of coeffs) {
					if (c.hasVariable(this.x)) {
						cleanCoeffs = false;
						break;
					}
				}

				if (cleanCoeffs && deg >= 1 && deg <= 4) {
					switch (deg) {
						case 1:
							solutions = [coeffs[0].neg().div(coeffs[1])];
							break;
						case 2:
							solutions = SymbolicSolver.quadratic(coeffs);
							break;
						case 3:
							solutions = SymbolicSolver.cubic(coeffs);
							break;
						case 4:
							solutions = SymbolicSolver.quartic(coeffs);
							break;
					}
				}
			}

			if (!solutions) {
				solutions = this.fnSolve();
			}

			if (!solutions) {
				unsolved = this.input;
			}
		} else {
			unsolved = this.input;
		}

		solutions ??= [];
		return {
			solutions,
			unsolved,
		};
	}
}
