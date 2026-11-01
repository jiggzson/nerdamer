import { loadAlgebraFunctions } from '../algebra/dispatch';
import { loadCalculusFunctions } from '../calculus/dispatch';
import { loadSolveFunctions } from '../solve/dispatch';

import { registerParserFunctions } from './parserFunctions';

let nerdamerFunctionsRegistered = false;

/**
 * Registers the full Nerdamer function interface once.
 *
 * Includes parser functions, then adds algebra, calculus, and solving.
 */
export function registerNerdamerFunctions() {
	if (!nerdamerFunctionsRegistered) {
		registerParserFunctions();
		loadAlgebraFunctions();
		loadCalculusFunctions();
		loadSolveFunctions();
		nerdamerFunctionsRegistered = true;
	}
}
