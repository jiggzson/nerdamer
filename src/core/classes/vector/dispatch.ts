import { mathFunctionRegistry, systemFunction } from '../../dispatch';

import { cross, dot } from './functions';

export function loadVectorFunctions() {
	Object.assign(mathFunctionRegistry, {
		dot: systemFunction({ fn: dot, minArgs: 2, maxArgs: 2, distElWise: false }),
		cross: systemFunction({ fn: cross, minArgs: 2, maxArgs: 2, distElWise: false }),
	});
}
