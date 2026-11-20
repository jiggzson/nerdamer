import { FRESNEL_C, FRESNEL_S } from '../core/constants/functionNames';
import { mathFunctionRegistry, registerAlias, systemFunction } from '../core/dispatch';
import { defint } from '../math/defint/defint';
import { product, sum } from '../math/series';

import { differentiate, directionalLimit, integrateEquation } from './adapters';
import { C, S } from './fresnel';
import { ilaplace } from './laplace/ilaplace';
import { laplace } from './laplace/laplace';
import { taylor } from './taylor';

export function loadCalculusFunctions() {
	Object.assign(mathFunctionRegistry, {
		diff: systemFunction({
			fn: differentiate,
			minArgs: 1,
			maxArgs: 3,
			equationArgs: [0],
			distElWise: true,
			deferArguments: true,
			bound: { variable: 1, scope: [0] },
		}),
		integrate: systemFunction({
			fn: integrateEquation,
			minArgs: 1,
			maxArgs: 2,
			equationArgs: [0],
			distElWise: true,
			deferArguments: true,
			bound: { variable: 1, scope: [0] },
		}),
		limit: systemFunction({
			fn: directionalLimit,
			minArgs: 3,
			maxArgs: 4,
			distElWise: true,
			deferArguments: true,
			bound: { variable: 1, scope: [0] },
		}),
		laplace: systemFunction({ fn: laplace, minArgs: 3, maxArgs: 3, distElWise: true }),
		ilaplace: systemFunction({ fn: ilaplace, minArgs: 3, maxArgs: 3, distElWise: true }),
		sum: systemFunction({
			fn: sum,
			minArgs: 4,
			maxArgs: 4,
			distElWise: true,
			deferArguments: true,
			bound: { variable: 1, scope: [0] },
		}),
		taylor: systemFunction({
			fn: taylor,
			minArgs: 4,
			maxArgs: 4,
			distElWise: true,
			deferArguments: true,
			bound: { variable: 1, scope: [0] },
		}),
		product: systemFunction({
			fn: product,
			minArgs: 4,
			maxArgs: 4,
			distElWise: true,
			deferArguments: true,
			bound: { variable: 1, scope: [0] },
		}),
		defint: systemFunction({
			fn: defint,
			minArgs: 4,
			maxArgs: 4,
			distElWise: true,
			deferArguments: true,
			bound: { variable: 1, scope: [0] },
		}),
		[FRESNEL_S]: systemFunction({ fn: S, minArgs: 1, maxArgs: 1, distElWise: true }),
		[FRESNEL_C]: systemFunction({ fn: C, minArgs: 1, maxArgs: 1, distElWise: true }),
	});

	// The 1.x name, kept as a permanent alternative.
	registerAlias('ilt', 'ilaplace');
}
