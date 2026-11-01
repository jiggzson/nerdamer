import { Complex } from '../core/classes/complex/Complex';
import { Expression } from '../core/classes/expression/Expression';
import { two, zero } from '../core/classes/expression/shortcuts';
import { CHI, CI, EI, LI, SHI, SI } from '../core/constants/functionNames';
import { pureImaginaryCoefficient } from '../core/functions/complex';
import {
	Chi as decChi,
	Ci as decCi,
	CiComplex,
	Ei as decEi,
	EiComplex,
	Li as decLi,
	Shi as decShi,
	Si as decSi,
	SiComplex,
} from '../core/functions/decimal';
import { Settings } from '../core/Settings';

/**
 * Computes the sine integral: `Si(x) = ∫₀ˣ sin(t)/t dt`.
 *
 * - `Si(+∞) = π/2`, `Si(−∞) = −π/2`
 * - `Si(0) = 0`
 * - The function is odd: `Si(-x) = -Si(x)`.
 *
 * @param x - The input expression.
 * @returns The sine integral value.
 *
 * @example
 * ```ts
 * Si(Expression.create(0)).text()     // "0"
 * Si(Expression.create('x')).text()   // "Si(x)"
 * ```
 */
export function Si(x: Expression): Expression {
	let retval: Expression;
	const imaginaryCoefficient = pureImaginaryCoefficient(x);

	// Numerical evaluation uses the Decimal-backed complex implementation.
	// Symbolic imaginary-axis identities remain active when not evaluating.
	const real = x.isComplex() ? x.realPart() : undefined;
	const imaginary = x.isComplex() ? x.imagPart() : undefined;
	const numerical = Settings.EVALUATE && real?.isNUM() && imaginary?.isNUM()
		? new Complex(real.getMultiplier().toDecimal(), imaginary.getMultiplier().toDecimal())
		: undefined;

	if (numerical && numerical.absSquared().lte(64)) {
		const value = SiComplex(numerical);
		retval = Expression.Number(value.re).plus(Expression.Number(value.im).i());
	} else if (imaginaryCoefficient) {
		retval = Shi(imaginaryCoefficient).i();
	} else if (x.isPosInf() || x.isNegInf()) {
		retval = Expression.Pi().div(two());
		if (x.isNegInf()) {
			retval = retval.neg();
		}
	} else if (x.isZero()) {
		retval = zero();
	} else if (x.sign() === -1) {
		retval = Si(x.neg()).neg();
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decSi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction(SI, [Expression.create(x)]);
	}

	return retval;
}

/**
 * Computes the hyperbolic sine integral: `Shi(x) = ∫₀ˣ sinh(t)/t dt`.
 *
 * - `Shi(+∞) = +∞`, `Shi(−∞) = −∞`
 * - `Shi(0) = 0`
 * - The function is odd: `Shi(-x) = -Shi(x)`.
 *
 * @param x - The input expression.
 * @returns The hyperbolic sine integral value.
 *
 * @example
 * ```ts
 * Shi(Expression.create(0)).text()     // "0"
 * Shi(Expression.create('x')).text()   // "Shi(x)"
 * ```
 */
export function Shi(x: Expression): Expression {
	let retval: Expression;
	const imaginaryCoefficient = pureImaginaryCoefficient(x);

	if (imaginaryCoefficient) {
		retval = Si(imaginaryCoefficient).i();
	} else if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? Expression.NegInf() : Expression.Inf();
	} else if (x.isZero()) {
		retval = zero();
	} else if (x.sign() === -1) {
		retval = Shi(x.neg()).neg();
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decShi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction(SHI, [Expression.create(x)]);
	}

	return retval;
}

/**
 * Computes the cosine integral: `Ci(x) = γ + ln(x) + ∫₀ˣ (cos(t)−1)/t dt`,
 * where γ is the Euler–Mascheroni constant.
 *
 * - `Ci(+∞) = 0`, `Ci(−∞) = 0`
 * - `Ci(0) = −∞`
 * - Negative real arguments take the upper side of the principal logarithm branch.
 *
 * @param x - The input expression.
 * @returns The cosine integral value.
 *
 * @example
 * ```ts
 * Ci(Expression.create('x')).text()   // "Ci(x)"
 * ```
 */
export function Ci(x: Expression): Expression {
	let retval: Expression;
	const imaginaryCoefficient = pureImaginaryCoefficient(x);

	// Numerical evaluation uses the Decimal-backed complex implementation.
	// Symbolic imaginary-axis identities remain active when not evaluating.
	const real = x.isComplex() ? x.realPart() : undefined;
	const imaginary = x.isComplex() ? x.imagPart() : undefined;
	const numerical = Settings.EVALUATE && real?.isNUM() && imaginary?.isNUM()
		? new Complex(real.getMultiplier().toDecimal(), imaginary.getMultiplier().toDecimal())
		: undefined;

	if (numerical && numerical.absSquared().lte(64) && !numerical.absSquared().isZero()) {
		const value = CiComplex(numerical);
		retval = Expression.Number(value.re).plus(Expression.Number(value.im).i());
	} else if (imaginaryCoefficient?.isConstant() && !imaginaryCoefficient.isZero()) {
		const sign = imaginaryCoefficient.sign();
		retval = Chi(imaginaryCoefficient.abs())
			.plus(Expression.Pi().div(two()).i().times(sign));
	} else if (numerical) {
		// Outside the series range, keep a mixed complex argument symbolic.
		retval = Expression.toFunction(CI, [Expression.create(x)]);
	} else if (x.isPosInf() || x.isNegInf()) {
		retval = zero();
	} else if (x.isZero()) {
		retval = Expression.NegInf();
	} else if (x.isNUM() && x.sign() === -1) {
		// The principal logarithm contributes +i*pi on the negative real axis.
		retval = Ci(x.neg()).plus(Expression.Pi().i());
	} else if (x.sign() === -1) {
		retval = Ci(x.neg());
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decCi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction(CI, [Expression.create(x)]);
	}

	return retval;
}

/**
 * Computes the hyperbolic cosine integral: `Chi(x) = γ + ln(x) + ∫₀ˣ (cosh(t)−1)/t dt`,
 * where γ is the Euler–Mascheroni constant.
 *
 * - `Chi(±∞) = +∞`
 * - `Chi(0) = −∞`
 * - The function is even for the principal branch: `Chi(-x) = Chi(x)`.
 *
 * @param x - The input expression.
 * @returns The hyperbolic cosine integral value.
 *
 * @example
 * ```ts
 * Chi(Expression.create('x')).text()   // "Chi(x)"
 * ```
 */
export function Chi(x: Expression): Expression {
	let retval: Expression;
	const imaginaryCoefficient = pureImaginaryCoefficient(x);

	if (imaginaryCoefficient?.isConstant() && !imaginaryCoefficient.isZero()) {
		const sign = imaginaryCoefficient.sign();
		retval = Ci(imaginaryCoefficient.abs())
			.plus(Expression.Pi().div(two()).i().times(sign));
	} else if (x.isPosInf() || x.isNegInf()) {
		retval = Expression.Inf();
	} else if (x.isZero()) {
		retval = Expression.NegInf();
	} else if (x.sign() === -1) {
		retval = Chi(x.neg());
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decChi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction(CHI, [Expression.create(x)]);
	}

	return retval;
}

/**
 * Computes the exponential integral: `Ei(x) = −∫₋ₓ^∞ e^(−t)/t dt` (Cauchy principal value).
 *
 * - `Ei(+∞) = +∞`, `Ei(−∞) = 0`
 * - `Ei(0) = −∞`
 *
 * @param x - The input expression.
 * @returns The exponential integral value.
 *
 * @example
 * ```ts
 * Ei(Expression.create(0)).text()     // "-Infinity"
 * Ei(Expression.create('x')).text()   // "Ei(x)"
 * ```
 */
export function Ei(x: Expression): Expression {
	let retval: Expression;
	const imaginaryCoefficient = pureImaginaryCoefficient(x);

	// Numerical evaluation uses the Decimal-backed complex implementation.
	// Symbolic imaginary-axis identities remain active when not evaluating.
	const real = x.isComplex() ? x.realPart() : undefined;
	const imaginary = x.isComplex() ? x.imagPart() : undefined;
	const numerical = Settings.EVALUATE && real?.isNUM() && imaginary?.isNUM()
		? new Complex(real.getMultiplier().toDecimal(), imaginary.getMultiplier().toDecimal())
		: undefined;

	if (numerical && numerical.absSquared().lte(64) && !numerical.absSquared().isZero()) {
		const value = EiComplex(numerical);
		retval = Expression.Number(value.re).plus(Expression.Number(value.im).i());
	} else if (imaginaryCoefficient?.isConstant() && !imaginaryCoefficient.isZero()) {
		const sign = imaginaryCoefficient.sign();
		const magnitude = imaginaryCoefficient.abs();
		retval = Ci(magnitude).plus(
			Si(magnitude).plus(Expression.Pi().div(two())).i().times(sign)
		);
	} else if (x.isPosInf() || x.isNegInf()) {
		retval = x.isNegInf() ? zero() : Expression.Inf();
	} else if (x.isZero()) {
		retval = Expression.NegInf();
	} else if (x.isNUM() && Settings.EVALUATE) {
		retval = Expression.Number(decEi(x.getMultiplier().toDecimal()));
	} else {
		retval = Expression.toFunction(EI, [Expression.create(x)]);
	}

	return retval;
}

/**
 * Computes the logarithmic integral: `Li(x) = ∫₀ˣ 1/ln(t) dt`.
 *
 * - `Li(+∞) = +∞`
 * - `Li(1) = −∞` (the function has a logarithmic singularity at 1)
 * - For negative numeric inputs, returns the symbolic form.
 *
 * @param x - The input expression.
 * @returns The logarithmic integral value.
 *
 * @example
 * ```ts
 * Li(Expression.create('x')).text()   // "Li(x)"
 * ```
 */
export function Li(x: Expression): Expression {
	let retval: Expression;

	if (x.isPosInf()) {
		retval = Expression.Inf();
	} else if (x.isOne()) {
		retval = Expression.NegInf();
	} else if (x.isNUM() && Settings.EVALUATE) {
		const m = x.getMultiplier();
		if (m.isNegative()) {
			retval = Expression.toFunction(LI, [Expression.create(x)]);
		} else {
			retval = Expression.Number(decLi(m.toDecimal()));
		}
	} else {
		retval = Expression.toFunction(LI, [Expression.create(x)]);
	}

	return retval;
}
