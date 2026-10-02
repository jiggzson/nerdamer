/** Public symbolic algebra and polynomial APIs. */
import { sqcomp } from '../algebra/utils';

import type { CompleteSquareResult } from '../algebra/utils';
import type { ExpressionInput } from '../core/types';

export { factor, pfactor, pfactord, polyFactors } from '../algebra/factor/factor';
export { gcd, lcm } from '../algebra/gcd/gcd';
export { groebner } from '../algebra/groebner';
export { partfrac } from '../algebra/partfrac';
export { simplify } from '../algebra/simplify/simplify';
/**
 * Completes the square for a quadratic expression.
 *
 * For `a*x^2+b*x+c`, the returned expression has the form
 * `a*(x+h)^2+k`, with `h=b/(2*a)` and `k=c-b^2/(4*a)`.
 *
 * @param expr - Quadratic expression to rewrite.
 * @param variable - Variable to use. Defaults to the first variable in the expression.
 * @returns The quadratic coefficient, shift, remainder, selected variable, and rewritten expression.
 *
 * @example
 * ```ts
 * const result = completeSquare('x^2+6*x+1');
 * result.expression.text({ sort: true }); // "(3+x)^2-8"
 * ```
 */
export const completeSquare: (
	expr: ExpressionInput,
	variable?: string
) => CompleteSquareResult = sqcomp;
export type { CompleteSquareResult } from '../algebra/utils';
export { CoeffObject } from '../core/classes/expression/CoeffObject';
export { coeffs, content, deg } from '../core/classes/polynomial/functions';
export { Polynomial } from '../core/classes/polynomial/Polynomial';
export type {
	EvalInputType,
	Ordering,
	PolyType,
	VariableFrequency,
} from '../core/classes/polynomial/Polynomial';
export { Term } from '../core/classes/polynomial/Term';
export type { PowersObject } from '../core/classes/polynomial/Term';
export { uSub, uUnSub } from '../core/functions/subst';

export type {
	SubstitutionMap,
	USubstitutionResult,
} from '../core/functions/subst';
export { isprime as isPrime } from '../math/utils';
