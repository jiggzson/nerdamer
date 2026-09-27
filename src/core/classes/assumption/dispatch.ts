import { mathFunctionRegistry, systemFunction } from '../../dispatch';
import { assuming, forget } from './assume';

export function loadAssumptionFunctions() {
	Object.assign(mathFunctionRegistry, {
		assume: systemFunction({ fn: assuming, minArgs: 1, maxArgs: 1, distElWise: false }),
		forget: systemFunction({ fn: forget, minArgs: 1, maxArgs: 1, distElWise: false }),
	});
}
