import Decimal from 'decimal.js';

import { Expression } from '../../core/classes/expression/Expression';
import { requireVariableName } from '../../core/classes/expression/utils';
import { Rational } from '../../core/classes/rational/Rational';
import { DEFINT } from '../../core/constants/functionNames';
import { message, UndefinedError } from '../../core/errors';
import { DEFAULT_SERIES_GUARD_DIGITS } from '../../core/functions/decimal';
import { Settings } from '../../core/Settings';
import { warn } from '../../core/warnings';
import { FunctionSolver } from '../../solve/classes/FunctionSolver';

import { definiteIntegrate } from './defintDecimal';
import { definiteIntegrateNative } from './defintNative';
import { doubleExponential } from './doubleExponential';
import { numericalIntegrand } from './numericalIntegrand';

import type { ExpressionInput } from '../../core/types';

const NATIVE_DEFINITE_INTEGRATION_PRECISION = 17;
/**
 * Evaluations allowed to the adaptive Simpson fallback. Kinks and jumps inside the interval
 * take a few hundred; a divergent integral would otherwise run for seconds.
 */
const FALLBACK_EVALUATIONS = 5000;
/** Subdivision depth for the fallback, enough to pin a jump down to 20 digits. */
const FALLBACK_DEPTH = 80;

/**
 * Integrates a real integrand numerically with Decimal arithmetic at the configured precision.
 *
 * The double exponential formula handles smooth integrands and endpoint singularities. A
 * kink, jump or pole inside the interval keeps it from converging, so adaptive Simpson, which
 * subdivides around the trouble, gets a bounded attempt next. Returns undefined when neither
 * converges.
 */
function decimalIntegral(
	f: Expression,
	v: string,
	from: Expression,
	to: Expression
): Expression | undefined {
	let retval: Expression | undefined;
	const precision = Rational.getPrecision();
	Rational.set({ precision: precision + DEFAULT_SERIES_GUARD_DIGITS });
	try {
		// Bounds such as pi are evaluated at the working precision. Rounded to fewer digits they
		// can land just outside the domain, where log(2*cos(x/2)) at -pi..pi turns complex.
		const a = from.evaluate().getMultiplier().toDecimal();
		const b = to.evaluate().getMultiplier().toDecimal();
		// FunctionSolver evaluates with compiled Decimal arithmetic where it can and the parser
		// otherwise. A pole or a point outside the domain isn't part of the integral's value.
		const solver = new FunctionSolver(f, v);
		const integrand = (x: Decimal) => {
			try {
				return solver.evaluate(x);
			} catch (error) {
				if (!(error instanceof UndefinedError)) {
					throw error;
				}
				return new Decimal(NaN);
			}
		};
		let value: Decimal | undefined;
		let complex = false;
		try {
			const tolerance = new Decimal(10).pow(-precision);
			const result = doubleExponential(integrand, a, b, tolerance);
			if (result.converged) {
				// A value within rounding of zero, next to the size of the integrand, is zero.
				value = result.value.abs().lte(tolerance.times(result.scale))
					? new Decimal(0)
					: result.value;
			}
		} catch {
			// A complex value inside the interval leaves the integral unevaluated.
			complex = true;
		}
		if (!value && !complex) {
			try {
				// Endpoint singularities are the double exponential formula's job. Here a
				// non-finite value ends the attempt at once, rather than subdividing toward it
				// without bound.
				value = definiteIntegrate(integrand, a, b, {
					maxDepth: FALLBACK_DEPTH,
					maxEvals: FALLBACK_EVALUATIONS,
					singular: 'strict',
				});
			} catch {
				// A divergent integral exhausts the budget or meets a singularity it can't remove.
			}
		}
		if (value?.isFinite()) {
			retval = Expression.create(value.toSignificantDigits(precision));
		}
	} finally {
		Rational.set({ precision });
	}
	return retval;
}

/**
 * Calculates the definite integral numerically when the bounds are numbers, with Decimal
 * arithmetic at the configured precision. Setting `USE_NATIVE_DEFINT` uses adaptive Simpson
 * with native JS numbers instead, which is faster but limited to about 16 digits.
 *
 * @param f The function being integrated
 * @param dx The variable of integration
 * @param from The lower limit of the integral
 * @param to The upper limit of the integral
 * @returns The numeric value if possible else a symbolic function
 *
 * @example
 * ```ts
 * defint('cos(x)-x^2+6', 'x', 1, 6); // -42.787553149673489046
 * ```
 */
export function defint(
	f: ExpressionInput,
	dx: ExpressionInput,
	from: ExpressionInput,
	to: ExpressionInput
) {
	let retval: Expression;
	f = Expression.create(f);
	dx = Expression.create(dx);
	from = Expression.create(from);
	to = Expression.create(to);

	const inputVars = f.variables();
	// Get the variable
	const v = requireVariableName(dx);
	// Pull factors that are constant with respect to the integration variable across the bounds.
	if (!inputVars.includes(v)) {
		retval = f.times(to.minus(from));
	} else {
		let numericFrom = from;
		let numericTo = to;

		if (!numericFrom.isNUM() && numericFrom.isConstant()) {
			numericFrom = numericFrom.evaluate();
		}
		if (!numericTo.isNUM() && numericTo.isConstant()) {
			numericTo = numericTo.evaluate();
		}

		const numeric =
			inputVars.length === 1 &&
			inputVars[0] === v &&
			numericFrom.isNUM() &&
			numericTo.isNUM();
		if (numeric && !Settings.USE_NATIVE_DEFINT) {
			// A complex integrand is integrated as its real and imaginary parts.
			const real = decimalIntegral(f.isComplex() ? f.realPart() : f, v, from, to);
			const imaginary = f.isComplex()
				? decimalIntegral(f.imagPart(), v, from, to)
				: Expression.Number(0);
			if (real && imaginary) {
				retval = real.plus(imaginary.times(Expression.Img()));
			} else {
				warn(
					'defint.singularity',
					message('defintSingularity', {
						a: numericFrom.text({ decimal: true }),
						b: numericTo.text({ decimal: true }),
					})
				);
				retval = Expression.toFunction(DEFINT, [f, dx, from, to]);
			}
		} else if (numeric) {
			const a = Number(numericFrom.getMultiplier().toDecimal());
			const b = Number(numericTo.getMultiplier().toDecimal());

			if (f.isComplex()) {
				const real = Expression.create(
					definiteIntegrateNative(numericalIntegrand(f.realPart(), v), a, b)
				);
				const imaginary = Expression.create(
					definiteIntegrateNative(numericalIntegrand(f.imagPart(), v), a, b)
				);
				retval = real.plus(imaginary.times(Expression.Img()));
			} else {
				retval = Expression.create(definiteIntegrateNative(numericalIntegrand(f, v), a, b));
			}

			retval.precision = NATIVE_DEFINITE_INTEGRATION_PRECISION; // Mark it as limited precision
		} else {
			retval = Expression.toFunction(DEFINT, [f, dx, from, to]);
		}
	}

	return retval;
}
