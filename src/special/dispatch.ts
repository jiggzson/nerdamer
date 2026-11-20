import { LI } from '../core/constants/functionNames';
import { mathFunctionRegistry, systemFunction } from '../core/dispatch';
import {
	Chi as decimalChi,
	Ci as decimalCi,
	Ei as decimalEi,
	erf as decimalErf,
	erfc as decimalErfc,
	gamma as decimalGamma,
	Li as decimalLi,
	Shi as decimalShi,
	Si as decimalSi,
	sinc as decimalSinc,
} from '../core/functions/decimal';

import { erf, erfc } from './error';
import { gamma, gammaIncomplete, gammaIncompleteLower } from './gamma';
import { Chi, Ci, Ei, Li, Shi, Si } from './integrals';
import { sinc } from './sinc';

/**
 * Register both symbolic functions and their existing Decimal implementations.
 * Some real arguments must retain the symbolic function's branch or exact-value
 * behavior; returning undefined leaves those cases with the ordinary parser.
 */
export function loadSpecialFunctions() {
	Object.assign(mathFunctionRegistry, {
		erf: systemFunction({
			fn: erf,
			decimalFn: decimalErf,
			minArgs: 1, maxArgs: 1, distElWise: true,
		}),
		erfc: systemFunction({
			fn: erfc,
			decimalFn: decimalErfc,
			minArgs: 1, maxArgs: 1, distElWise: true,
		}),
		gamma: systemFunction({
			fn: gamma,
			decimalFn: decimalGamma,
			minArgs: 1, maxArgs: 1, distElWise: true,
		}),
		gamma_incomplete: systemFunction({ fn: gammaIncomplete, minArgs: 2, maxArgs: 2, distElWise: true }),
		gamma_incomplete_lower: systemFunction({ fn: gammaIncompleteLower, minArgs: 2, maxArgs: 2, distElWise: true }),
		sinc: systemFunction({ fn: sinc, decimalFn: decimalSinc, minArgs: 1, maxArgs: 1, distElWise: true }),
		Shi: systemFunction({ fn: Shi, decimalFn: decimalShi, minArgs: 1, maxArgs: 1, distElWise: true }),
		Si: systemFunction({ fn: Si, decimalFn: decimalSi, minArgs: 1, maxArgs: 1, distElWise: true }),
		Chi: systemFunction({ fn: Chi, decimalFn: decimalChi, minArgs: 1, maxArgs: 1, distElWise: true }),
		Ci: systemFunction({ fn: Ci, decimalFn: x => x.isNeg() ? undefined : decimalCi(x), minArgs: 1, maxArgs: 1, distElWise: true }),
		Ei: systemFunction({ fn: Ei, decimalFn: decimalEi, minArgs: 1, maxArgs: 1, distElWise: true }),
		[LI]: systemFunction({ fn: Li, decimalFn: x => x.isNeg() ? undefined : decimalLi(x), minArgs: 1, maxArgs: 1, distElWise: true }),
	});
}
