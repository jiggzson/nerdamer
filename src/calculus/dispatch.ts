import { FRESNEL_C, FRESNEL_S } from '../core/classes/parser/constants';
import { mathFunctionRegistry, systemFunction } from '../core/dispatch';
import { defint } from '../math/defint/defint';
import { product, sum } from '../math/math';

import { differentiate, directionalLimit, integrateEquation } from './adapters';
import { C, S } from './fresnel';
import { ilaplace } from './laplace/ilaplace';
import { laplace } from './laplace/laplace';

export function loadCalculusFunctions() {
	Object.assign(mathFunctionRegistry, {
		diff: systemFunction({ fn: differentiate, minArgs: 1, maxArgs: 3, equationArgs: [0], distElWise: true }),
		integrate: systemFunction({ fn: integrateEquation, minArgs: 1, maxArgs: 2, equationArgs: [0], distElWise: true }),
		limit: systemFunction({ fn: directionalLimit, minArgs: 3, maxArgs: 4, distElWise: true }),
		laplace: systemFunction({ fn: laplace, minArgs: 3, maxArgs: 3, distElWise: true }),
		ilaplace: systemFunction({ fn: ilaplace, minArgs: 3, maxArgs: 3, distElWise: true }),
		sum: systemFunction({ fn: sum, minArgs: 4, maxArgs: 4, distElWise: true }),
		product: systemFunction({ fn: product, minArgs: 4, maxArgs: 4, distElWise: true }),
		defint: systemFunction({ fn: defint, minArgs: 4, maxArgs: 4, distElWise: true }),
		[FRESNEL_S]: systemFunction({ fn: S, minArgs: 1, maxArgs: 1, distElWise: true }),
		[FRESNEL_C]: systemFunction({ fn: C, minArgs: 1, maxArgs: 1, distElWise: true }),
	});
}
