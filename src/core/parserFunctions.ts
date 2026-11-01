import { loadSpecialFunctions } from '../special/dispatch';
import { loadStatisticsFunctions } from '../statistics/dispatch';

import { loadAssumptionFunctions } from './classes/assumption/dispatch';
import { loadMatrixFunctions } from './classes/matrix/dispatch';
import { loadScriptingFunctions } from './classes/parser/scripting/dispatch';
import { loadPolynomialFunctions } from './classes/polynomial/dispatch';
import { loadVectorFunctions } from './classes/vector/dispatch';
import { loadComplexFunctions } from './functions/complex.dispatch';

let parserFunctionsRegistered = false;

/**
 * Registers the parser package's optional functions once.
 *
 * Algebra, calculus, and solving are added by the full package. Repeated package
 * imports must not replace function entries that have already been registered.
 */
export function registerParserFunctions() {
	if (!parserFunctionsRegistered) {
		loadScriptingFunctions();
		loadAssumptionFunctions();
		loadMatrixFunctions();
		loadVectorFunctions();
		loadPolynomialFunctions();
		loadComplexFunctions();
		loadSpecialFunctions();
		loadStatisticsFunctions();
		parserFunctionsRegistered = true;
	}
}
