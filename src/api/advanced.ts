export {
	Groebner,
	GroebnerBudgetExceeded,
	eliminate,
	groebnerBasisWithOptions,
	idealMembership,
	reduceByBasis,
	solve as solveRationalSystem,
} from '../algebra/algorithms/groebnerBase';
export type {
	GroebnerBasisOptions,
	GroebnerStats,
	MonomialOrder,
	RationalSolution,
} from '../algebra/algorithms/groebnerBase';
/** Advanced numerical and exact-polynomial APIs. */
export { Complex } from '../core/classes/complex/Complex';
export { SparsePolynomial } from '../core/classes/polynomial/SparsePolynomial';
export type { SparsePolynomialTerm } from '../core/classes/polynomial/SparsePolynomial';
export { FunctionSolver } from '../solve/classes/FunctionSolver';
export type {
	FunctionSolverOptions,
	Root,
	RootFindingMethod,
} from '../solve/classes/FunctionSolver';
