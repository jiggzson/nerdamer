import { mathFunctionRegistry, systemFunction } from '../core/dispatch';
import { roots, solve } from './solve';
import { solveSystem } from './solveSystem';

export function loadSolveFunctions() {
	Object.assign(mathFunctionRegistry, {
		solve: systemFunction({ fn: solve, minArgs: 2, maxArgs: 2, equationArgs: [0], distElWise: false }),
		roots: systemFunction({ fn: roots, minArgs: 1, maxArgs: 2, distElWise: false }),
		solveeqs: systemFunction({ fn: solveSystem, minArgs: 1, maxArgs: 1, distElWise: false }),
	});
}
