import { mathFunctionRegistry, systemFunction } from '../dispatch';

import { arg, conjugate, csgn, imagPart, polarForm, realPart, rectForm } from './complex';

export function loadComplexFunctions() {
	Object.assign(mathFunctionRegistry, {
		imagpart: systemFunction({ fn: imagPart, minArgs: 1, maxArgs: 1, distElWise: true }),
		realpart: systemFunction({ fn: realPart, minArgs: 1, maxArgs: 1, distElWise: true }),
		polarform: systemFunction({ fn: polarForm, minArgs: 1, maxArgs: 1, distElWise: true }),
		rectform: systemFunction({ fn: rectForm, minArgs: 1, maxArgs: 1, distElWise: true }),
		arg: systemFunction({ fn: arg, minArgs: 1, maxArgs: 1, distElWise: true }),
		csgn: systemFunction({ fn: csgn, minArgs: 1, maxArgs: 1, distElWise: true }),
		conjugate: systemFunction({ fn: conjugate, minArgs: 1, maxArgs: 1, distElWise: true }),
	});
}
