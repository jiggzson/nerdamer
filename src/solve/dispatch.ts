import { Dictionary } from '../core/classes/dictionary/Dictionary';
import { Expression } from '../core/classes/expression/Expression';
import { requireVariableName } from '../core/classes/expression/utils';
import { Vector } from '../core/classes/vector/Vector';
import { dataTypes } from '../core/constants/entityTypes';
import { INTEGER_PARAM } from '../core/constants/symbolNames';
import { mathFunctionRegistry, systemFunction } from '../core/dispatch';
import { message, UnexpectedDataType, UnexpectedInputError, UnsupportedOperationError } from '../core/errors';

import { SolutionSet } from './classes/SolutionSet';
import { roots, solve } from './solve';
import { solveSystem } from './solveSystem';

import type { ParserEntity } from '../core/types';

/**
 * Selects the named coordinate from existing system assignments and returns
 * its distinct real values. No additional system roots are generated.
 */
function selectSystemValues(
	systems: Vector, variable: Expression, lower: Expression, upper: Expression
): SolutionSet {
	const name = requireVariableName(variable, true);
	const coordinates: Expression[] = [];
	for (const entry of systems.elements) {
		if (!Dictionary.isDictionary(entry)) {
			throw new UnexpectedDataType(message('wrongInput', {
				expected: 'Dictionary assignment',
				received: dataTypes[entry.dataType] ?? entry.dataType,
			}));
		}
		const value = entry.get(name);
		if (value === undefined) {
			throw new UnexpectedInputError(message('dictionaryKeyNotFound', {
				key: name,
				keys: entry.keys().join(', '),
			}));
		}
		if (!Expression.isExpression(value)) {
			throw new UnexpectedDataType(message('wrongInput', {
				expected: 'Expression coordinate',
				received: dataTypes[value.dataType] ?? value.dataType,
			}));
		}
		// System filtering never substitutes indexed families or generates new roots.
		if (value.hasVariable(INTEGER_PARAM)) {
			throw new UnsupportedOperationError(message('unsupportedOperation'));
		}
		coordinates.push(value);
	}

	// SolutionSet owns the selected expressions, deduplicates equal values,
	// and applies the same inclusive interval rules as univariate results.
	return new SolutionSet(coordinates).generate({ interval: [lower, upper] });
}

function realsolutions(
	set: ParserEntity,
	variableOrLower: ParserEntity,
	lowerOrUpper: ParserEntity,
	upper?: ParserEntity
): SolutionSet {
	if (upper === undefined) {
		if (!SolutionSet.isSolutionSet(set)) {
			throw new UnexpectedDataType(message('wrongInput', {
				expected: 'SolutionSet',
				received: dataTypes[set.dataType] ?? set.dataType,
			}));
		}
		if (!Expression.isExpression(variableOrLower) ||
			!Expression.isExpression(lowerOrUpper)) {
			const invalid = Expression.isExpression(variableOrLower) ? lowerOrUpper : variableOrLower;
			throw new UnexpectedDataType(message('wrongInput', {
				expected: 'Expression interval endpoint',
				received: dataTypes[invalid.dataType] ?? invalid.dataType,
			}));
		}
		return set.generate({ interval: [variableOrLower, lowerOrUpper] });
	}

	if (!Vector.isVector(set)) {
		throw new UnexpectedDataType(message('wrongInput', {
			expected: 'Vector of Dictionary assignments',
			received: dataTypes[set.dataType] ?? set.dataType,
		}));
	}
	if (!Expression.isExpression(variableOrLower) ||
		!Expression.isExpression(lowerOrUpper) ||
		!Expression.isExpression(upper)) {
		const invalid = [variableOrLower, lowerOrUpper, upper]
			.find(value => !Expression.isExpression(value));
		throw new UnexpectedDataType(message('wrongInput', {
			expected: 'variable and Expression interval endpoints',
			received: dataTypes[invalid!.dataType] ?? invalid!.dataType,
		}));
	}
	return selectSystemValues(set, variableOrLower, lowerOrUpper, upper);
}

export function loadSolveFunctions() {
	Object.assign(mathFunctionRegistry, {
		solve: systemFunction({ fn: solve, minArgs: 2, maxArgs: 2, equationArgs: [0], distElWise: false }),
		roots: systemFunction({ fn: roots, minArgs: 1, maxArgs: 2, distElWise: false }),
		solveeqs: systemFunction({ fn: solveSystem, minArgs: 1, maxArgs: 1, distElWise: false }),
		realsolutions: systemFunction({
			fn: realsolutions,
			minArgs: 3,
			maxArgs: 4,
			distElWise: false,
		}),
	});
}
