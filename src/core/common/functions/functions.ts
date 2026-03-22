import { operators } from '../common';

/**
 * Reads the array of operators and breaks it up into individual symbols
 *
 * @returns An array with operator symbol
 */
export function getOperatorSymbolArray() {
	// make them one long string and then filter out duplicates
	const symbolSet = new Set(Object.keys(operators).join('').split(''));
	//filter out letters used in keyword operators
	const symbolArray = [...symbolSet].filter(x => {
		return !/[a-z]/i.test(x);
	});

	return symbolArray;
}

/**
 * Links operator actions to operator objects
 *
 * @returns The operators object
 */
export function getOperators() {
	// for (const operator in operators) {
	//     // Get the object
	//     let operatorObject: Operator = operators[operator];
	//     // Link the operation function to the operator object or overwrite it
	//     operatorObject.operation = _[operatorObject.action]
	// }

	return operators;
}
