import { mathFunctionRegistry, systemFunction } from '../../dispatch';

import {
	coeffs,
	content,
	deg,
	div as polynomialDiv,
	divide as polynomialDivide,
} from './functions';

export function loadPolynomialFunctions() {
	Object.assign(mathFunctionRegistry, {
		deg: systemFunction({ fn: deg, minArgs: 1, maxArgs: 2, distElWise: true }),
		content: systemFunction({ fn: content, minArgs: 1, maxArgs: 1, distElWise: true }),
		coeffs: systemFunction({ fn: coeffs, minArgs: 1, maxArgs: 2, distElWise: false }),
		div: systemFunction({ fn: polynomialDiv, minArgs: 2, maxArgs: 2, distElWise: false }),
		divide: systemFunction({ fn: polynomialDivide, minArgs: 2, maxArgs: 2, distElWise: false }),
	});
}
