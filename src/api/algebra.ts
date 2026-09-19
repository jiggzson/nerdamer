/** Public symbolic algebra and polynomial APIs. */
export { factor, polyFactors } from '../algebra/factor/factor';
export { gcd, lcm } from '../algebra/gcd/gcd';
export { groebner } from '../algebra/groebner';
export { partfrac } from '../algebra/partfrac';
export { simplify } from '../algebra/simplify/simplify';
export { sqcomp as completeSquare } from '../algebra/utils';
export type { CompleteSquareResult } from '../algebra/utils';
export { CoeffObject } from '../core/classes/expression/CoeffObject';
export { content, deg } from '../core/classes/polynomial/functions';
export { Polynomial } from '../core/classes/polynomial/Polynomial';
export type {
	EvalInputType,
	Ordering,
	PolyType,
	VariableFrequency,
} from '../core/classes/polynomial/Polynomial';
export { Term } from '../core/classes/polynomial/Term';
export { isprime as isPrime } from '../math/utils';
export type { PowersObject } from '../core/classes/polynomial/Term';

export { uSub, uUnSub } from '../core/functions/subst';
export type {
	SubstitutionMap,
	USubstitutionResult,
} from '../core/functions/subst';
