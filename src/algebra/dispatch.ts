import { mathFunctionRegistry, systemFunction } from '../core/dispatch';
import { PFACTOR, PFACTORD } from '../core/classes/parser/constants';
import { completeSquare } from './adapters';
import { polyFactors, factor, pfactor, pfactord } from './factor/factor';
import { gcd, lcm } from './gcd/gcd';
import { groebner } from './groebner';
import { partfrac } from './partfrac';
import { simplify } from './simplify/simplify';

export function loadAlgebraFunctions() {
	Object.assign(mathFunctionRegistry, {
		polyfactors: systemFunction({ fn: polyFactors, minArgs: 1, maxArgs: 1, distElWise: false }),
		factor: systemFunction({ fn: factor, minArgs: 1, maxArgs: 1, distElWise: true }),
		[PFACTOR]: systemFunction({ fn: pfactor, minArgs: 1, maxArgs: 1, distElWise: false }),
		[PFACTORD]: systemFunction({ fn: pfactord, minArgs: 1, maxArgs: 1, distElWise: false }),
		simplify: systemFunction({ fn: simplify, minArgs: 1, maxArgs: 1, distElWise: true }),
		partfrac: systemFunction({ fn: partfrac, minArgs: 1, maxArgs: 2, distElWise: true }),
		gcd: systemFunction({ fn: gcd, minArgs: 2, maxArgs: 2, distElWise: true }),
		lcm: systemFunction({ fn: lcm, minArgs: 2, maxArgs: 2, distElWise: true }),
		groebner: systemFunction({ fn: groebner, minArgs: 1, maxArgs: 2, distElWise: false }),
		sqcomp: systemFunction({ fn: completeSquare, minArgs: 1, maxArgs: 2, distElWise: true }),
	});
}
