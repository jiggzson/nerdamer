import { mathFunctionRegistry, systemFunction } from '../core/dispatch';

import {
	mean,
	median,
	mode,
	smpstdev,
	smpvar,
	stdev,
	variance,
	zscore,
} from './statistics';

export function loadStatisticsFunctions() {
	Object.assign(mathFunctionRegistry, {
		mean: systemFunction({ fn: mean, minArgs: 1, maxArgs: -1, distElWise: false }),
		median: systemFunction({ fn: median, minArgs: 1, maxArgs: -1, distElWise: false }),
		mode: systemFunction({ fn: mode, minArgs: 1, maxArgs: -1, distElWise: false }),
		smpvar: systemFunction({ fn: smpvar, minArgs: 1, maxArgs: -1, distElWise: false }),
		variance: systemFunction({ fn: variance, minArgs: 1, maxArgs: -1, distElWise: false }),
		smpstdev: systemFunction({ fn: smpstdev, minArgs: 1, maxArgs: -1, distElWise: false }),
		stdev: systemFunction({ fn: stdev, minArgs: 1, maxArgs: -1, distElWise: false }),
		zscore: systemFunction({ fn: zscore, minArgs: 3, maxArgs: 3, distElWise: true }),
	});
}
