import { loadAssumptionFunctions } from './classes/assumption/dispatch';
import { loadMatrixFunctions } from './classes/matrix/dispatch';
import { loadPolynomialFunctions } from './classes/polynomial/dispatch';
import { loadScriptingFunctions } from './classes/parser/scripting/dispatch';
import { loadVectorFunctions } from './classes/vector/dispatch';
import { loadComplexFunctions } from './functions/complex.dispatch';
import { loadMathFunctions } from '../math/dispatch';

/**
 * Registers the function surface supplied by the parser package.
 *
 * Algebra, calculus, and solving are higher-level CAS domains and are composed by
 * the full package rather than the parser package.
 */
export function loadParserFunctions() {
	loadScriptingFunctions();
	loadAssumptionFunctions();
	loadMatrixFunctions();
	loadVectorFunctions();
	loadPolynomialFunctions();
	loadComplexFunctions();
	loadMathFunctions();
}
