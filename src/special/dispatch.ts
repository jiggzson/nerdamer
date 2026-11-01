import { LI } from '../core/constants/functionNames';
import { mathFunctionRegistry, systemFunction } from '../core/dispatch';

import { erf, erfc } from './error';
import { gamma, gammaIncomplete, gammaIncompleteLower } from './gamma';
import { Chi, Ci, Ei, Li, Shi, Si } from './integrals';
import { sinc } from './sinc';

export function loadSpecialFunctions() {
	Object.assign(mathFunctionRegistry, {
		erf: systemFunction({ fn: erf, minArgs: 1, maxArgs: 1, distElWise: true }),
		erfc: systemFunction({ fn: erfc, minArgs: 1, maxArgs: 1, distElWise: true }),
		gamma: systemFunction({ fn: gamma, minArgs: 1, maxArgs: 1, distElWise: true }),
		gamma_incomplete: systemFunction({ fn: gammaIncomplete, minArgs: 2, maxArgs: 2, distElWise: true }),
		gamma_incomplete_lower: systemFunction({ fn: gammaIncompleteLower, minArgs: 2, maxArgs: 2, distElWise: true }),
		sinc: systemFunction({ fn: sinc, minArgs: 1, maxArgs: 1, distElWise: true }),
		Shi: systemFunction({ fn: Shi, minArgs: 1, maxArgs: 1, distElWise: true }),
		Si: systemFunction({ fn: Si, minArgs: 1, maxArgs: 1, distElWise: true }),
		Chi: systemFunction({ fn: Chi, minArgs: 1, maxArgs: 1, distElWise: true }),
		Ci: systemFunction({ fn: Ci, minArgs: 1, maxArgs: 1, distElWise: true }),
		Ei: systemFunction({ fn: Ei, minArgs: 1, maxArgs: 1, distElWise: true }),
		[LI]: systemFunction({ fn: Li, minArgs: 1, maxArgs: 1, distElWise: true }),
	});
}
