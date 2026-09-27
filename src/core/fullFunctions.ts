import { loadAlgebraFunctions } from '../algebra/dispatch';
import { loadCalculusFunctions } from '../calculus/dispatch';
import { loadAssumptionFunctions } from './classes/assumption/dispatch';
import { loadMatrixFunctions } from './classes/matrix/dispatch';
import { loadPolynomialFunctions } from './classes/polynomial/dispatch';
import { loadScriptingFunctions } from './classes/parser/scripting/dispatch';
import { loadVectorFunctions } from './classes/vector/dispatch';
import { loadComplexFunctions } from './functions/complex.dispatch';
import { loadMathFunctions } from '../math/dispatch';
import { loadSolveFunctions } from '../solve/dispatch';

/**
 * Registers the complete Nerdamer parser function surface.
 *
 * Core parser modules do not import higher-level mathematical domains. Entry points
 * and consumers that require the complete Nerdamer notation surface call this registration function.
 */
export function registerNerdamerFunctions() {
	loadScriptingFunctions();
	loadAssumptionFunctions();
	loadMatrixFunctions();
	loadVectorFunctions();
	loadComplexFunctions();
	loadPolynomialFunctions();
	loadMathFunctions();
	loadAlgebraFunctions();
	loadCalculusFunctions();
	loadSolveFunctions();
}
